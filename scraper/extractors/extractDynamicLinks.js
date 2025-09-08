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

async function extractDynamicLinks({ page, crawler, config, url, baseUrl, rootUrl, log }) {
  const cfg = normalizeConfig(config);

  const productLinkSelector   = cfg.productLinkSelector || null;      // e.g., "a.product-item__title"
  const productsLinksSubstr   = cfg.productsLinks || null;            // e.g., "/product/"
  const collectionLinksSubstr = cfg.collectionLinks || null;          // e.g., "/product-category/"
  const productLinkAttribute  = cfg.productLinkAttribute || 'href';   // can be "href" or any attribute
  const skipCollections       = !!cfg.skipCollectionLinksInProducts;  // true => drop collection links

  // ── Guardrails: don't proceed if we have nothing deterministic to match ─────────
  // We require at least a product selector OR a product substring. No random fallbacks.
  if (!productLinkSelector && !productsLinksSubstr) {
    log.info('[extractDynamicLinks] No product selector or productsLinks substring provided. Skipping.');
    return;
  }

  // Prefer the most specific wait we can.
  try {
    if (productLinkSelector) {
      await page.waitForSelector(productLinkSelector, { timeout: 9000 });
    } else if (productsLinksSubstr) {
      await page.waitForSelector(`a[href*="${productsLinksSubstr}"]`, { timeout: 9000 });
    } else if (!skipCollections && collectionLinksSubstr) {
      await page.waitForSelector(`a[href*="${collectionLinksSubstr}"]`, { timeout: 9000 });
    }
  } catch {}

  // Quick sanity: is there at least an <a href> on the page?
  const hasAnyLink = await page.$('a[href]');
  if (!hasAnyLink && !productLinkSelector) return;

  log.info('Extracting links (products always; collections optional based on flag)…');

  const rawLinks = await page.$$eval(
    'a[href], :scope', // include root scope for non-<a> selector extraction
    (root, { baseUrl, productLinkSelector, productLinkAttribute, productsLinksSubstr, collectionLinksSubstr, skipCollections }) => {
      // root is the first matched element. We need document access.
      const allAs = Array.from(document.querySelectorAll('a[href]'));

      const toAbs = (href, base) => { try { return new URL(href, base).href; } catch { return null; } };
      const sameOrigin = (href, base) => { try { return new URL(href).origin === new URL(base).origin; } catch { return false; } };
      const ignorable = (href) => href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:');

      const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

      // Helper: extract attribute (supports arbitrary attribute names)
      const getAttr = (el, attr) => {
        // Prefer explicit attribute. If attr is "href" and property exists, use el.href as a fallback.
        let v = el.getAttribute?.(attr) ?? null;
        if (!v && attr === 'href' && 'href' in el) v = el.href || null;
        return v || null;
      };

      // 1) Product links via selector (attribute can be arbitrary)
      const productFromSelector = productLinkSelector
        ? Array.from(document.querySelectorAll(productLinkSelector))
            .map(el => getAttr(el, productLinkAttribute))
        : [];

      // 2) Product links via substring in anchors (always enforced)
      const productFromHref = productsLinksSubstr
        ? allAs.map(el => el.getAttribute('href')).filter(Boolean).filter(h => h.includes(productsLinksSubstr))
        : [];

      // 3) Collections via substring in anchors (ONLY when skipCollections === false)
      const collections = (!skipCollections && collectionLinksSubstr)
        ? allAs.map(el => el.getAttribute('href')).filter(Boolean).filter(h => h.includes(collectionLinksSubstr))
        : [];

      // Normalize and filter each bucket
      const normalizeFilter = (hrefs) =>
        uniq(hrefs)
          .map(href => toAbs(href, baseUrl))
          .filter(Boolean)
          .filter(href => sameOrigin(href, baseUrl))
          .filter(href => !ignorable(href));

      let normalizedProducts = normalizeFilter([...productFromSelector, ...productFromHref]);

      // Enforce productsLinksSubstr on products ALWAYS (even when coming from selector)
      if (productsLinksSubstr) {
        normalizedProducts = normalizedProducts.filter(href => href.includes(productsLinksSubstr));
      }

      let normalizedCollections = normalizeFilter(collections);

      // Final union per requirements:
      // - Always include product links.
      // - Include collection links only if skipping is false.
      return uniq([...normalizedProducts, ...normalizedCollections]);
    },
    { baseUrl, productLinkSelector, productLinkAttribute, productsLinksSubstr, collectionLinksSubstr, skipCollections }
  );

  if (rawLinks.length === 0) {
    // Debug sample of anchors (helps confirm URL shapes without "random collection")
    const sample = await page.$$eval('a[href]', as => as.slice(0, 10).map(a => a.getAttribute('href')));
    log.info('[extractDynamicLinks] No product/collection matches. Anchor sample:', sample);
  }

  // Prep queue: dedupe, drop current page, http(s) only
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

  // Pagination
  if (cfg.pagination?.type === 'button') {
    await handleButtonPagination({
      page,
      log,
      config: cfg,
      baseUrl,
      productLinkSelector,
      productLinkAttribute,
    });
  } else if (cfg.pagination?.type === 'scroll') {
    await handleScrollPagination(page, cfg, baseUrl, productLinkSelector, productLinkAttribute, log);
  }

  if (cfg.pagination?.type === 'link') {
    await handleLinkPagination({ page, log, config: cfg, crawler });
  }
}

export default extractDynamicLinks;
