// services/refiners/sites/shoppencph.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.price = product.price.replace(',', '.').trim();
    
    const match = product.name.match(/(\<?\d+(?:[.,]\d+)?)\s*%/);
    product.abv = match ? match[1].replace(',', '.') + '%' : null;
    return product;
}