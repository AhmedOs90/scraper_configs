// services/refiners/sites/bittersandbottles.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';
    product.currency = 'USD';
    product.price = product.price.replace('$', '').trim();
    product.description = product.description.replace(/\s+/g, ' ').trim();
    return product;
}