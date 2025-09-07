// pagination/handleButtonPagination.js
import { delay } from '../helper.js';

async function handleButtonPagination({
  page,
  log,
  config,
  baseUrl,
  productLinkSelector,       // may be null
  productLinkAttribute,      // defaults to 'href'
}) {
  const productsLinksSubstr = config.productsLinks || null;
  const collectionLinksSubstr = config.collectionLinks || null;

  let hasMoreProducts = true;
  let previousCount = 0;

  async function collect() {
    return page.$$eval(
      'a[href]',
      (allAs, { baseUrl, productLinkSelector, productLinkAttribute, productsLinksSubstr, collectionLinksSubstr }) => {
        const toAbs = (href, base) => {
          try { return new URL(href, base).href; } catch { return null; }
        };

        const hasSelector = !!productLinkSelector;
        const hasProductsSubstr = !!productsLinksSubstr;
        const hasCollectionSubstr = !!collectionLinksSubstr;

        const selMatches = hasSelector
          ? Array.from(document.querySelectorAll(productLinkSelector))
              .map(el => el.getAttribute(productLinkAttribute))
              .filter(Boolean)
          : [];

        const hrefMatches = hasProductsSubstr
          ? allAs
              .map(el => el.getAttribute(productLinkAttribute))
              .filter(Boolean)
              .filter(href => href.includes(productsLinksSubstr))
          : [];

        const pool = [...new Set([...selMatches, ...hrefMatches])];
        const chosen = pool.length ? pool : allAs.map(el => el.getAttribute(productLinkAttribute)).filter(Boolean);

        const normalized = chosen
          .map(href => toAbs(href, baseUrl))
          .filter(Boolean)
          .filter(href => !(hasCollectionSubstr && href.includes(collectionLinksSubstr)));

        return [...new Set(normalized)];
      },
      { baseUrl, productLinkSelector, productLinkAttribute, productsLinksSubstr, collectionLinksSubstr }
    );
  }

  while (hasMoreProducts) {
  const links = await collect();
  const count = links.length;
  log.info(`[pagination] Collected ${count} product links (prev=${previousCount})`);

  let bannerSkipped = false;

  if (count === previousCount) {
    if (config.bannerSkip) {
      const banner = await page.$(config.bannerSkip);
      if (banner) {
        try {
          log.info(`[pagination] Banner found (${config.bannerSkip}) → clicking…`);
          await banner.click();
          await page.waitForSelector(config.bannerSkip, { hidden: true, timeout: 5000 }).catch(() => {});
          await delay(600);
          bannerSkipped = true;
          log.info('[pagination] Banner dismissed, will try loading more again');
        } catch (e) {
          log.warning(`[pagination] Banner click failed: ${e.message}`);
          log.info('[pagination] Stopping because no growth and banner could not be clicked'); // ★
          break; // ★ stop per your rule
        }
      } else {
        log.info('[pagination] Banner selector configured but element not found; stopping'); // ★
        break; // ★ stop per your rule
      }
    } else {
      log.info('[pagination] No bannerSkip configured; stopping (no growth)'); // ★
      break; // ★ stop per your rule
    }

    // If we *did* close a banner, we skip “complete” decision and proceed to try the button again.
  }

  previousCount = count;

  const btnSel = config.pagination?.selector;
  if (!btnSel) {
    log.info('[pagination] No pagination button selector configured → stopping');
    break;
  }

  const btn = await page.$(btnSel);
  if (!btn) {
    log.info(`[pagination] No "Load more" button found (${btnSel}) → stopping`);
    break;
  }

  await page.evaluate(selector => {
    const el = document.querySelector(selector);
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  }, btnSel);

  log.info(`[pagination] Clicking "Load more" → ${btnSel}`);
  try {
    await (await page.$(btnSel))?.click(); // re-fetch handle in case DOM changed
  } catch (e) {
    log.error(`[pagination] Click failed: ${e.message} → stopping`);
    break;
  }

  try {
    await page.waitForFunction(
      (sel, prodSubstr, attr, prev) => {
        const all = Array.from(document.querySelectorAll('a[href]'));
        const selEls = sel ? Array.from(document.querySelectorAll(sel)) : [];
        const fromSel = selEls.map(el => el.getAttribute(attr)).filter(Boolean);
        const fromSub = prodSubstr
          ? all.map(el => el.getAttribute(attr)).filter(Boolean).filter(h => h.includes(prodSubstr))
          : [];
        const pool = Array.from(new Set([...fromSel, ...fromSub]));
        const c = pool.length || all.length;
        return c > prev;
      },
      { timeout: 10000 },
      productLinkSelector,
      productsLinksSubstr,
      productLinkAttribute,
      previousCount
    );
    log.info('[pagination] Growth detected after click (will re-check next loop)');
  } catch {
    log.warning('[pagination] Timeout waiting for growth after click (will re-check next loop)');
  }
}

}

export default handleButtonPagination;
