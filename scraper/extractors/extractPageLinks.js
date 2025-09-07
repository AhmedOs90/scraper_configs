// scraper/extractPageLinks.js

import { delay } from '../helper.js'; // Adjust path if your delay util is elsewhere

async function extractPageLinks({ page, crawler, config, url, rootUrl, log }) {
  if (url !== config.baseUrl && url !== config.baseUrlS) return;

  log.info(`"pageLinks" mode: extracting all product links from base page ${url}`);

  await delay(2000); // Give time for additional JS-rendered links to load

  const allLinks = await page.$$eval('a[href]', links =>
    links
      .map(a => a.getAttribute('href'))
      .filter(href => href)
      .map(href => new URL(href, window.location.origin).href)
  );

  log.info(`Extracted ${allLinks.length} links from ${url}`);

  const internalLinks = allLinks.filter(link => link.startsWith(rootUrl));
  // internalLinks.forEach((link, i) => log.info(`🔗 Link ${i + 1}: ${link}`));

  log.info(`Found ${internalLinks.length} internal links on ${url}`);

  await crawler.addRequests(internalLinks);
}

export default extractPageLinks;
