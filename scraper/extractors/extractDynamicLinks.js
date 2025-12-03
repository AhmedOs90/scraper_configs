// scraper/extractDynamicLinks.js
import handleButtonPagination from '../pagination/handleButtonPagination.js';
import handleScrollPagination from '../pagination/handleScrollPagination.js';
import handleLinkPagination from '../pagination/handleLinkPagination.js';

function normalizeConfig(cfg = {}) {
  const norm = { ...cfg };
  if (typeof norm.collectionLinks === 'string' && norm.collectionLinks.trim() === '') norm.collectionLinks = null;
  if (typeof norm.productsLinks === 'string' && norm.productsLinks.trim() === '') norm.productsLinks = null;
  return norm;
}

// NEW: small helpers
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
      const delay = (ms) => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < count; i++) {
        window.scrollBy(0, Math.round(window.innerHeight * 0.75));
        await delay(250);
      }
      window.scrollTo(0, 0); // restore
    }, steps);
  } catch {}
}

// NEW: wait for “rendered & stable-ish”
async function hydrateAndSettle(page, { maxMs = 6000 } = {}) {
  const start = Date.now();
  try { await rAF(page, 2); } catch {}
  try {
    if (typeof page.waitForNetworkIdle === 'function') {
      await page.waitForNetworkIdle({ idleTime: 800, timeout: Math.min(2500, maxMs) });
    }
  } catch {}
  await gentleAutoScroll(page, 6);

  // Wait for DOM to stay stable for ~500ms or until time budget used
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

// NEW: poll for enough product links to appear
async function waitForProductLinks(page, {
  productLinkSelector,
  productsLinksSubstr,
  minCount = 8,
  maxAttempts = 6,
  intervalMs = 600,
}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const count = await page.evaluate(({ sel, substr }) => {
      const uniq = (arr) => Array.from(new Set(arr));
      let links = [];
      if (sel) {
        links = uniq(Array.from(document.querySelectorAll(sel))
          .map(el => el.getAttribute('href') || el.href || ''));
      } else if (substr) {
        links = uniq(Array.from(document.querySelectorAll('a[href]'))
          .map(a => a.getAttribute('href') || '')
          .filter(h => h.includes(substr)));
      } else {
        links = uniq(Array.from(document.querySelectorAll('a[href]'))
          .map(a => a.getAttribute('href') || ''));
      }
      return links.filter(Boolean).length;
    }, { sel: productLinkSelector, substr: productsLinksSubstr });

    if (count >= minCount) return true;
    await page.waitForTimeout(intervalMs);
  }
  return false;
}
async function extractDynamicLinks({ page, crawler, config, url, baseUrl, rootUrl, log }) {

  const cfg = normalizeConfig(config);

  const productLinkSelector   = cfg.productLinkSelector || null;
  const productsLinksSubstr   = cfg.productsLinks || null;
  const collectionLinksSubstr = cfg.collectionLinks || null;
  const productLinkAttribute  = cfg.productLinkAttribute || 'href';
  const skipCollections       = !!cfg.skipCollectionLinksInProducts;

  if (!productLinkSelector && !productsLinksSubstr) {
    log.info('[extractDynamicLinks] No product selector or productsLinks substring provided. Skipping.');
    return;
  }

  // Pagination pass (button/scroll) BEFORE link-grab
  if (cfg.pagination?.type === 'button') {
    await handleButtonPagination({
      page, log, config: cfg, baseUrl,
      productLinkSelector, productLinkAttribute,
    });
  } else if (cfg.pagination?.type === 'scroll') {
  await handleScrollPagination({
    page,
    log,
    config: cfg,
    baseUrl,
    productLinkSelector,
    productLinkAttribute,
  });
}


  // NEW: let the page render & settle on slower VM
  await hydrateAndSettle(page, { maxMs: cfg.renderWaitMs ?? 6000 });

  // Prefer the most specific wait we can.
  try {
    if (productLinkSelector) {
      await page.waitForSelector(productLinkSelector, { timeout: cfg.selectorWaitMs ?? 15000 });
    } else if (productsLinksSubstr) {
      await page.waitForSelector(`a[href*="${productsLinksSubstr}"]`, { timeout: cfg.selectorWaitMs ?? 15000 });
    } else if (!skipCollections && collectionLinksSubstr) {
      await page.waitForSelector(`a[href*="${collectionLinksSubstr}"]`, { timeout: cfg.selectorWaitMs ?? 15000 });
    }
  } catch {}

  // NEW: if selector/substr present, poll until we have “enough” links
  try {
    const enough = await waitForProductLinks(page, {
      productLinkSelector,
      productsLinksSubstr,
      minCount: cfg.minProductLinks ?? 8,
      maxAttempts: cfg.linkPollAttempts ?? 6,
      intervalMs: cfg.linkPollIntervalMs ?? 600,
    });
    if (!enough) log.info('[extractDynamicLinks] Proceeding with fewer links than min threshold (timeout).');
  } catch {}

  // Quick sanity: is there at least an <a href> on the page?
  const hasAnyLink = await page.$('a[href]');
  if (!hasAnyLink && !productLinkSelector) return;

  let bannerSkipped = false;
  log.info('Extracting links (products always; collections optional based on flag)…');
  if (config.bannerSkip) {
    const banner = await page.$(config.bannerSkip);
    if (banner) {
      try {
        log.info(`[pagination] Banner found (${config.bannerSkip}) → clicking…`);
        await banner.click();
        await page.waitForSelector(config.bannerSkip, { hidden: true, timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(600);
        bannerSkipped = true;
        log.info('[pagination] Banner dismissed, will try loading more again');
      } catch (e) {
        log.warning(`[pagination] Banner click failed: ${e.message}`);
        log.info('[pagination] Stopping because no growth and banner could not be clicked');
      }
    } else {
      log.info('[pagination] Banner selector configured but element not found; stopping');
    }
  } else {
    log.info('[pagination] No bannerSkip configured; stopping (no growth)');
  }

  const rawLinks = await page.$$eval(
    'a[href], :scope',
    (root, { baseUrl, productLinkSelector, productLinkAttribute, productsLinksSubstr, collectionLinksSubstr, skipCollections }) => {
      const allAs = Array.from(document.querySelectorAll('a[href]'));
      const toAbs = (href, base) => { try { return new URL(href, base).href; } catch { return null; } };
      const sameOrigin = (href, base) => { try { return new URL(href).origin === new URL(base).origin; } catch { return false; } };
      const ignorable = (href) => href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:');
      const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
      const getAttr = (el, attr) => {
        let v = el.getAttribute?.(attr) ?? null;
        if (!v && attr === 'href' && 'href' in el) v = el.href || null;
        return v || null;
      };


      const productFromSelector = productLinkSelector
        ? Array.from(document.querySelectorAll(productLinkSelector))
            .map(el => getAttr(el, productLinkAttribute))
        : [];

      const productFromHref = productsLinksSubstr
        ? allAs.map(el => el.getAttribute('href')).filter(Boolean).filter(h => h.includes(productsLinksSubstr))
        : [];

      const collections = (!skipCollections && collectionLinksSubstr)
        ? allAs.map(el => el.getAttribute('href')).filter(Boolean).filter(h => h.includes(collectionLinksSubstr))
        : [];

      const normalizeFilter = (hrefs) =>
        uniq(hrefs)
          .map(href => toAbs(href, baseUrl))
          .filter(Boolean)
          // .filter(href => sameOrigin(href, rootUrl))
          .filter(href => !ignorable(href));

      let normalizedProducts = normalizeFilter([...productFromSelector, ...productFromHref]);
      // let normalizedProducts = ([...productFromSelector, ...productFromHref]);
      if (productsLinksSubstr) {
        normalizedProducts = normalizedProducts.filter(href => href.includes(productsLinksSubstr));
      }
      let normalizedCollections = normalizeFilter(collections);

      return uniq([...normalizedProducts, ...normalizedCollections]);
    },
    { baseUrl, productLinkSelector, productLinkAttribute, productsLinksSubstr, collectionLinksSubstr, skipCollections }
  );


  if (rawLinks.length === 0) {
    const sample = await page.$$eval('a[href]', as => as.map(a => a.getAttribute('href')));
    log.info('[extractDynamicLinks] No product/collection matches. Anchor sample:', sample);
  }

  const toQueue = [...new Set(rawLinks)]
    .filter(u => /^https?:\/\//i.test(u))
    .filter(u => u !== url);
  log.info(`Extracted ${rawLinks.length} links; queueing ${toQueue.length}`);

  if (toQueue.length) {
    try {
      await crawler.addRequests(toQueue);
    } catch (e) {
      log.warning(`addRequests (batch) failed: ${e.message}. Retrying item-by-item.`);
      for (const u of toQueue) {
        try {
          await crawler.addRequests([{ url: u }]);
        } catch (ee) {
          log.warning(`Failed to add ${u}: ${ee.message}`);
        }
      }
    }
  }

  if (cfg.pagination?.type === 'link') {
    await handleLinkPagination({ page, log, config: cfg, crawler });
  }
}

export default extractDynamicLinks;
