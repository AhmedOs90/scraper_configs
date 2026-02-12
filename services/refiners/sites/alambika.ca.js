// services/refiners/sites/alambika.ca.js
export default async function refine(rootUrl, product, page) {
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.country = 'Canada';
    return product;
}