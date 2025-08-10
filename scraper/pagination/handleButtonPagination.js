import { delay } from '../helper.js';

async function handleButtonPagination({
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

            log.info(`productsLinks: ${config.productsLinks}`);
    const currentProductLinks = await page.$$eval(
      productLinkSelector,
      (elements, baseUrl, attribute, skipCollections,productsLinks, collectionLinks) =>
        elements
          .map(el => {
            let href = el.getAttribute(attribute);
                      

            if (!href) return null;
            if (!href.startsWith('http')) href = baseUrl + href;

            const isCollection = href.includes(collectionLinks);
            const isProduct = href.includes(productsLinks);

            if (skipCollections && !isProduct) return null;
            if (isProduct || isCollection) {
        

            return href;
            }
            else {

            return null;
            }
          })
          .filter(Boolean),
      baseUrl,
      productLinkAttribute,
      config.skipCollectionLinksInProducts,
      config.productsLinks,
      config.collectionLinks || 'collections/',
    );

    log.info(`length: ${currentProductLinks.length}`);

    if (currentProductLinks.length === previousLinkCount) {
      if (config.bannerSkip) {
        const bannerSkip = await page.$(config.bannerSkip);
        if (bannerSkip) {
          log.info('banner accept button found, clicking…');
          try {
            await bannerSkip.click();
            await delay(2000);
          } catch (err) {
            log.error(`Error clicking banner button: ${err.message}`);
            break;
          }
        } else {
          log.info('No banner button present. Pagination complete.');
          break;
        }
      } else {
        log.info('No more products loaded. Pagination complete.');
        break;
      }
    }

    previousLinkCount = currentProductLinks.length;

    log.info('about to load more...');
    const seeMoreButton = await page.$(config.pagination.selector);
    if (seeMoreButton) {
      await page.evaluate(selector => {
        const btn = document.querySelector(selector);
        if (btn) btn.scrollIntoView({ behavior: 'instant', block: 'center' });
      }, config.pagination.selector);

      log.info('Clicking "See More" button...');
      try {
        await seeMoreButton.click();
        log.info('clicked "See More" button...');
      } catch (error) {
        log.error(`Error clicking "See More" button: ${error.message}`);
      }

      try {
        await page.waitForFunction(
          (sel, count) => document.querySelectorAll(sel).length > count,
          { timeout: 10000 },
          productLinkSelector,
          previousLinkCount,
        );
      } catch (e) {
        log.warning('Timeout: No new products appeared after clicking.');
      }
    } else {
      hasMoreProducts = false;
      log.info('No "See More" button found. Stopping pagination.');
    }
  }
}

export default handleButtonPagination;
