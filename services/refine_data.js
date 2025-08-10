import { getRefinerForUrl } from "./refiners/registry.js";
import { detectCategory, detectVeganAndgluten_free, extractABVFromText, categories } from "./refiners/refiners_helpers.js";

export async function refineData(rootUrl, product, page) {
  // mirror your console piping for parity
  page.on("console", (msg) => {
    for (let i = 0; i < msg.args().length; ++i) {
      msg.args()[i].jsonValue().then((val) => {
        console.log(`PAGE LOG: ${val}`);
      }).catch(() => {});
    }
  });

  const refiner = getRefinerForUrl(rootUrl);
  const result = await refiner(rootUrl, product, page);
  return result || product;
}

// export async function refineData(rootUrl, product, page) {
//   page.on('console', msg => {
//     for (let i = 0; i < msg.args().length; ++i) {
//       msg.args()[i].jsonValue().then(val => {
//         console.log(`PAGE LOG: ${val}`);
//       });
//     }
//   });

//   if (rootUrl === "https://drydrinker.com") {
//     product.energy = await page.evaluate(() => {
//       const energyEl = document.evaluate("//div[contains(@class, 'feature-chart__table-row') and div[contains(text(), 'Energy')]]/div[2]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//       return energyEl ? energyEl.textContent.trim() : null;
//     });

//     product.sugar = await page.evaluate(() => {
//       const sugarEl = document.evaluate("//div[contains(@class, 'feature-chart__table-row') and div[contains(text(), 'Sugars')]]/div[2]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//       return sugarEl ? sugarEl.textContent.trim() : null;
//     });

//     product.product_category = detectCategory(product.name, product.description, categories);
//   }

//   if (rootUrl === "https://dryvariety.com") {
//     let text = product.abv || product.description || ""; // Use description if abv text is not available

//     // Regular expressions to capture relevant information
//     const abvMatch = text.match(/Alcohol[:\s]*(.*)/i);
//     const energyMatch = text.match(/Energy[:\s]*(.*)/i);
//     const sugarsMatch = text.match(/sugars[:\s]*(.*)/i);

//     // Set extracted values or keep null if not found
//     product.abv = abvMatch ? abvMatch[1].trim() : null;
//     product.energy = energyMatch ? energyMatch[1].trim() : null;
//     product.sugar = sugarsMatch ? sugarsMatch[1].trim() : null;

//     // product.country = "CA";
//   }

//   if (rootUrl === "https://sansdrinks.com.au") {
//     product.energy = await page.evaluate(() => {
//       const th = Array.from(document.querySelectorAll('th')).find(el => el.textContent.includes('Calories'));
//       return th ? th.nextElementSibling.textContent.trim() : null;
//     }).catch(() => null);

//     product.sugar = await page.evaluate(() => {
//       const th = Array.from(document.querySelectorAll('th')).find(el => el.textContent.includes('Sugar'));
//       return th ? th.nextElementSibling.textContent.trim() : null;
//     }).catch(() => null);

//     product.abv = await page.evaluate(() => {
//       const th = Array.from(document.querySelectorAll('th')).find(el => el.textContent.includes('ABV'));
//       return th ? th.nextElementSibling.textContent.trim() : null;
//     }).catch(() => null);

//     const productDataArray = await page.evaluate(() => {
//       const scriptTags = Array.from(document.querySelectorAll('script.tpt-seo-schema'));
//       const data = [];
//       console.log("foundtag : scriptTags");

//       scriptTags.forEach(scriptTag => {
//         console.log("foundtag");

//         const scriptContent = scriptTag.textContent;
//         const match = scriptContent.match(/var preAsssignedValue = ({[\s\S]*?});/);

//         if (match && match[1]) {
//           try {
//             const parsedData = eval('(' + match[1] + ')');
//             data.push(parsedData);
//           } catch (error) {
//             console.error('Error parsing script content:', error);
//           }
//         }
//       });

//       return data;
//     });

//     if (productDataArray && productDataArray.length > 0) {
//       productDataArray.forEach(data => {
//         product.producer = data["product.vendor"] || product.producer;
//       });
//     } else {
//       console.log("No product data found in script tags");
//     }


//     if (product.vegan && /vegan/i.test(product.vegan)) {
//       product.vegan = "Vegan";
//     } else {
//       product.vegan = null;
//     }
//     if (product.gluten_free && /glutten/i.test(product.gluten_free)) {
//       product.gluten_free = "gluten_free";
//     } else {
//       product.gluten_free = null;
//     }
//     // product.country = "AU";

