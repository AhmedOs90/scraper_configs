// services/refiners/sites/otto-duborg.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    return product;
}