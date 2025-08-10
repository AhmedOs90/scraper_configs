// scraper/extractDynamicLinks.js
import handleButtonPagination from '../pagination/handleButtonPagination.js';
import handleScrollPagination from '../pagination/handleScrollPagination.js';
import handleLinkPagination from '../pagination/handleLinkPagination.js';

async function extractDynamicLinks({ page, crawler, config, url, baseUrl, rootUrl, log }) {
  const hasProducts = await page.$(config.productLinkSelector || `a[href*="${config.productsLinks}"]`);
  const hasCollections = config.collectionLinks && await page.$(`a[href*="${config.collectionLinks}"]`);

  if (!(hasProducts || hasCollections)) return;

  log.info('Page contains product links. Extracting product links dynamically...');

  const productLinkSelector = config.productLinkSelector || `a[href*="${config.productsLinks}"]`;
  const productLinkAttribute = config.productLinkAttribute || 'href';

  // ⬇️ Handle dynamic pagination by type
  if (config.pagination?.type === "button") {
await handleButtonPagination({
  page,
  config,
  baseUrl,
  productLinkSelector,
  productLinkAttribute,
  log,
});
  }

  if (config.pagination?.type === "scroll") {
    await handleScrollPagination(page, config, baseUrl, productLinkSelector, productLinkAttribute, log);
  }

  const productLinks = await await page.$$eval(
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

  log.info(`Extracted ${productLinks.length} product links`);

  await crawler.addRequests(productLinks);

  // ⬇️ Handle "link" pagination if specified
  if (config.pagination?.type === "link") {
    await handleLinkPagination({page, log, config, crawler });
  }
}

export default extractDynamicLinks;