//   }

//   if (rootUrl === "https://alkoholfributik.dk") {
//     product.abv = await page.evaluate(() => {
//       const rows = Array.from(document.querySelectorAll('.table-data-sheet tr'));
//       for (const row of rows) {
//         const cells = row.querySelectorAll('td');
//         if (cells.length === 2 && cells[0].textContent.trim().includes('Alkoholindhold')) {
//           return cells[1].textContent.trim();
//         }
//       }
//       return null;
//     }).catch(() => null);
//     product.energy = await page.evaluate(() => {
//       const rows = Array.from(document.querySelectorAll('.table-data-sheet tr'));
//       for (const row of rows) {
//         const cells = row.querySelectorAll('td');
//         if (cells.length === 2 && cells[0].textContent.trim().includes('Kalorier')) {
//           return cells[1].textContent.trim();
//         }
//       }
//       return null;
//     }).catch(() => null);
//     product.sugar = await page.evaluate(() => {
//       const rows = Array.from(document.querySelectorAll('.table-data-sheet tr'));
//       for (const row of rows) {
//         const cells = row.querySelectorAll('td');
//         if (cells.length === 2 && cells[0].textContent.trim().includes('Heraf sukkerarter')) {
//           return cells[1].textContent.trim();
//         }
//       }
//       return null;
//     }).catch(() => null);



//   }

//   if (rootUrl === "https://www.alcoholvrijshop.nl") {
//     product.energy = await page.evaluate(() => {
//       const th = Array.from(document.querySelectorAll('th')).find(el => el.textContent.includes('Energie'));
//       return th ? th.nextElementSibling.textContent.trim() : null;
//     }).catch(() => null);

//     product.sugar = await page.evaluate(() => {
//       const th = Array.from(document.querySelectorAll('th')).find(el => el.textContent.includes('waarvan suikers'));
//       return th ? th.nextElementSibling.textContent.trim() : null;
//     }).catch(() => null);

//     product.abv = await page.evaluate(() => {
//       const th = Array.from(document.querySelectorAll('th')).find(el => el.textContent.includes('Alcoholgehalte'));
//       return th ? th.nextElementSibling.textContent.trim() : null;
//     }).catch(() => null);

//     product.producer = await page.evaluate(() => {
//       const th = Array.from(document.querySelectorAll('th')).find(el => el.textContent.includes('Merk'));
//       return th ? th.nextElementSibling.textContent.trim() : null;
//     }).catch(() => null);
//   }

//   if (rootUrl === "https://ishspirits.com") {
//     product.producer = "Ish"

//     product.country = "DK"
//     product.currency = "KR"

//     product.energy = await page.evaluate(() => {
//       const elements = document.querySelectorAll("span.metafield-multi_line_text_field");
//       for (let el of elements) {
//         console.log("Checking:", el.innerText); // Debugging Step
//         if (el.textContent.includes("Energy:")) {
//           return el.textContent.split("Energy:")[1].split("\n")[0].trim();  // Extracts until first line break
//         }
//       }
//       return null;
//     }).catch(() => null);

//     product.sugar = await page.evaluate(() => {
//       const elements = document.querySelectorAll("span.metafield-multi_line_text_field");
//       for (let el of elements) {
//         console.log("Checking:", el.innerText); // Debugging Step
//         if (el.textContent.includes("of which sugars:")) {
//           return el.textContent.split("of which sugars:")[1].split("\n")[0].trim();  // Extracts until first line break
//         }
//       }
//       return null;
//     }).catch(() => null);

//   }

//   if (rootUrl === "https://www.vildmedvin.dk") {
//     // Extract ABV by scanning all product-attribute rows
//     product.abv = await page.$$eval('.product-attribute', (rows) => {
//       for (const row of rows) {
//         const label = row.querySelector('.name span')?.textContent?.trim();
//         const value = row.querySelector('.value div')?.textContent?.trim();
//         if (label && value && label.toLowerCase().includes('alkohol')) {
//           return value;
//         }
//       }
//       return null;
//     });
//     if (!product.price)
//       product.price = await page.$eval('#CartContent .price.serif .weight-700', el => el.textContent.trim()).catch(() => null);
//   }

//   if (rootUrl === "https://beershoppen.dk") {
//     // Extract ABV by scanning all product-attribute rows
//     product.abv = extractABVFromText(product.name, product.description);

//   }

//   if (rootUrl === "https://shoppencph.dk") {
//     // Extract ABV by scanning all product-attribute rows
//     product.abv = extractABVFromText(product.name, product.description);

