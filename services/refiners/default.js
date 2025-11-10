// services/refiners/default.js
import { detectCategory, detectVeganAndgluten_free, extractABVFromText, categories } from "./refiners_helpers.js";

export default async function defaultRefiner(rootUrl, product, page, config) {
  // Try to extract ABV from description if it's still missing
  if (!product.abv && product.description) {
    const anotherABV = product.description.match(/(\d+\.\d+% ABV|\d+% ABV)/i);
    product.abv = anotherABV ? anotherABV[0] : product.abv;
  }

  // Generic regex fallback
  product.abv = product.abv || extractABVFromText(product.name, product.description);

  // If still missing and this source is a pure player, assume <0.5% ABV
  // Accepts either boolean true or numeric 1, and both camelCase/snake_case
  const isPurePlayer = Boolean(
    (config && (config.purePlayer === 1 || config.purePlayer === true))
  );
  if (!product.abv && isPurePlayer) {
    product.abv = "<0.5% ABV";
  }

  // Normalize vegan/gluten-free
  const { isVegan, isgluten_free } = detectVeganAndgluten_free(product.description || "");
  product.vegan = product.vegan || isVegan;
  product.gluten_free = product.gluten_free || isgluten_free;

  // Category
  product.product_category =
    product.product_category || detectCategory(product.name, product.description, categories);

  return product;
}
