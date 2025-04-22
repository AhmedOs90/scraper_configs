import { refineData } from '../services/refine_data.js';


export async function extractProductData(page, config, Prod, log) {
    log.info('Product page detected. Extracting product data...');
          // outPage(page, productCounter);
          try {
            // 1. Extract meta information (header fields)
            Prod.name = await page.$eval(config.selectors.header.name, el => el.content).catch(() => null);
            Prod.price = await page.$eval(config.selectors.header.price, el => el.content).catch(() => null);
            Prod.currency = await page.$eval(config.selectors.header.currency, el => el.content).catch(() => null);
            Prod.country = await page.$eval(config.selectors.header.country, el => el.content).catch(() => null);
            Prod.description = await page.$eval(config.selectors.header.description, el => el.content).catch(() => null);
            Prod.images = await page.$eval(config.selectors.header.images, el => el.content).catch(() => null);
            Prod.abv = await page.$eval(config.selectors.header.abv, el => el.content).catch(() => null);
            Prod.gluten_free = await page.$eval(config.selectors.header.gluten_free, el => el.content).catch(() => null);
            Prod.vegan = await page.$eval(config.selectors.header.vegan, el => el.content).catch(() => null);
            Prod.producer = await page.$eval(config.selectors.header.producer, el => el.content).catch(() => null);
            Prod.energy = await page.$eval(config.selectors.header.energy, el => el.content).catch(() => null);
            Prod.sugars = await page.$eval(config.selectors.header.sugars, el => el.content).catch(() => null);
            Prod.category = await page.$eval(config.selectors.header.category, el => el.content).catch(() => null);
  
            // 2. Extract main section information if meta info is missing
            Prod.name = Prod.name || await page.$eval(config.selectors.main.name, el => el.textContent.trim()).catch(() => "Name not found");
            Prod.price = Prod.price || await page.$eval(config.selectors.main.price, el => el.textContent.trim()).catch(() => null);
            Prod.currency = Prod.currency || await page.$eval(config.selectors.main.currency, el => el.textContent.trim()).catch(() => null);
            Prod.country = Prod.country || await page.$eval(config.selectors.main.country, el => el.textContent.trim()).catch(() => null);
            Prod.description = Prod.description || await page.$eval(config.selectors.main.description, el => el.textContent.trim()).catch(() => "No description available");
            Prod.images = Prod.images || await page.$eval(config.selectors.main.images, el => el.getAttribute('src')).catch(() => null);
            Prod.abv = Prod.abv || await page.$eval(config.selectors.main.abv, el => el.textContent.trim()).catch(() => null);
            Prod.gluten_free = Prod.gluten_free || await page.$eval(config.selectors.main.gluten, el => el.textContent.trim()).catch(() => null);
            Prod.vegan = Prod.vegan || await page.$eval(config.selectors.main.vegan, el => el.textContent.trim()).catch(() => null);
            Prod.producer = Prod.producer || await page.$eval(config.selectors.main.producer, el => el.textContent.trim()).catch(() => null);
            Prod.energy = Prod.energy || await page.$eval(config.selectors.main.energy, el => el.textContent.trim()).catch(() => null);
            Prod.sugars = Prod.sugars || await page.$eval(config.selectors.main.sugars, el => el.textContent.trim()).catch(() => null);
            Prod.category = Prod.category || await page.$eval(config.selectors.main.category, el => el.textContent.trim()).catch(() => null);
  
            
            if(config.moreConfig){
              Prod = await refineData(config.rootUrl, Prod, page);
            }
            
          
  
            return Prod;
          } catch (error) {
            log.error(`Error during product extraction: ${error.message}`);
          }
          finally{
            page.close();
          }
  }
  
  export function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }
  