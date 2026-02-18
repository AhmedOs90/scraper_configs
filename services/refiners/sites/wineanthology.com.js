// services/refiners/sites/wineanthology.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "USA";
    product.currency = "USD";
    product.price = product.price.replace('$', '').trim();
    return product;
}