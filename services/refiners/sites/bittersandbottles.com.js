// services/refiners/sites/bittersandbottles.com.js
export default async function refine(rootUrl, product, page) {
    product.price = product.price.replace('$', '').trim();
    product.currency = 'USD';
    product.country = 'USA';
    product.description = product.description.replace(/\s+/g, ' ').trim();
    return product;
}
