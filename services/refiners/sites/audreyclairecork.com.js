// services/refiners/sites/audreyclairecork.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    return product;
}
