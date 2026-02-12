import { PuppeteerCrawler, purgeDefaultStorages } from 'crawlee';
import {  populateLake, saveProductsToCSV } from '../services/lake_populations.js';
import { refineData } from '../services/refine_data.js';
import { sendScrapingReport, updateScraperStatus } from '../services/report.js';
import { extractProductData, delay, resolveEntryUrls } from './helper.js';
import fs from 'fs';
import path from 'path';
import { findDuplication, filterProducts } from '../filtering_layer/fliteration.js';
import { auth } from 'googleapis/build/src/apis/abusiveexperiencereport/index.js';
import extractAllLinks from './extractors/extractAllLinks.js';

import extractPageLinks from './extractors/extractPageLinks.js';
import extractDynamicLinks from './extractors/extractDynamicLinks.js';
import { buildApiRefine } from '../services/refine_data_api.js';
// Load root URLs
const rootUrls = JSON.parse(fs.readFileSync('./config/roots.json', 'utf-8'));

//new Change
// Global product counter
let productCounter = 0;
const publicProductList = [];
const scrapedDataReport = {
  totalSites: 0,
  totalProducts: 0,
  sites: [],
};

// Create the directory if it doesn't exist
const scrapedPagesDir = path.join(process.cwd(), 'scraped_pages');
if (!fs.existsSync(scrapedPagesDir)) {
  fs.mkdirSync(scrapedPagesDir);
}

// Function to load config based on site name from URL
function loadConfigForSite(rootUrl) {
  let site_name = new URL(rootUrl).hostname.split('.')[0];

  if (site_name == "www") {
    site_name = new URL(rootUrl).hostname.split('.')[1];
  }

  // Extract site name
  const configPath = path.join('./config', `${site_name}_config.json`);
  console.log(configPath);
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } else {
    throw new Error(`Configuration file not found for ${site_name} at ${configPath}`);
  }
}

async function runCrawlerForSite(config, rootUrl, last = false, opts = {}) {
const entryUrls = resolveEntryUrls(config);
const entryUrlSet = new Set(entryUrls);

  const commit = opts?.commit === true; // default false
  const refineFunctionString = opts?.refineFunctionString; // may be undefined (that’s fine)
  const refineFromApi = buildApiRefine(refineFunctionString);

  const startTime = new Date().toISOString();
  let newProductsCount = 0;
  let updatedProductsCount = 0;

const siteComingBaseUrl = rootUrl;
  let seller = config.seller;
  let site_name = config.site_name;

  const siteData = {
    site_name,
    rootUrl,
    productsScraped: 0,
  };
  const initialReportData = {
    url: rootUrl,
    scraper_status: 'running', // Status: Running
    scraped_dates: startTime,
  };
  // await sendScrapingReport(initialReportData);
  // updateScraperStatus(rootUrl, 'running'); // Update scraper status

  // const auth = await authorize(); // Ensure Google Sheets auth is initialized


  const crawler = new PuppeteerCrawler({

    launchContext: {
      launchOptions: {
        // executablePath: '/usr/bin/chromium', // Corrected path
        headless:  false, // Run in headless mode
        args: [
          '--no-sandbox', // Disable sandboxing for lower resource usage
          '--disable-setuid-sandbox',
          '--disable-gpu', // Disable GPU for headless servers
          '--disable-software-rasterizer',
          '--disable-dev-shm-usage', // Prevent /dev/shm from running out of space
          '--no-zygote', // Reduce memory usage
          '--disable-extensions', // Disable extensions
          '--disable-background-networking', // Reduce background requests
          '--disable-default-apps', // Disable default apps
        ],
        // args: [
        //   '--no-sandbox',
        //   '--disable-setuid-sandbox',
        //   '--headless',
        //   '--disable-gpu',
        //   '--disable-software-rasterizer',
        //   '--disable-dev-shm-usage',
        // ],
      },
    },
    requestHandlerTimeoutSecs: 1200, // ⬅️ Increase to 120 seconds (or more if needed)
preNavigationHooks: [
  async ({ page }) => {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image',].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });
  }
],
    maxConcurrency: 1, // Enforces sequential processing

    async requestHandler({ page, request, log }) {
      log.info(`Starting requestHandler for ${request.url}`);
      const url = request.url;
      let Prod = {};
      let isProductPage = false;
      // Initialize product object
      try {
Prod = await extractProductData(page, config, Prod, log, { refineFromApi });
        log.info(`Product extracted: ${JSON.stringify(Prod)}`);

        if (!Prod.currency && config?.currency) {
          Prod.currency = config.currency;
        }
        Prod.level = config.level || "0";

        log.info(url)
if (
  Prod &&
  Prod.name &&
  Prod.name !== "Name not found" && !Prod.name.includes("Products") &&
  Prod.images &&

  Prod.price &&
  !String(Prod.price).toLowerCase().includes("start")
) {
          isProductPage = true;
          Prod.id = ++productCounter;
          Prod.url = url;
          Prod = findDuplication(Prod, publicProductList);
          Prod.site_name = site_name;
          Prod.seller_or_not_seller = seller;
          Prod.seller = seller;
          Prod.site_url = siteComingBaseUrl;
          publicProductList.push(Prod);
          // log.info(`Product extracted: ${JSON.stringify(Prod)}`);

          // if(Prod.name != "Name not found"){
          // appendToSheet(auth,[Prod])
          // }
          if (Prod.name != "Name not found") {
            saveProductsToCSV([Prod], "my_scraped_data.csv")
            // let resp = await populateLake(Prod);
            // if (resp == "updated") {
            //   updatedProductsCount++; // Increment updated product count
            // }
            // else {
            //   newProductsCount++; // Increment new product count
            // }
            // siteData.productsScraped += 1;
          }
        } else {
          log.error('Product extraction failed, product data is null');
        }
      } catch (error) {
        log.error(`Error during product extraction main: ${error.message}`);
      }


const isEntryUrl = entryUrlSet.has(url);

if (!isProductPage || isEntryUrl) {
          if (config.productsLinks === "alllinks") {
            log.info(`"alllinks" mode enabled. Extracting all internal links on ${url}...`);
            await extractAllLinks({ page, crawler, url, rootUrl, log });
          }
          else if (config.productsLinks === "pageLinks"  ) {
            if(isEntryUrl)
            log.info(`"pageLinks" mode enabled on ${url}`);
            // await extractPageLinks({ page, crawler, config,url, rootUrl, log });
            // call site
            await extractPageLinks({ page, crawler, config, url, rootUrl, log, entryUrlSet });

          }
          
          else if (
          await page.$(config.productLinkSelector || `a[href*="${config.productsLinks}"]`) ||
          (config.collectionLinks && await page.$(`a[href*="${config.collectionLinks}"]`))
        ) {
            log.info(`"dynamic" link mode on ${url}`);
            await extractDynamicLinks({ page, crawler, config, url, siteComingBaseUrl, rootUrl, log, entryUrlSet });
          }

        else {
          log.info('Nothing Found. closing everything...');
        }
      }
      await page.close();
    },
  });

  const cleanup = async () => {
    try {
      console.log('Cleaning up before exit...');
      if (crawler.browserPool) {
        await crawler.browserPool.closeAllBrowsers();


        await crawler.browserPool.destroy();
        console.log('Browser pool destroyed.');
      }
      await purgeDefaultStorages();


      crawler.requestQueue.drop()
      crawler.teardown();
    }
    catch (e) {

    }
    // process.exit(0); // Ensure the process exits after cleanup
  };

  // Attach signal handlers for SIGINT and SIGTERM
  // process.on('SIGKILL', cleanup); // Handle Ctrl+C
  process.on('SIGTERM', cleanup); // Handle `forever stop`

  try {
    // const urls = [config.baseUrl, config.baseUrlS].filter(Boolean);
    // await crawler.run(urls);

await crawler.run(entryUrls);

    // Update global report data
    scrapedDataReport.totalSites += 1;
    scrapedDataReport.totalProducts += siteData.productsScraped;
    scrapedDataReport.sites.push(siteData);

    const reportData = {
      url: rootUrl, // Use rootUrl to identify the source site
      scrapped_products_logs: siteData.productsScraped.toString(), // Append number of scraped products
      scraper_status: 'completed',
      last_scrapping_new_products: newProductsCount,
      seller: seller,
    };

    console.log(`Sending scraping report for ${site_name}...`);
    // await sendScrapingReport(reportData);
    // await updateScraperStatus(rootUrl, 'completed'); // Update scraper status

  }
  catch (e) {
    console.log(e);
  }
  finally {
    if (last) {
      await cleanup(); // ✅ only run if this is the last site
    }

  }
}

