// services/refiners/sites/philipsonwine.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';
    product.name = product.name.replace(' | Philipson Wine', '').trim();
    product.price = product.price.replace(',', '.').trim();
    return product;
}
