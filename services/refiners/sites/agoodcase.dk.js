// services/refiners/sites/agoodcase.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.price = product.price?.replace(',', '.').trim();
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const abvMatch = product.description?.match(/Alkoholprocent:\s*([\d.,]+)\s*%/i);
    if (abvMatch) {
        product.abv = abvMatch[1].replace(',', '.') + '%';
    }
    return product;
}