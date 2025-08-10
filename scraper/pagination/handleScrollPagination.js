import { delay } from '../helper.js';

async function handleScrollPagination({
  page,
  log,
  config,
  baseUrl,
  productLinkSelector,
  productLinkAttribute,
}) {
  let hasMoreProducts = true;
  let previousLinkCount = 0;

  while (hasMoreProducts) {
    const currentProductLinks = await page.$$eval(
      productLinkSelector,
      (elements, baseUrl, attribute, skipCollections, collectionLinks) =>
        elements
          .map(el => {
            let href = el.getAttribute(attribute);
            if (!href) return null;
            if (!href.startsWith('http')) href = baseUrl + href;

            const isCollection = href.includes(collectionLinks);
            const isProduct = true;
            if (skipCollections && !isProduct) return null;
            return (isProduct || isCollection) ? href : null;
          })
          .filter(Boolean),
      baseUrl,
      productLinkAttribute,
      config.skipCollectionLinksInProducts,
      config.collectionLinks || 'collections/',
    );

    log.info(`length: ${currentProductLinks.length}`);

    if (currentProductLinks.length === previousLinkCount) {
      const bannerSkip = await page.$(config.bannerSkip);
      if (bannerSkip) {
        log.info('banner accept button found, clicking...');
        try {
          await bannerSkip.click();
          await delay(2000);
        } catch (error) {
          log.error(`Error clicking banner accept button: ${error.message}`);
          break;
        }
      } else {
        log.info('No more products loaded. Pagination complete.');
        break;
      }
    }

    previousLinkCount = currentProductLinks.length;

    const seeMoreButton = await page.$(config.pagination.selector);
    if (seeMoreButton) {
      await page.evaluate(selector => {
        const btn = document.querySelector(selector);
        if (btn) btn.scrollIntoView({ behavior: 'instant', block: 'center' });
      }, config.pagination.selector);

      log.info('Scrolling Now...');

      try {
        await page.waitForFunction(
          (sel, count) => document.querySelectorAll(sel).length > count,
          { timeout: 10000 },
          productLinkSelector,
          previousLinkCount,
        );
      } catch (e) {
        log.warning('Timeout: No new products appeared after Scrolling.');
      }
    } else {
      hasMoreProducts = false;
      log.info('No "See More" button found. Stopping pagination.');
    }
  }
}

export default handleScrollPagination;