//   }
//   if (rootUrl === "https://www.nemlig.com" && product.price) {
//     try {
//       await page.waitForSelector('strong.product-detail__attribute-key', { timeout: 5000 });
//       product.producer = await page.evaluate(() => {
//         const keys = document.querySelectorAll('strong.product-detail__attribute-key');
//         for (const key of keys) {
//           if (key.textContent?.trim().toLowerCase().includes('brand')) {
//             return key.parentElement?.querySelector('span.product-detail__attribute-value')?.textContent?.trim() || null;
//           }
//         }
//         return null;
//       });
//     } catch (e) {
//       console.warn('⚠️ Producer not found or wait failed.');
//     }

//     try {
//       await page.waitForSelector('.product-detail__attribute-key', { timeout: 5000 });
//       product.abv = await page.evaluate(() => {
//         const keys = document.querySelectorAll('.product-detail__attribute-key');
//         for (const key of keys) {
//           const label = key.textContent?.trim().toLowerCase();
//           if (label && label.includes('alkohol-%')) {
//             const valueEl = key.parentElement?.querySelector('.product-detail__attribute-value');
//             return valueEl?.textContent?.trim().replace(',', '.');
//           }
//         }
//         return null;
//       });
//     } catch (e) {
//       console.warn('⚠️ ABV not found or wait failed.');
//     }

//     try {
//       await page.waitForSelector('table', { timeout: 5000 });
//       product.energy = await page.evaluate(() => {
//         const rows = document.querySelectorAll('table tr');
//         for (const row of rows) {
//           const label = row.querySelector('td')?.textContent?.trim();
//           if (label && label.toLowerCase().includes('energi')) {
//             return row.querySelectorAll('td')[1]?.textContent?.trim();
//           }
//         }
//         return null;
//       });

//       product.sugar = await page.evaluate(() => {
//         const rows = document.querySelectorAll('table tr');
//         for (const row of rows) {
//           const label = row.querySelector('td')?.textContent?.trim();
//           if (label && label.toLowerCase().includes('heraf sukkerarter')) {
//             return row.querySelectorAll('td')[1]?.textContent?.trim();
//           }
//         }
//         return null;
//       });
//     } catch (e) {
//       console.warn('⚠️ Energy or Sugar data not found or wait failed.');
//     }

//     // Fallback ABV
//     if (!product.abv) {
//       product.abv = extractABVFromText(product.name, product.description);
//     }

//     product.currency = "DKK";
//   }
//   if (rootUrl === "https://thezeroproof.com") {

//     product.producer = await page.evaluate(() => {
//       const scriptTag = document.querySelector('#viewed_product');
//       if (!scriptTag) return null;

//       const content = scriptTag.textContent;
//       const match = content.match(/Brand:\s*"([^"]+)"/);
//       return match ? match[1] : null;
//     });
//   }

//   if (rootUrl === "https://proofnomore.com") {

//     product.producer = await page.evaluate(() => {
//       const scriptTag = document.querySelector('#viewed_product');
//       if (!scriptTag) return null;

//       const content = scriptTag.textContent;
//       const match = content.match(/Brand:\s*"([^"]+)"/);
//       return match ? match[1] : null;
//     });

//   }
//   if (rootUrl === "https://drinknolow.com") {

//     product.producer = await page.evaluate(() => {
//       const scriptTag = document.querySelector('#viewed_product');
//       if (!scriptTag) return null;

//       const content = scriptTag.textContent;
//       const match = content.match(/Brand:\s*"([^"]+)"/);
//       return match ? match[1] : null;
//     });

//     const { vegan, glutenfree } = await page.evaluate(() => {
//       const spans = document.querySelectorAll('span.metafield-multi_line_text_field');
//       if (!spans.length) return { vegan: false, glutenfree: false };

//       const text = Array.from(spans)
//         .map(span => span.innerText)
//         .join(' ')
//         .toLowerCase();

//       return {
//         vegan: text.includes('vegan'),
//         glutenfree: text.includes('gluten'),
//       };
//     });


//     product.vegan = vegan;
//     product.gluten_free = glutenfree;
//   }

//   if (rootUrl === "https://worldofnix.com") {

//     product.producer = await page.evaluate(() => {
//       const scriptTag = document.querySelector('#viewed_product');
//       if (!scriptTag) return null;

//       const content = scriptTag.textContent;
//       const match = content.match(/Brand:\s*"([^"]+)"/);
//       return match ? match[1] : null;
//     });

