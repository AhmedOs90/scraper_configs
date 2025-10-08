// services/refiners/sites/drydrinker.com.js
import { detectCategory, categories } from "../refiners_helpers.js";

export default async function refine(rootUrl, product, page) {
    console.log("Refining product:", product.name);
  product.energy = await page.evaluate(() => {
    const energyEl = document.evaluate(
      "//div[contains(@class, 'feature-chart__table-row') and div[contains(text(), 'Energy')]]/div[2]",
      document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
    ).singleNodeValue;
    return energyEl ? energyEl.textContent.trim() : null;
  });

  product.sugar = await page.evaluate(() => {
    const sugarEl = document.evaluate(
      "//div[contains(@class, 'feature-chart__table-row') and div[contains(text(), 'Sugars')]]/div[2]",
      document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
    ).singleNodeValue;
    return sugarEl ? sugarEl.textContent.trim() : null;
  });

  product.product_category = detectCategory(product.name, product.description, categories);
  return product;
}
