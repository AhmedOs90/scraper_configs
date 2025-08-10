// scraper/extractAllLinks.js

async function extractAllLinks({ page, crawler, config, url, rootUrl, log }) {
  log.info(`"alllinks" mode enabled. Extracting all internal links on ${url}...`);

  // Extract all internal links
  const allLinks = await page.$$eval('a[href]', links => links.map(link => link.href));
  const internalLinks = allLinks.filter(link => link.includes(rootUrl));

  log.info(`Found ${internalLinks.length} internal links on ${url}`);

  // Add all internal links to the Crawlee queue
  await crawler.addRequests(internalLinks.map(link => ({ url: link })));
}

export default extractAllLinks;
