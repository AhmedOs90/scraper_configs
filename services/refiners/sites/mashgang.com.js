// services/refiners/sites/market.nabeerclub.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'UK';
    product.producer = 'Mash Gang';
    product.name = product.name.replace('Mash Gang - ', '').replace(' - Mash Gang', '');
    return product;
}