//     product.energy = await page.evaluate(() => {
//       const items = document.querySelectorAll("li.details-list__item");
//       // Debugging Step
//       console.log("Items found:", items.length); // Debugging Step
//       for (let item of items) {
//         const title = item.querySelector(".details-list__title")?.textContent.trim().toLowerCase();
//         // console.log("Checking:", title); // Debugging Step
//         const value = item.querySelector(".details-list__content")?.textContent.trim();
//         // console.log("Value:", value); // Debugging Step
//         if (title && title.includes("energy")) {
//           return value;
//         }
//       }
//       return null;
//     }).catch(() => null);

//     product.sugar = await page.evaluate(() => {
//       const items = document.querySelectorAll("li.details-list__item");
//       for (let item of items) {
//         const title = item.querySelector(".details-list__title")?.textContent.trim().toLowerCase();
//         const value = item.querySelector(".details-list__content")?.textContent.trim();
//         if (title && title.includes("sugar")) {
//           return value;
//         }
//       }
//       return null;
//     }).catch(() => null);


//   }

//   if (rootUrl === "https://www.beyondbeer.de") {
//     product.abv = await page.evaluate(() => {
//       const rows = document.querySelectorAll("table.product-detail-properties-table tr.properties-row");
//       for (let row of rows) {
//         const label = row.querySelector("th.properties-label")?.textContent.trim().toLowerCase();
//         const value = row.querySelector("td.properties-value")?.textContent.trim();

//         if (label && label.includes("alkoholgehalt")) {
//           return value;
//         }
//       }
//       return null;
//     }).catch(() => null);

//   }

//   if (rootUrl === "https://www.craftzero.com.au") {
//     product.abv = await page.evaluate(() => {
//       const elements = document.querySelectorAll('.product-info-accordion .disclosure__title .with-icon__beside');
//       for (const el of elements) {
//         if (el.textContent?.trim() === 'ABV') {
//           const content = el.closest('details')?.querySelector('.disclosure__content p');
//           return content?.textContent?.trim() || null;
//         }
//       }
//       return null;
//     });

//     product.country = await page.evaluate(() => {
//       const elements = document.querySelectorAll('.product-info-accordion .disclosure__title .with-icon__beside');
//       for (const el of elements) {
//         if (el.textContent?.trim() === 'Country of Origin') {
//           const content = el.closest('details')?.querySelector('.disclosure__content p');
//           return content?.textContent?.trim() || null;
//         }
//       }
//       return null;
//     });
//     product.energy = await page.evaluate(() => {
//       const elements = document.querySelectorAll('.product-info-accordion .disclosure__title .with-icon__beside');
//       for (const el of elements) {
//         if (el.textContent?.trim() === 'Nutritional Info Per 100ml') {
//           const content = el.closest('details')?.querySelector('.disclosure__content p');
//           return content?.textContent?.trim() || null;
//         }
//       }
//       return null;
//     });
//     product.sugar = await page.evaluate(() => {
//       const elements = document.querySelectorAll('.product-info-accordion .disclosure__title .with-icon__beside');
//       for (const el of elements) {
//         if (el.textContent?.trim() === 'Nutritional Info Per 100ml') {
//           const content = el.closest('details')?.querySelector('.disclosure__content p');
//           return content?.textContent?.trim() || null;
//         }
//       }
//       return null;
//     });



//   }

//   if (rootUrl === "https://boisson.co") {
//     console.log("refining");
// product.abv = await page.evaluate(() => {
//   const body = document.querySelector('#description-1');
//   if (!body) return null;

//   const paragraphs = Array.from(body.querySelectorAll('p'));
//   for (let i = 0; i < paragraphs.length; i++) {
//     const label = paragraphs[i].textContent.trim().toLowerCase();
//     if (label.includes('alcohol by volume')) {
//       // Look for the next sibling <ul> and extract the <li> inside it
//       const ul = paragraphs[i].nextElementSibling;
//       if (ul && ul.tagName.toLowerCase() === 'ul') {
//         const li = ul.querySelector('li');
//         return li?.textContent.trim() || null;
//       }
//     }
//   }

//   return null;
// });


//   }
// if (rootUrl === "https://upsidedrinks.com"){
// product.price = (parseFloat(product.price.replace(/[^0-9]/g, '')) / 100).toString();
//   product.abv = await page.evaluate(() => {
//   const paragraphs = document.querySelectorAll('p');

