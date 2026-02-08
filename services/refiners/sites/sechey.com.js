// services/refiners/sites/sansdrinks.com.au.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';

    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const descLower = product.description.toLowerCase();
    if (/\bgluten\b/.test(descLower)) product.gluten_free = 'Gluten free';
    if (/\bvegan\b/.test(descLower)) product.vegan = 'Vegan';

    const abvMatch =
        product.description.match(/\b(\d{1,2}(?:\.\d{1,2})?)\s*%?\s*abv\b/i) ||
        product.description.match(/\babv\s*[:\-]?\s*(\d{1,2}(?:\.\d{1,2})?)\s*%?\b/i) ||
        product.description.match(/\b(\d{1,2}(?:\.\d{1,2})?)\s*%\b/i);

    if (abvMatch) product.abv = Number(abvMatch[1]);

    if (product.name.includes('|')) {
        const [producerName, productName] = product.name.split('|').map(s => s.trim());
        product.producer = producerName;
        product.name = productName;
    }

    return product;
}