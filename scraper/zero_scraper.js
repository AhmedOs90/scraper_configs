import { PuppeteerCrawler, purgeDefaultStorages } from 'crawlee';
import { appendToSheet, populateLake, classifyAll } from '../services/lake_populations.js';
import { refineData } from '../services/refine_data.js';
import { sendScrapingReport, updateScraperStatus } from '../services/report.js';
import { extractProductData, delay } from './helper.js';
import fs from 'fs';
import path from 'path';
import {findDuplication, filterProducts } from '../filtering_layer/fliteration.js';
import { auth } from 'googleapis/build/src/apis/abusiveexperiencereport/index.js';

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
  
  if(site_name == "www"){
    site_name =  new URL(rootUrl).hostname.split('.')[1];
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

async function runCrawlerForSite( config, rootUrl,  last = false)  {



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
        headless: true,
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
    maxConcurrency: 1, // Enforces sequential processing
  
    async requestHandler({ page, request, log }) {
      log.info(`Starting requestHandler for ${request.url}`);
      const url = request.url;
      let Prod = {}; // Initialize product object
     
      if (config.productsLinks === "alllinks") {
        log.info(`"alllinks" mode enabled. Extracting all internal links on ${url}...`);

        // Extract all internal links
        const allLinks = await page.$$eval('a[href]', links => links.map(link => link.href));
        const internalLinks = allLinks.filter(link => link.includes(rootUrl));

        log.info(`Found ${internalLinks.length} internal links on ${url}`);

        // Add all internal links to the Crawlee queue
        await crawler.addRequests(internalLinks.map(link => ({ url: link })));
        log.info('attempting to extract product data...');
        try {
          Prod = await extractProductData(page, config, Prod, log);
          log.info(url)

          if (Prod) {
            Prod.id = ++productCounter;
            Prod.url = url;

            Prod = findDuplication(Prod, publicProductList);
            Prod.site_name = site_name;
            Prod.seller_or_not_seller = seller;
            Prod.site_url = baseUrl;
            publicProductList.push(Prod);
            log.info(`Product extracted: ${JSON.stringify(Prod)}`);

            // if(Prod.name != "Name not found"){
            // appendToSheet(auth,[Prod])
            // }
            if(Prod.name != "Name not found"){
            let resp = await populateLake(Prod);
            if(resp =="updated"){
              updatedProductsCount++; // Increment updated product count
            }
            else{
              newProductsCount++; // Increment new product count
            }
            siteData.productsScraped += 1;
          }
          } else {
            log.error('Product extraction failed, product data is null');
          }
        } catch (error) {
          log.error(`Error during product extraction: ${error.message}`);
        }

    } 
    else if (url.includes(config.productsLinks)) {
      log.info('Product page detected. Extracting product data...');
      try {
        Prod = await extractProductData(page, config, Prod, log);
        

        if (Prod) {
          Prod.id = ++productCounter;
          Prod.url = url;

          Prod = findDuplication(Prod, publicProductList);
          Prod.site_name = site_name;
          Prod.seller_or_not_seller = seller;
          Prod.site_url = baseUrl;
          publicProductList.push(Prod);
          log.info(`Product extracted: ${JSON.stringify(Prod)}`);

          // appendToSheet(auth,[Prod])
          let resp = await populateLake(Prod);
          if(resp =="updated"){
            updatedProductsCount++; // Increment updated product count
          }
          else{
            newProductsCount++; // Increment new product count
          }
          siteData.productsScraped += 1;
        } else {
          log.error('Product extraction failed, product data is null');
        }
      } catch (error) {
        log.error(`Error during product extraction: ${error.message}`);
      }
    
  }
    else if (url.includes(config.collectionLinks)) {
        log.info('Collection page detected. Extracting product links...');
        
        if (config.pagination.type === "button") {
          let hasMoreProducts = true;
          let previousLinkCount = 0;

          while (hasMoreProducts) {
            const currentProductLinks = await page.$$eval('a[href*="products/"]', links => links.map(link => link.href));
            if (currentProductLinks.length === previousLinkCount) {
              hasMoreProducts = false;
              log.info('No more products loaded. Pagination complete.');
            } else {
              previousLinkCount = currentProductLinks.length;
              const seeMoreButton = await page.$(config.pagination.selector);
              if (seeMoreButton) {
                log.info('Clicking "See More" button...');
                await seeMoreButton.click();
                await delay(2000);
              } else {
                hasMoreProducts = false;
              }
            }
          }
        }

        const selector = config.skipCollectionLinksInProducts
          ? `a[href*="${config.productsLinks}"]`
          : `a[href*="${config.productsLinks}"], a[href*="${config.collectionLinks}"]`;

        const productLinks = await page.$$eval(selector, (links, baseUrl) => {
          return links.map(link => {
            let href = link.getAttribute('href');
            if (!href.startsWith('http')) href = baseUrl + href;
            return href;
          });
        }, baseUrl);

        

        log.info(`Extracted ${productLinks.length} product links`);
        await crawler.addRequests(productLinks);

        if (config.pagination.type === "link") {
                    log.info('Handling pagination for collection page...');
                    const nextPageLink = await page.$(config.pagination.selector);
                    if (nextPageLink) {
                      log.info('Next page link found, evaluating URL...');
                      const nextPageUrl = await nextPageLink.evaluate(el => el.href);
                      if (nextPageUrl) {
                        log.info(`Next page URL: ${nextPageUrl}. Adding to the queue.`);
                        await crawler.addRequests([nextPageUrl]);
                      }
                    } else {
                      log.info('No next page link found. Pagination complete.');
                    }
                  }
      } 
      
    else {
      log.info('Nothing Found. closing everything...');

    }
    },
  });
  
  const cleanup = async () => {
    console.log('Cleaning up before exit...');
    if (crawler.browserPool) {
      await crawler.browserPool.closeAllBrowsers();


      await crawler.browserPool.destroy();
      console.log('Browser pool destroyed.');
    }
    await purgeDefaultStorages();

    
    crawler.requestQueue.drop()
    crawler.teardown();
    // process.exit(0); // Ensure the process exits after cleanup
  };

  // Attach signal handlers for SIGINT and SIGTERM
  // process.on('SIGKILL', cleanup); // Handle Ctrl+C
  process.on('SIGTERM', cleanup); // Handle `forever stop`

  try{
    await crawler.run([config.baseUrl]);

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
  catch(e){
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
      if(domain == rootUrl){
        const config = loadConfigForSite(rootUrl);
        console.log(`Starting scraper for ${rootUrl}`);
        await runCrawlerForSite( config, rootUrl, true);

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
