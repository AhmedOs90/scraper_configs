export default async function refine(rootUrl, product, page) {

    // --- Static truths about Kolonne Null ---
    product.abv = '0.0%';
    product.producer = 'Kolonne Null';
    product.country = 'Germany';
    product.currency = product.currency || 'EUR';

    // --- Clean description ---
    const desc = product.description
        ?.replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!desc) return product;

    // --- Vegan ---
    if (!product.vegan && /vegan/i.test(desc)) {
        product.vegan = 'Yes';
    }

    // --- Gluten free ---
    if (!product.gluten_free && /glutenfrei/i.test(desc)) {
        product.gluten_free = 'Yes';
    }

    // --- Energy ---
    if (!product.energy && /kalorienarm/i.test(desc)) {
        product.energy = 'Low calorie';
    }

    // --- Sugar ---
    if (!product.sugar && /kalorienarm/i.test(desc)) {
        product.sugar = 'Low sugar';
    }

    return product;
}
