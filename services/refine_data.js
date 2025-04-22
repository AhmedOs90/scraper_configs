export async function refineData(rootUrl, product, page) {
  if (rootUrl === "https://drydrinker.com") {
    product.energy = await page.evaluate(() => {
      const energyEl = document.evaluate("//div[contains(@class, 'feature-chart__table-row') and div[contains(text(), 'Energy')]]/div[2]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      return energyEl ? energyEl.textContent.trim() : null;
    });

    product.sugar = await page.evaluate(() => {
      const sugarEl = document.evaluate("//div[contains(@class, 'feature-chart__table-row') and div[contains(text(), 'Sugars')]]/div[2]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      return sugarEl ? sugarEl.textContent.trim() : null;
    });

    product.product_category = detectCategory(product.name, product.description, categories);
  }

  if (rootUrl === "https://dryvariety.com") {
    let text = product.abv || product.description || ""; // Use description if abv text is not available
    
    // Regular expressions to capture relevant information
    const abvMatch = text.match(/Alcohol[:\s]*(.*)/i);
    const energyMatch = text.match(/Energy[:\s]*(.*)/i);
    const sugarsMatch = text.match(/sugars[:\s]*(.*)/i);

    // Set extracted values or keep null if not found
    product.abv = abvMatch ? abvMatch[1].trim() : null;
    product.energy = energyMatch ? energyMatch[1].trim() : null;
    product.sugar = sugarsMatch ? sugarsMatch[1].trim() : null;

    // product.country = "CA";
  }

  if (rootUrl === "https://sansdrinks.com.au") {
    product.energy = await page.evaluate(() => {
    const th = Array.from(document.querySelectorAll('th')).find(el => el.textContent.includes('Calories'));
    return th ? th.nextElementSibling.textContent.trim() : null;
  }).catch(() => null);
  
  product.sugar = await page.evaluate(() => {
    const th = Array.from(document.querySelectorAll('th')).find(el => el.textContent.includes('Sugar'));
    return th ? th.nextElementSibling.textContent.trim() : null;
  }).catch(() => null);
  
  product.abv = await page.evaluate(() => {
    const th = Array.from(document.querySelectorAll('th')).find(el => el.textContent.includes('ABV'));
    return th ? th.nextElementSibling.textContent.trim() : null;
  }).catch(() => null);

  const productDataArray = await page.evaluate(() => {
    const scriptTags = Array.from(document.querySelectorAll('script.tpt-seo-schema'));
    const data = [];
    console.log("foundtag : scriptTags");

    scriptTags.forEach(scriptTag => {
      console.log("foundtag");

      const scriptContent = scriptTag.textContent;
      const match = scriptContent.match(/var preAsssignedValue = ({[\s\S]*?});/);
      
      if (match && match[1]) {
        try {
          const parsedData = eval('(' + match[1] + ')');
          data.push(parsedData);
        } catch (error) {
          console.error('Error parsing script content:', error);
        }
      }
    });
    
    return data;
  });

 if (productDataArray && productDataArray.length > 0) {
      productDataArray.forEach(data => {
        product.producer = data["product.vendor"] || product.producer;
      });
    } else {
      console.log("No product data found in script tags");
    }


    if (product.vegan && /vegan/i.test(product.vegan)) {
      product.vegan = "Vegan";
    } else {
      product.vegan = null;
    }
    if (product.gluten_free && /glutten/i.test(product.gluten_free)) {
      product.gluten_free = "gluten_free";
    } else {
      product.gluten_free = null;
    }
    // product.country = "AU";

}

  if (rootUrl === "https://alkoholfributik.dk") {
    product.abv = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.table-data-sheet tr'));
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length === 2 && cells[0].textContent.trim().includes('Alkoholindhold')) {
          return cells[1].textContent.trim();
        }
      }
      return null;
    }).catch(() => null);
    product.energy = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.table-data-sheet tr'));
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length === 2 && cells[0].textContent.trim().includes('Kalorier')) {
          return cells[1].textContent.trim();
        }
      }
      return null;
    }).catch(() => null);
    product.sugar = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.table-data-sheet tr'));
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length === 2 && cells[0].textContent.trim().includes('Heraf sukkerarter')) {
          return cells[1].textContent.trim();
        }
      }
      return null;
    }).catch(() => null);
    
   
  
}

