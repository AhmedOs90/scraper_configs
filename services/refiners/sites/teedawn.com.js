// services/refiners/sites/teedawn.com.js
import { extractABVFromText } from "../refiners_helpers.js";

export default async function refine(rootUrl, product, page) {
  product.abv = product.abv || await page.evaluate(() => {
    const container = document.querySelector('.ProductItem-details-excerpt');
    if (!container) return null;
    const lines = (container.innerText || '').toLowerCase().split('\n');
    for (const line of lines) {
      if (line.includes('alkoholprocent')) {
        const m = line.match(/(\d+(?:[.,]\d+)?)\s*%/);
        if (m) return m[1].replace(',', '.') + '%';
      }
    }
    return null;
  }).catch(() => null);

  // Fallbacks
  product.abv = product.abv || extractABVFromText(product.name, product.description);
  if (!product.abv && /0\s*%/.test(`${product.name || ''}`)) product.abv = "0%";

  product.producer = product.producer || "teedawn";
  return product;
}
