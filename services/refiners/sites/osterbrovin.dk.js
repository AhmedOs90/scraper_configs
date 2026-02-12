// services/refiners/sites/osterbrovin.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.price = product.price.replace(',', '.').trim();
    product.producer = product.producer?.replace('Ved ', '').trim();
    return product;
}