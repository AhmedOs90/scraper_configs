export default async function refine(rootUrl, product, page) {

    if (product.name?.includes('-')) {
        const [producer, ...rest] = product.name.split(/-(.+)/).map(s => s.trim());
        product.producer = producer;
        product.name = rest[0];
    }
    product.price = product.price?.replace(',', '.').trim();
    product.country = "Austria";
    product.description = product.description?.replace(/\s+/g, ' ').trim();

    const desc = product.description?.toLowerCase() || '';

    const abvMatch = product.description.match(/abv[:\s]*<?\s*([\d.,]+)\s*%/i);
    if (abvMatch) product.abv = abvMatch[1].replace(',', '.').trim() + ' %';

    const energyMatch = product.description.match(/energie[:\s]*([\d.,]+\s*kj\s*\/\s*[\d.,]+\s*kcal)/i);
    if (energyMatch) product.energy = energyMatch[1].replace(/\s+/g, ' ').trim();

    const sugarMatch = product.description.match(/zucker[:\s]*([\d.,]+\s*g)/i);
    if (sugarMatch) product.sugar = sugarMatch[1].replace(',', '.').trim();

    if (/(vegan)/i.test(desc)) product.vegan = 'Vegan';
    if (/(gluten[\s-]?free|glutenfrei)/i.test(desc)) product.gluten_free = 'Gluten free';

    return product;
}
