// services/refiners/sites/bovino.de.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Germany';
    product.currency = 'EUR';
    product.price = product.price.replace('€', '').replace(',', '.').trim();
    return product;
}