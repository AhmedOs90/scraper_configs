// services/refiners/sites/shoppencph.dk.js
import { extractABVFromText } from "../refiners_helpers.js";

export default async function refine(rootUrl, product, page) {
  product.abv = product.abv || extractABVFromText(product.name, product.description);
  return product;
}
