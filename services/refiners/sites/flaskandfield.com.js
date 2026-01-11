// services/refiners/sites/flaskandfield.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';

    const text = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.description = text;

    const producerMatch = text.match(/Producer:\s*([^A]+?)(?=\s+Region:)/i);
    if (producerMatch) {
        product.producer = producerMatch[1].trim();
    }

    const abvMatch = text.match(/Alcohol:\s*([<>]?\d+(\.\d+)?%)/i);
    if (abvMatch) {
        product.abv = abvMatch[1];
    }

    return product;
}