// services/refiners/sites/jomoclub.co.uk.js
export default async function refine(rootUrl, product, page) {
    product.country = "UK";
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    return product;
}
