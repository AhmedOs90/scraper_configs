// services/refiners/sites/dengyldneloeve.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.price = product.price
        .replace(',', '.')
        .replace(/[^0-9.]/g, '')
        .trim();

    if (product.price.length > 6) {
        product.price = product.price.slice(0, 6);
    }
    return product;
}