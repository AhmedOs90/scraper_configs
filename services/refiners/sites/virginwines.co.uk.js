// services/refiners/sites/virginwines.co.uk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'UK';
    product.currency = 'GBP';
    product.price = product.price.replace('£', '').trim();
    if (product.vegan) { product.vegan = 'Vegan'; }
    return product;
}