// services/refiners/sites/diceys.com.js
export default async function refine(rootUrl, product, page) {
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.country = "Ireland";
    return product;
}