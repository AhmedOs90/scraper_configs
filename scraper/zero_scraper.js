import { PuppeteerCrawler, purgeDefaultStorages } from 'crawlee';
import { appendToSheet, populateLake, classifyAll, saveProductsToCSV } from '../services/lake_populations.js';
import { refineData } from '../services/refine_data.js';
import { sendScrapingReport, updateScraperStatus } from '../services/report.js';
import { extractProductData, delay } from './helper.js';
import fs from 'fs';
import path from 'path';
import { findDuplication, filterProducts } from '../filtering_layer/fliteration.js';
import { auth } from 'googleapis/build/src/apis/abusiveexperiencereport/index.js';
import extractAllLinks from './extractors/extractAllLinks.js';

import extractPageLinks from './extractors/extractPageLinks.js';
import extractDynamicLinks from './extractors/extractDynamicLinks.js';

// Load root URLs
const rootUrls = JSON.parse(fs.readFileSync('./config/roots.json', 'utf-8'));


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

async function runCrawlerForSite(config, rootUrl, last = false) {



  const startTime = new Date().toISOString();
  let newProductsCount = 0;
  let updatedProductsCount = 0;

  const baseUrl = rootUrl;
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
  await sendScrapingReport(initialReportData);
  updateScraperStatus(rootUrl, 'running'); // Update scraper status

  // const auth = await authorize(); // Ensure Google Sheets auth is initialized

  const crawler = new PuppeteerCrawler({

    launchContext: {
      launchOptions: {
        executablePath: '/usr/bin/chromium', // Corrected path
        // headless: false, // Run in headless mode
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

    maxConcurrency: 1, // Enforces sequential processing

    async requestHandler({ page, request, log }) {
      log.info(`Starting requestHandler for ${request.url}`);
      const url = request.url;
      let Prod = {};
      let isProductPage = false;
      // Initialize product object
      try {
        Prod = await extractProductData(page, config, Prod, log);
        log.info(`Product extracted: ${JSON.stringify(Prod)}`);

        if (!Prod.currency && config?.currency) {
          Prod.currency = config.currency;
        }

        log.info(url)
if (
  Prod &&
  Prod.name &&
  Prod.name !== "Name not found" &&
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
          Prod.site_url = baseUrl;
          publicProductList.push(Prod);
          // log.info(`Product extracted: ${JSON.stringify(Prod)}`);

          // if(Prod.name != "Name not found"){
          // appendToSheet(auth,[Prod])
          // }
          if (Prod.name != "Name not found") {
            // saveProductsToCSV([Prod], "my_scraped_data.csv")
            let resp = await populateLake(Prod);
            if (resp == "updated") {
              updatedProductsCount++; // Increment updated product count
            }
            else {
              newProductsCount++; // Increment new product count
            }
            siteData.productsScraped += 1;
          }
        } else {
          log.error('Product extraction failed, product data is null');
        }
      } catch (error) {
        log.error(`Error during product extraction main: ${error.message}`);
      }


      if (!isProductPage || url === config.baseUrl || url === config.baseUrlS) {
          if (config.productsLinks === "alllinks") {
            log.info(`"alllinks" mode enabled. Extracting all internal links on ${url}...`);
            await extractAllLinks({ page, crawler, url, rootUrl, log });
          }
          else if (config.productsLinks === "pageLinks" && (url === config.baseUrl || url === config.baseUrlS)) {
            log.info(`"pageLinks" mode enabled on ${url}`);
            await extractPageLinks({ page, crawler, url, rootUrl, log });
          }
          else if (
          await page.$(config.productLinkSelector || `a[href*="${config.productsLinks}"]`) ||
          (config.collectionLinks && await page.$(`a[href*="${config.collectionLinks}"]`))
        ) {
            log.info(`"dynamic" link mode on ${url}`);
            await extractDynamicLinks({ page, crawler, config, url, baseUrl, rootUrl, log });
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
    const urls = [config.baseUrl, config.baseUrlS].filter(Boolean);
    await crawler.run(urls);

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
    await sendScrapingReport(reportData);
    await updateScraperStatus(rootUrl, 'completed'); // Update scraper status

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


// Start the crawler for all sites
// runAllSites().catch(console.error);

// Helper functions



// if (config.productsLinks === "alllinks") {
//           log.info(`"alllinks" mode enabled. Extracting all internal links on ${url}...`);

//           // Extract all internal links
//           const allLinks = await page.$$eval('a[href]', links => links.map(link => link.href));
//           const internalLinks = allLinks.filter(link => link.includes(rootUrl));

//           log.info(`Found ${internalLinks.length} internal links on ${url}`);

//           // Add all internal links to the Crawlee queue
//           await crawler.addRequests(internalLinks.map(link => ({ url: link })));
//           // log.info('attempting to extract product data...');
//           // try {
//           //   Prod = await extractProductData(page, config, Prod, log);
//           //   log.info(url)

//           //   if (Prod) {
//           //     Prod.id = ++productCounter;
//           //     Prod.url = url;

//           //     Prod = findDuplication(Prod, publicProductList);
//           //     Prod.site_name = site_name;
//           //     Prod.seller_or_not_seller = seller;
//           //     Prod.site_url = baseUrl;
//           //     publicProductList.push(Prod);
//           //     log.info(`Product extracted: ${JSON.stringify(Prod)}`);

//           //     // if(Prod.name != "Name not found"){
//           //     // appendToSheet(auth,[Prod])
//           //     // }
//           //     if(Prod.name != "Name not found"){
//           //     let resp = await populateLake(Prod);
//           //     if(resp =="updated"){
//           //       updatedProductsCount++; // Increment updated product count
//           //     }
//           //     else{
//           //       newProductsCount++; // Increment new product count
//           //     }
//           //     siteData.productsScraped += 1;
//           //   }
//           //   } else {
//           //     log.error('Product extraction failed, product data is null');
//           //   }
//           // } catch (error) {
//           //   log.error(`Error during product extraction: ${error.message}`);
//           // }

//         }
//         if (config.productsLinks === "pageLinks" && (url === config.baseUrl || url === config.baseUrlS)) {
//           log.info(`"pageLinks" mode: extracting all product links from base page ${url}`);
//           // try {
//           //   await page.waitForTimeout(5000); // Give time for additional JS-rendered links to load

//           // } catch (err) {
//           //   log.warning('⚠️ Product count didn’t load in time, fallback to 5s delay.');
//           //   // await page.waitForTimeout(5000);
//           // }

//           await delay(2000); // Give time for additional JS-rendered links to load

//           const allLinks = await page.$$eval('a[href]', links =>
//             links
//               .map(a => a.getAttribute('href'))
//               .filter(href => href)
//               .map(href => new URL(href, window.location.origin).href)
//           );


//           // const allLinks = await page.$$eval('a[href]', links =>
//           //   links.map(a => a.href).filter(Boolean)
//           // );

//           log.info(`Extracted ${allLinks.length} links from ${url}`);

//           const internalLinks = allLinks.filter(link => link.startsWith(rootUrl));
//           internalLinks.forEach((link, i) => log.info(`🔗 Link ${i + 1}: ${link}`));

//           log.info(`Found ${internalLinks.length} internal links on ${url}`);


//           // log.info(`Found ${internalLinks.length} internal links on ${url}`);

//           await crawler.addRequests(internalLinks);
//         }
//         else if (
//           await page.$(config.productLinkSelector || `a[href*="${config.productsLinks}"]`) ||
//           (config.collectionLinks && await page.$(`a[href*="${config.collectionLinks}"]`))
//         ) {
//           log.info('Page contains product links. Extracting product links dynamically...');

//           // SAFETY FALLBACKS
//           const productLinkSelector = config.productLinkSelector || `a[href*="${config.productsLinks}"]`;
//           const productLinkAttribute = config.productLinkAttribute || 'href';

//           if (config.pagination?.type === "button") {
//             let hasMoreProducts = true;
//             let previousLinkCount = 0;

//             // ✅ Accept cookies if banner is visible
//             // const bannerSkip = await page.$('button.coi-banner__accept');

//             while (hasMoreProducts) {

//               const currentProductLinks = await page.$$eval(
//                 productLinkSelector,
//                 (elements, baseUrl, attribute, skipCollections, collectionLinks,) => {
//                   return elements.map(el => {
//                     let href = el.getAttribute(attribute);
//                     if (!href) return null;
//                     if (!href.startsWith('http')) href = baseUrl + href;

//                     const isCollection = href.includes(collectionLinks);
//                     const isProduct = true;
//                     // ✅ If skipping collections, return only product links
//                     if (skipCollections && !isProduct) return null;

//                     // ✅ If not skipping, return product or collection links
//                     return (isProduct || isCollection) ? href : null;
//                   }).filter(Boolean);
//                 },
//                 baseUrl,
//                 productLinkAttribute,
//                 config.skipCollectionLinksInProducts,
//                 config.collectionLinks || "collections/",
//               );

//               log.info(`length: ${currentProductLinks.length}`);

//               if (currentProductLinks.length === previousLinkCount) {
//                 if (config.bannerSkip) {
//                   const bannerSkip = await page.$(config.bannerSkip);

//                   if (bannerSkip) {
//                     log.info('banner accept button found, clicking…');
//                     try {
//                       await bannerSkip.click();
//                       await delay(2000);
//                     } catch (err) {
//                       log.error(`Error clicking banner button: ${err.message}`);
//                       break;                          // abort this collection page
//                     }
//                     // after clicking we stay in the while-loop; the next iteration
//                     // will check whether new links loaded
//                   } else {
//                     log.info('No banner button present. Pagination complete.');
//                     break;                            // nothing else to load
//                   }

//                 }
//                 else {
//                   log.info('No more products loaded. Pagination complete.');
//                   break;

//                 }
//               }

//               previousLinkCount = currentProductLinks.length;

//               // ✅ Force scroll to bottom and wait — in case button loads after scroll
//               // await page.evaluate(() => window.scrollBy(0, window.innerHeight));
//               // await delay(2000);

//               log.info('about to load more...');
//               const seeMoreButton = await page.$(config.pagination.selector);
//               if (seeMoreButton) {

//                 await page.evaluate(selector => {
//                   const btn = document.querySelector(selector);
//                   if (btn) btn.scrollIntoView({ behavior: "instant", block: "center" });
//                 }, config.pagination.selector);

//                 log.info('Clicking "See More" button...');
//                 try {
//                   await seeMoreButton.click();
//                   log.info('clicked "See More" button...');

//                 } catch (error) {
//                   log.error(`Error clicking "See More" button: ${error.message}`);
//                 }

//                 try {
//                   await page.waitForFunction(
//                     (sel, count) => document.querySelectorAll(sel).length > count,
//                     { timeout: 5000 },
//                     productLinkSelector,
//                     previousLinkCount
//                   );
//                 } catch (e) {
//                   log.warning("Timeout: No new products appeared after clicking.");
//                 }
//               } else {
//                 hasMoreProducts = false;
//                 log.info('No "See More" button found. Stopping pagination.');
//               }
//             }
//           }

//           if (config.pagination?.type === "scroll") {
//             let hasMoreProducts = true;
//             let previousLinkCount = 0;

//             // ✅ Accept cookies if banner is visible
//             // const bannerSkip = await page.$('button.coi-banner__accept');

//             while (hasMoreProducts) {

//               const currentProductLinks = await page.$$eval(
//                 productLinkSelector,
//                 (elements, baseUrl, attribute, skipCollections, collectionLinks,) => {
//                   return elements.map(el => {
//                     let href = el.getAttribute(attribute);
//                     if (!href) return null;
//                     if (!href.startsWith('http')) href = baseUrl + href;

//                     const isCollection = href.includes(collectionLinks);
//                     const isProduct = true;
//                     // ✅ If skipping collections, return only product links
//                     if (skipCollections && !isProduct) return null;

//                     // ✅ If not skipping, return product or collection links
//                     return (isProduct || isCollection) ? href : null;
//                   }).filter(Boolean);
//                 },
//                 baseUrl,
//                 productLinkAttribute,
//                 config.skipCollectionLinksInProducts,
//                 config.collectionLinks || "collections/",
//               );

//               log.info(`length: ${currentProductLinks.length}`);

//               if (currentProductLinks.length === previousLinkCount) {
//                 const bannerSkip = await page.$(config.bannerSkip);
//                 if (bannerSkip) {
//                   log.info("banner accept button found, clicking...");
//                   try {
//                     await bannerSkip.click();
//                     await delay(2000);
//                   }
//                   catch (error) {
//                     log.error(`Error clicking banner accept button: ${error.message}`);
//                     break;
//                   }
//                 }
//                 else {
//                   log.info('No more products loaded. Pagination complete.');
//                   break;

//                 }
//               }

//               previousLinkCount = currentProductLinks.length;

//               // ✅ Force scroll to bottom and wait — in case button loads after scroll
//               // await page.evaluate(() => window.scrollBy(0, window.innerHeight));
//               // await delay(2000);

//               const seeMoreButton = await page.$(config.pagination.selector);
//               if (seeMoreButton) {

//                 await page.evaluate(selector => {
//                   const btn = document.querySelector(selector);
//                   if (btn) btn.scrollIntoView({ behavior: "instant", block: "center" });
//                 }, config.pagination.selector);

//                 log.info('Scrolling Now...');

//                 try {
//                   await page.waitForFunction(
//                     (sel, count) => document.querySelectorAll(sel).length > count,
//                     { timeout: 10000 },
//                     productLinkSelector,
//                     previousLinkCount
//                   );
//                 } catch (e) {
//                   log.warning("Timeout: No new products appeared after Scrolling.");
//                 }
//               } else {
//                 hasMoreProducts = false;
//                 log.info('No "See More" button found. Stopping pagination.');
//               }
//             }
//           }
//           // const productLinks = await page.$$eval(productLinkSelector, (elements, baseUrl, attribute) => {
//           //   return elements.map(el => {
//           //     let href = el.getAttribute(attribute);
//           //     if (!href) return null;
//           //     if (!href.startsWith('http')) href = baseUrl + href;
//           //     return href;
//           //   }).filter(Boolean);
//           // }, baseUrl, productLinkAttribute);
//           const productLinks = await page.$$eval(
//             productLinkSelector,
//             (elements, baseUrl, attribute, skipCollections, collectionLinks,) => {
//               return elements.map(el => {
//                 let href = el.getAttribute(attribute);
//                 if (!href) return null;
//                 if (!href.startsWith('http')) href = baseUrl + href;

//                 const isCollection = href.includes(collectionLinks);
//                 const isProduct = true;
//                 // ✅ If skipping collections, return only product links
//                 if (skipCollections && !isProduct) return null;

//                 // ✅ If not skipping, return product or collection links
//                 return (isProduct || isCollection) ? href : null;
//               }).filter(Boolean);
//             },
//             baseUrl,
//             productLinkAttribute,
//             config.skipCollectionLinksInProducts,
//             config.collectionLinks || "collections/",
//           );



//           log.info(`Extracted ${productLinks.length} product links`);

//           await crawler.addRequests(productLinks);

//           if (config.pagination?.type === "link") {
//             log.info('Handling pagination for link-based collection page...');
//             const nextPageLink = await page.$(config.pagination.selector);
//             if (nextPageLink) {
//               const nextPageUrl = await nextPageLink.evaluate(el => el.href);
//               if (nextPageUrl) {
//                 log.info(`Next page URL found: ${nextPageUrl}`);
//                 await crawler.addRequests([nextPageUrl]);
//               }
//             } else {
//               log.info('No next page link found. Pagination complete.');
//             }
//           }
//         }

