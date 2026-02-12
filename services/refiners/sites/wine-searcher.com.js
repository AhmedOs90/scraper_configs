// services/refiners/sites/wine-searcher.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'New Zealand';

    const lastDot = product.description.lastIndexOf('.');
    const lastBang = product.description.lastIndexOf('!');
    const cutIndex = Math.max(lastDot, lastBang);

    if (cutIndex !== -1) {
        product.description = product.description.slice(0, cutIndex + 1).trim();
    }
    return product;
}