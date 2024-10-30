import { PuppeteerCrawler } from 'crawlee';
import { authorize, appendToSheet } from '../services/lake_populations.js';
import fs from 'fs';

// Load configuration
const config = JSON.parse(fs.readFileSync('./config/drydrinker_config.json', 'utf-8'));

// Global product counter
let productCounter = 0;

async function runCrawler(auth) {
  const crawler = new PuppeteerCrawler({
    async requestHandler({ page, request, log }) {
      log.info(`Scraping ${request.url}`);

      // Extract products using config selectors
      const products = await page.$$eval(
        config.productSelector,
        (items, config, startIndex) => {
          return items.map((item, index) => {
            const priceText = item.querySelector('.price-list sale-price')?.textContent.trim();
            const abvText = item.querySelector(config.fields.abv)?.textContent.trim();

            const actualPrice = priceText ? priceText.replace(/[^0-9.]/g, "") : null;
            const actualAbv = abvText ? abvText.replace(/[^0-9.]/g, "") : null;

            const product = {
              id: startIndex + index + 1, // Generate unique ID across pages
              name: item.querySelector(config.fields.name)?.textContent.trim() || "Name not found",
              abv: actualAbv,
              price: actualPrice,
            };
            return product;
          });
        },
        config,
        productCounter // Pass the current value of productCounter to $$eval
      );

      // Update the product counter
      productCounter += products.length;

      if (products.length > 0) {
        await appendToSheet(auth, products);
      }
      log.info(`productCounter ${productCounter}`);

      // Handle pagination if applicable
      if (config.pagination.type === "link") {
        const nextPageLink = await page.$(config.pagination.selector);
        if (nextPageLink) {
          const nextPageUrl = await nextPageLink.evaluate(el => el.href);
          if (nextPageUrl) {
            await crawler.addRequests([nextPageUrl]);
          }
        }
      }
    },
  });

  await crawler.run([config.baseUrl]);
}

// Run the scraper after authorization
authorize().then(runCrawler).catch(console.error);
