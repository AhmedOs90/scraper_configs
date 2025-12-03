// scraper/extractPageLinks.js
import handleButtonPagination from '../pagination/handleButtonPagination.js';
import handleScrollPagination  from '../pagination/handleScrollPagination.js';
import handleLinkPagination    from '../pagination/handleLinkPagination.js';
import { delay } from '../helper.js';

/** keep behavior consistent with extractDynamicLinks */
function normalizeConfig(cfg = {}) {
  const norm = { ...cfg };
  if (typeof norm.collectionLinks === 'string' && norm.collectionLinks.trim() === '') norm.collectionLinks = null;
  if (typeof norm.productsLinks === 'string'   && norm.productsLinks.trim()   === '') norm.productsLinks   = null;
  return norm;
}

/** small helpers (mirroring extractDynamicLinks) */
async function rAF(page, times = 2) {
  await page.evaluate((n) =>
    new Promise((res) => {
      let i = 0;
      const tick = () => (i++ >= n ? res() : requestAnimationFrame(tick));
      requestAnimationFrame(tick);
    }), times);
}

async function gentleAutoScroll(page, steps = 6) {
  try {
    await page.evaluate(async (count) => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < count; i++) {
        window.scrollBy(0, Math.round(window.innerHeight * 0.75));
        await sleep(250);
      }
      window.scrollTo(0, 0);
    }, steps);
  } catch {}
}

async function hydrateAndSettle(page, { maxMs = 6000 } = {}) {
  const start = Date.now();
  try { await rAF(page, 2); } catch {}
  try {
    if (typeof page.waitForNetworkIdle === 'function') {
      await page.waitForNetworkIdle({ idleTime: 800, timeout: Math.min(2500, maxMs) });
    }
  } catch {}
  await gentleAutoScroll(page, 6);

  const remaining = Math.max(0, maxMs - (Date.now() - start));
  const settleBudget = Math.min(remaining, 2500);
  try {
    await page.evaluate((budgetMs) => new Promise((res) => {
      const startTs = performance.now();
      let lastMutation = performance.now();
      const obs = new MutationObserver(() => { lastMutation = performance.now(); });
      obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
      const check = () => {
        const now = performance.now();
        if (now - startTs > budgetMs) { obs.disconnect(); res(); return; }
        if (now - lastMutation > 500) { obs.disconnect(); res(); return; }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    }), settleBudget);
  } catch {}
}

/**
 * PAGE-LINKS MODE (now with button/scroll/link pagination):
 * - Honor config.baseUrl/baseUrlS only (same as before)
 * - Run configured pagination first to reveal all items
 * - Wait for UI to render/settle
 * - Collect internal links and queue them
 */
async function extractPageLinks({ page, crawler, config, url, rootUrl, log }) {
  const cfg = normalizeConfig(config);

  // Only act on the main landing page(s) this mode is meant for
  if (url !== cfg.baseUrl && url !== cfg.baseUrlS) return;

  log.info(`"pageLinks" mode: extracting links from base page ${url}`);

  // ---- 1) Pagination (same contract as extractDynamicLinks) ----
  try {
    if (cfg.pagination?.type === 'button') {
      await handleButtonPagination({
        page, log, config: cfg, baseUrl: cfg.baseUrl,
        productLinkSelector: cfg.productLinkSelector || null,
        productLinkAttribute: cfg.productLinkAttribute || 'href',
      });
    } else if (cfg.pagination?.type === 'scroll') {
await handleScrollPagination({
        page,
        log,
        config: cfg,
        baseUrl: cfg.baseUrl,
        productLinkSelector: cfg.productLinkSelector || null,
        productLinkAttribute: cfg.productLinkAttribute || 'href',
      });
        }
    // For link pagination we’ll run it AFTER initial harvesting so we can queue the first page immediately,
    // and then let the handler follow next links and queue subsequent pages.
  } catch (e) {
    log.warning(`[pageLinks] pagination pre-pass failed: ${e.message}`);
  }

  // ---- 2) Let the page render and settle a bit ----
  await hydrateAndSettle(page, { maxMs: cfg.renderWaitMs ?? 6000 });
  await delay(300); // small grace delay

  // ---- 3) Collect links from the current page ----
  const allLinks = await page.$$eval('a[href]', (links) =>
    links
      .map(a => a.getAttribute('href'))
      .filter(Boolean)
      .map(href => { try { return new URL(href, window.location.origin).href; } catch { return null; } })
      .filter(Boolean)
  );

  log.info(`[pageLinks] Extracted ${allLinks.length} links from ${url}`);

  const internalLinks = allLinks.filter(link => link.startsWith(rootUrl));
  log.info(`[pageLinks] Found ${internalLinks.length} internal links on ${url}`);

  // De-dupe + avoid re-adding current URL
  const toQueue = [...new Set(internalLinks)].filter(u => u !== url);

  if (toQueue.length) {
    try {
      await crawler.addRequests(toQueue);
    } catch (e) {
      log.warning(`[pageLinks] addRequests batch failed: ${e.message}. Retrying individually…`);
      for (const u of toQueue) {
        try {
          await crawler.addRequests([{ url: u }]);
        } catch (ee) {
          log.warning(`[pageLinks] Failed to add ${u}: ${ee.message}`);
        }
      }
    }
  } else {
    log.info('[pageLinks] No new internal links to queue from this page.');
  }

  // ---- 4) Link-based pagination (follow "next" and repeat) ----
  try {
    if (cfg.pagination?.type === 'link') {
      await handleLinkPagination({ page, log, config: cfg, crawler });
    }
  } catch (e) {
    log.warning(`[pageLinks] link pagination failed: ${e.message}`);
  }
}

export default extractPageLinks;
