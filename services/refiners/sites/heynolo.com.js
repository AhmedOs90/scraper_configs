// services/refiners/sites/heynolo.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';

    product.name = product.name.replace(product.producer, "").trim();

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    return product;
}