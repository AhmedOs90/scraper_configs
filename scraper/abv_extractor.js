import { PuppeteerCrawler, purgeDefaultStorages } from 'crawlee';
import fs from 'fs';
import path from 'path';
import { populateLake, getClassifiedNeedsInvestigation } from '../services/lake_populations.js';

function loadSiteConfig(url) {
  const hostname = new URL(url).hostname.replace(/^www\./, '').split('.')[0];
  const configPath = path.join('./config', `${hostname}_config.json`);
  
  if (!fs.existsSync(configPath)) {
    console.warn(`⚠️ Config not found for ${hostname} (${configPath})`);
    throw new Error(`Config not found for ${hostname}`);
  }

  console.log(`✅ Found config for ${hostname} at ${configPath}`);
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

function detectZeroAlcohol(text = '') {
  const terms = ['alcohol free', 'alcohol-free', 'non alcoholic', 'non-alcoholic', 'zero alcohol', 'zero-alcohol', '0.0%', 'Alcohol Removed'];
  const lower = text.toLowerCase();
  return terms.some(term => lower.includes(term));
}

export async function extractMissingABV() {
  const products = await getClassifiedNeedsInvestigation();

  const toProcess = products.filter(p =>
    (!p.abv || p.abv.trim() === '') &&
    p.url && p.name && p.description
  );

  console.log(`🔎 Processing ${toProcess.length} products missing ABV...`);

  const crawler = new PuppeteerCrawler({

    launchContext: {
      launchOptions: {
            executablePath: '/usr/bin/chromium', // Corrected path

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

    async requestHandler({ request, page }) {
      const product = request.userData.product;
      let extracted = { abv: null, method: 'not found' };

      try {
        const config = loadSiteConfig(product.url);
        const abvSelectorMain = config?.selectors?.main?.abv;
        const abvSelectorHeader = config?.selectors?.header?.abv;

        if (abvSelectorHeader) {
          const abv = await page.$eval(abvSelectorHeader, el => el.content?.trim()).catch(() => null);
          if (abv) {
            extracted = { abv, method: 'header:content' };
          }
        }

        if (!extracted.abv && abvSelectorMain) {
          const abv = await page.$eval(abvSelectorMain, el => el.textContent?.trim()).catch(() => null);
          if (abv) {
            extracted = { abv, method: 'main:textContent' };
          }
        }

        if (!extracted.abv) {
          const combined = `${product.name} ${product.description}`;
          if (detectZeroAlcohol(combined)) {
            extracted = { abv: '0.0%', method: 'name/desc keyword' };
          }
        }

        if (extracted.abv && extracted.abv !== product.abv) {
          product.abv = extracted.abv;
          await populateLake(product);
          console.log(`✅ Updated ABV for ${product.name}: ${extracted.abv} (${extracted.method})`);
        } else {
          console.log(`⏭️ No ABV found for ${product.name}`);
        }
      } catch (err) {
        console.error(`❌ Failed for ${product.name}: ${err.message}`);
      }
    }
  });

  await crawler.run(
    toProcess.map(p => ({
      url: p.url,
      userData: { product: p }
    }))
  );

  // Cleanup after crawler completes
  const cleanup = async () => {
    console.log('🧹 Cleaning up browser resources...');
    if (crawler.browserPool) {
      await crawler.browserPool.closeAllBrowsers();
      await crawler.browserPool.destroy();
      console.log('✅ Browser pool destroyed.');
    }
    await purgeDefaultStorages();
  };

  await cleanup();
}