//   for (const p of paragraphs) {
//     const strong = p.querySelector('strong');
//     if (strong && strong.textContent.trim().toLowerCase().startsWith('alcohol')) {
//       // Case 1: value in <span>
//       const span = p.querySelector('span');
//       if (span) return span.textContent.trim();

//       // Case 2: value in p text directly
//       const textAfterStrong = p.textContent.replace(strong.textContent, '').trim();
//       return textAfterStrong || null;
//     }
//   }

//   return null;
// });

// product.producer = await page.evaluate(() => {
//   const script = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
//     .find(s => s.textContent.includes('"@type": "Product"'));
//   if (!script) return null;

//   try {
//     const data = JSON.parse(script.textContent);
//     return data.brand || null;
//   } catch (e) {
//     return null;
//   }
// });
// product.currency = "USD";

// }
// if (rootUrl === "https://thebluedolphinstore.com"){
// product.price = await page.evaluate(() => {
//   try {
//     const scripts = Array.from(document.querySelectorAll('script'))
//       .map(s => s.textContent)
//       .filter(Boolean);

//     for (const script of scripts) {
//       if (script.includes('dataLayer.push') && script.includes('"ecommerce"')) {
//         const jsonMatch = script.match(/dataLayer\.push\((\{.*?\})\)/s);
//         if (jsonMatch && jsonMatch[1]) {
//           const data = JSON.parse(jsonMatch[1]);
//           const items = data?.ecommerce?.items;
//           if (Array.isArray(items) && items.length > 0) {
//             return items[0].price;
//           }
//         }
//       }
//     }
//   } catch (err) {
//     console.error('Error extracting price from dataLayer:', err);
//   }
//   return null;
// });

// product.abv = await page.evaluate(() => {
//   const listItems = Array.from(document.querySelectorAll('li'));
//   for (const li of listItems) {
//     if (li.innerText.toLowerCase().includes('graduación')) {
//       return li.innerText.toLowerCase().replace('graduación:', '').trim();
//     }
//   }
//   return null;
// });
// product.currency = "EUR";

// product.producer = await page.evaluate(() => {
//   const listItems = Array.from(document.querySelectorAll('li'));
//   for (const li of listItems) {
//     if (li.innerText.toLowerCase().includes('productor')) {
//       return li.innerText.toLowerCase().replace('productor:', '').trim();
//     }
//   }
//   return null;
// });

// product.energy = await page.evaluate(() => {
//   const listItems = Array.from(document.querySelectorAll('li'));
//   for (const li of listItems) {
//     if (li.innerText.toLowerCase().includes('calorías')) {
//       return li.innerText.toLowerCase().replace('calorías:', '').trim();
//     }
//   }
//   return null;
// });

// product.sugar = await page.evaluate(() => {
//   const listItems = Array.from(document.querySelectorAll('li'));
//   for (const li of listItems) {
//     if (li.innerText.toLowerCase().includes('azúcares totales')) {
//       return li.innerText.toLowerCase().replace('azúcares totales:', '').trim();
//     }
//   }
//   return null;
// });

// }

// if (rootUrl === "https://www.teedawn.com") {
//  product.abv = await page.evaluate(() => {
//   const container = document.querySelector('.ProductItem-details-excerpt');
//   if (!container) return null;

//   const text = container.innerText.toLowerCase();
//   const lines = text.split('\n'); // Split into separate lines for context

//   for (const line of lines) {
//     if (line.includes('alkoholprocent')) {
//       const match = line.match(/(\d+(?:[.,]\d+)?)\s*%/);
//       if (match) {
//         return match[1].replace(',', '.') + '%'; // Normalize decimal
//       }
//     }
//   }

//   return null;
// });


//   product.abv = product.abv||  extractABVFromText(product.name, product.description);

//   // Fallback: detect "0%" or "0 %" in name or description
//   if (!product.abv && /0\s*%/.test(`${product.name}`)) {
//     product.abv = "0%";
//   }

//   product.producer = "teedawn";
// }

//   // Attempt to extract ABV from product.description if it's still missing
//   const anotherABV = product.description.match(/(\d+\.\d+% ABV|\d+% ABV)/i);
  
//   product.abv = product.abv || (anotherABV ? anotherABV[0] : null);

//   // Check for vegan and gluten-free if not set
//   const { isVegan, isgluten_free } = detectVeganAndgluten_free(product.description || "");
//   product.vegan = product.vegan || isVegan;
//   product.gluten_free = product.gluten_free || isgluten_free;
//   product.product_category = detectCategory(product.name, product.description, categories);

//   return product;
// }
