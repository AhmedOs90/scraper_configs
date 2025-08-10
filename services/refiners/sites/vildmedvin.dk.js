// services/refiners/sites/vildmedvin.dk.js
export default async function refine(rootUrl, product, page) {
  // ABV from attribute rows
  product.abv = await page.$$eval(".product-attribute", (rows) => {
    for (const row of rows) {
      const label = row.querySelector(".name span")?.textContent?.trim();
      const value = row.querySelector(".value div")?.textContent?.trim();
      if (label && value && label.toLowerCase().includes("alkohol")) {
        return value;
      }
    }
    return null;
  }).catch(() => null);

  // Price fallback if missing
  if (!product.price) {
    product.price = await page.$eval("#CartContent .price.serif .weight-700", el => el.textContent.trim()).catch(() => null);
  }

  return product;
}
