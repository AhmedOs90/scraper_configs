// services/refiners/sites/zerodrinks.co.za.js
export default async function refine(rootUrl, product, page) {
    product.name = product.name.replace(' | Zero Drinks', '').trim();
    product.country = 'South Africa';
    return product;
}