if (rootUrl === "https://www.alcoholvrijshop.nl") {
  product.energy = await page.evaluate(() => {
    const th = Array.from(document.querySelectorAll('th')).find(el => el.textContent.includes('Energie'));
    return th ? th.nextElementSibling.textContent.trim() : null;
  }).catch(() => null);
  
  product.sugar = await page.evaluate(() => {
    const th = Array.from(document.querySelectorAll('th')).find(el => el.textContent.includes('waarvan suikers'));
    return th ? th.nextElementSibling.textContent.trim() : null;
  }).catch(() => null);
  
  product.abv = await page.evaluate(() => {
    const th = Array.from(document.querySelectorAll('th')).find(el => el.textContent.includes('Alcoholgehalte'));
    return th ? th.nextElementSibling.textContent.trim() : null;
  }).catch(() => null);

  product.producer = await page.evaluate(() => {
    const th = Array.from(document.querySelectorAll('th')).find(el => el.textContent.includes('Merk'));
    return th ? th.nextElementSibling.textContent.trim() : null;
  }).catch(() => null);
}

if(rootUrl === "https://ishspirits.com"){
  product.producer = "Ish"
 
product.country = "DK"
product.currency = "KR"

product.energy = await page.evaluate(() => {
    const elements = document.querySelectorAll("span.metafield-multi_line_text_field");
    for (let el of elements) {
        console.log("Checking:", el.innerText); // Debugging Step
        if (el.textContent.includes("Energy:")) {
            return el.textContent.split("Energy:")[1].split("\n")[0].trim();  // Extracts until first line break
        }
    }
    return null;
}).catch(() => null);

product.sugar = await page.evaluate(() => {
    const elements = document.querySelectorAll("span.metafield-multi_line_text_field");
    for (let el of elements) {
        console.log("Checking:", el.innerText); // Debugging Step
        if (el.textContent.includes("of which sugars:")) {
            return el.textContent.split("of which sugars:")[1].split("\n")[0].trim();  // Extracts until first line break
        }
    }
    return null;
}).catch(() => null);

}
  // Attempt to extract ABV from product.description if it's still missing
  const anotherABV = product.description.match(/(\d+\.\d+% ABV|\d+% ABV)/i);
  product.abv = product.abv || (anotherABV ? anotherABV[0] : null);
  
  product.abv = product.abv || detectZeroAlcohol(product.name, product.description);
  // Check for vegan and gluten-free if not set
  const { isVegan, isgluten_free } = detectVeganAndgluten_free(product.description || "");
  product.vegan = product.vegan || isVegan;
  product.gluten_free = product.gluten_free || isgluten_free;
  product.product_category = detectCategory(product.name, product.description, categories);

  return product;
}

// Helper function to detect category
function detectCategory(productName, productDescription, categories) {
  const lowerName = productName.toLowerCase();
  const lowerDescription = productDescription.toLowerCase();
  for (const category of categories) {
    if (lowerName.includes(category.toLowerCase()) || lowerDescription.includes(category.toLowerCase())) {
      return category;
    }
  }
  return "Other";
}

const categories = ["Beer", "Wine", "Spirit", "Kombucha", "Cider", "Soda", "tea","soda water","can opener","gift card","Other"];

// Helper function to detect vegan and gluten-free in description
function detectVeganAndgluten_free(description) {

  const isVegan = /vegan/i.test(description) ? "Vegan" : null;
  const isgluten_free = /gluten[-\s]*free/i.test(description) ? "Gluten free" : null;
  return { isVegan, isgluten_free };
}

// Helper function to check for "zero alcohol" in name or description
function detectZeroAlcohol(name, description) {
  const isZeroAlcohol = /zero[-\s]*alcohol/i.test(name) || /zero[-\s]*alcohol/i.test(description) ||
   /non[-\s]*alcohol/i.test(name) || /non[-\s]*alcohol/i.test(description) || /alcohol[-\s]*free/i.test(name) || /alcohol[-\s]*free/i.test(description) ? "0.0 ABV" : null;
  return isZeroAlcohol;
}