export async function runAllSites() {
  const total = rootUrls.length;

  for (let i = 0; i < total; i++) {
    const rootUrl = rootUrls[i];
    const isLast = i === total - 1; // ✅ true only on the last iteration

    try {
      console.log(`Starting scraper for ${rootUrl}`);
      const config = loadConfigForSite(rootUrl);
      await runCrawlerForSite(config, rootUrl, isLast); // ✅ pass `isLast` flag
    } catch (error) {
      console.error(`Error scraping ${rootUrl}:`, error.message);
    }
  }

  generateReportFile();

  return {
    report: scrapedDataReport,
  };
}


export async function runSite(domain) {


  for (const rootUrl of rootUrls) {
    try {
      console.log(rootUrl);
      if (domain == rootUrl) {
        const config = loadConfigForSite(rootUrl);
        console.log(`Starting scraper for ${rootUrl}`);
        await runCrawlerForSite(config, rootUrl, true);

      }
    } catch (error) {
      console.error(error.message);
    }

  }
  // classifyAll();


  generateReportFile();
  return {
    report: scrapedDataReport,
  };

}

export async function runSiteWithConfig(config, opts = {}) {
  const { rootUrl, baseUrl } = config || {};
  if (!rootUrl || !baseUrl) {
    throw new Error('runSiteWithConfig: "rootUrl" and "baseUrl" are required in config.');
  }

  try {
    console.log(`Starting scraper (config mode) for ${rootUrl}`);
    await runCrawlerForSite(config, rootUrl, true, opts); // ⬅️ pass opts (contains refineFunctionString later)
  } catch (error) {
    console.error(`Error scraping (config mode) ${rootUrl}:`, error.message);
  }

  generateReportFile();
  return { report: scrapedDataReport };
}




function generateReportFile() {
  const reportFilePath = path.join(process.cwd(), 'scraping_report.txt');
  const reportLines = [
    `Total Sites Scraped: ${scrapedDataReport.totalSites}`,
    `Total Products Scraped: ${scrapedDataReport.totalProducts}`,
    'Details per Site:',
  ];

  scrapedDataReport.sites.forEach(site => {
    reportLines.push(
      `Site Name: ${site.site_name}`,
      `Root URL: ${site.rootUrl}`,
      `Products Scraped: ${site.productsScraped}`,
      '---'
    );
  });

  reportLines.push('Scraped Root URLs:', ...rootUrls);

  fs.writeFileSync(reportFilePath, reportLines.join('\n'), 'utf-8');
  console.log(`Scraping report generated at ${reportFilePath}`);
}


