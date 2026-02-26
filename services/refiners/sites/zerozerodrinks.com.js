// services/refiners/sites/zerozerodrinks.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Thailand';
    product.name = product.name
        .replace('***NEW*** ', '')
        .replace(/\s\/.*$/, '')
        .trim();
    product.price = product.price
        .replace('.00', '')
        .replace(',', '.')
        .trim();
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const energyMatch = product.description.match(/Energy\s*([\d.]+\s*kJ\/[\d.]+\s*kcal)/i);
    const sugarMatch = product.description.match(/of which sugars\s*([\d.]+\s*g)/i);

    if (energyMatch) product.energy = energyMatch[1].trim();
    if (sugarMatch) product.sugar = sugarMatch[1].trim();
    return product;
}