// services/refiners/sites/beershoppen.dk.js
import { extractABVFromText } from "../refiners_helpers.js";
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.price = product.price.replace(',', '').trim();
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    product.abv = extractABVFromText(product.name, product.description);
    return product;
}