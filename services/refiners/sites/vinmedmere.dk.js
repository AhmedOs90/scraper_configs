// services/refiners/sites/vinmedmere.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';

    product.price = product.price
        .replace(' DKK', '')
        .replace(',', '.')
        .trim();

    const cleanDesc = product.description
        ?.replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    product.description = cleanDesc;

    product.extras = product.extras || {};

    const abvMatch =
        cleanDesc?.match(/(\d+[.,]?\d*)\s*%\s*(?:alkohol|alc\.?)/i) ||
        cleanDesc?.match(/(?:alkohol|alc\.?)\s*[:\-]?\s*(\d+[.,]?\d*)\s*%/i);

    if (abvMatch) {
        product.abv = abvMatch[1].replace(',', '.') + '%';
    }

    const sizeMatch = cleanDesc?.match(/(\d+(?:[.,]\d+)?)\s*cl\b/i);
    if (sizeMatch) {
        product.extras.size = sizeMatch[1].replace(',', '.') + ' cl';
    }
    return product;
}