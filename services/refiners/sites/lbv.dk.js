// services/refiners/sites/lbv.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';

    product.price = product.price
        .replace(/\n+/g, '')
        .replace(/,/g, '.')
        .replace(/[^0-9.]/g, '')
        .trim();

    const firstDotIndex = product.price.indexOf('.');
    if (firstDotIndex !== -1) {
        product.price =
            product.price.slice(0, firstDotIndex + 1) +
            product.price
                .slice(firstDotIndex + 1)
                .replace(/\./g, '')
                .slice(0, 2);
    }
    return product;
}