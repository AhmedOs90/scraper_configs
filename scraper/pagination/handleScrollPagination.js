// pagination/handleScrollPagination.js
import { delay } from '../helper.js';

async function handleScrollPagination({
  page,
  log,
  config,
  siteComingBaseUrl,               // not used right now but kept for symmetry
  productLinkSelector,
  productLinkAttribute,  // not used here but kept for API consistency
}) {
  const productsLinksSubstr = config.productsLinks || null;

  if (!productLinkSelector && !productsLinksSubstr) {
    log.info('[scroll-pagination] No product selector or productsLinks substring → skipping scroll pagination');
    return;
  }

  const maxLoops = config.pagination?.maxScrollLoops ?? 40;       // safety guard
  const idleThreshold = config.pagination?.idleThreshold ?? 3;    // how many “no growth” loops before stop
  const scrollDelayMs = config.pagination?.scrollDelayMs ?? 1500; // wait after each scroll

  let previousCount = 0;
  let idleLoops = 0;

  async function countProducts() {
    // Prefer explicit selector
    if (productLinkSelector) {
      return page.$$eval(productLinkSelector, els => els.length);
    }

    // Fallback: substring on href
    if (productsLinksSubstr) {
     
      return page.$$eval(
        `a[href*="${productsLinksSubstr}"]`,
        els => els.length
      );
    }

    return 0;
  }

  for (let loop = 0; loop < maxLoops; loop++) {
    const count = await countProducts();
    log.info(`[scroll-pagination] Found ${count} product links (prev=${previousCount})`);

    if (count === previousCount) {
      idleLoops += 1;
      log.info(`[scroll-pagination] No growth detected (idle ${idleLoops}/${idleThreshold})`);

      // Try to clear cookie / consent banner once, same logic as button pagination
      if (config.bannerSkip) {
        const banner = await page.$(config.bannerSkip);
        if (banner) {
          try {
            log.info(`[scroll-pagination] Banner found (${config.bannerSkip}) → clicking…`);
            await banner.click();
            await page
              .waitForSelector(config.bannerSkip, { hidden: true, timeout: 5000 })
              .catch(() => {});
            await delay(600);

            // After closing banner, reset idle count and continue loop (don’t stop yet)
            idleLoops = 0;
            continue;
          } catch (e) {
            log.warning(`[scroll-pagination] Banner click failed: ${e.message}`);
          }
        } else {
          log.info('[scroll-pagination] Banner selector configured but element not found');
        }
      }

      if (idleLoops >= idleThreshold) {
        log.info('[scroll-pagination] Reached idle threshold with no more products → stopping');
        break;
      }
    } else {
      idleLoops = 0; // we got more products
      previousCount = count;
    }

    // Scroll to bottom to trigger the next batch
    try {
      await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        const scrollHeight =
          (doc && doc.scrollHeight) ||
          (body && body.scrollHeight) ||
          0;

        window.scrollTo({
          top: scrollHeight,
          behavior: 'instant',
        });
      });
      log.info('[scroll-pagination] Scrolled to bottom to trigger more products…');
    } catch (e) {
      log.warning(`[scroll-pagination] Scroll failed: ${e.message} → stopping`);
      break;
    }

    await delay(scrollDelayMs);
  }

  log.info('[scroll-pagination] Pagination complete');
}

export default handleScrollPagination;
