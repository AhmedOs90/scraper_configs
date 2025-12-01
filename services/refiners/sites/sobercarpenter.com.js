// services/refiners/sites/sobercarpenter.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "Canada";
    product.producer = "Sober Carpenter";
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    return product;
}