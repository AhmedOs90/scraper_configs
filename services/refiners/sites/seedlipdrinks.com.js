// services/refiners/sites/seedlipdrinks.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';
    product.currency = 'USD';
    product.price = product.price.replace('$', '').trim();
    product.name = product.name
        .replace(' - Seedlip', '')
        .replace(' | Seedlip', '')
        .trim();
    product.producer = 'Seedlip';
    return product;
}