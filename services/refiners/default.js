// services/refiners/default.js
import { detectCategory, detectVeganAndgluten_free, extractABVFromText, categories } from "./refiners_helpers.js";

export default async function defaultRefiner(rootUrl, product, page) {
  // Try to extract ABV from description if it's still missing
  if (!product.abv && product.description) {
    const anotherABV = product.description.match(/(\d+\.\d+% ABV|\d+% ABV)/i);
    product.abv = anotherABV ? anotherABV[0] : product.abv;
  }

  // Generic regex fallback
  product.abv = product.abv || extractABVFromText(product.name, product.description);

  // Normalize vegan/gluten-free
  const { isVegan, isgluten_free } = detectVeganAndgluten_free(product.description || "");
  product.vegan = product.vegan || isVegan;
  product.gluten_free = product.gluten_free || isgluten_free;

  // Category
  product.product_category = product.product_category || detectCategory(product.name, product.description, categories);

  return product;
}
