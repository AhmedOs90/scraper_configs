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

    product.extras = product.extras || {};

    const ingredientsMatch = product.description.match(/INGREDIENTS?:\s*([^]+?)(?:Nutrition|$)/i);
    if (ingredientsMatch) {
        product.extras.ingredients = ingredientsMatch[1].trim();
    }

    const nutritionMatch = product.description.match(/Nutrition[^:]*:\s*([^]+)$/i);
    const nutrition = nutritionMatch ? nutritionMatch[1] : "";

    const extract = (label) => {
        const m = nutrition.match(new RegExp(label + "\\s*:?\\s*([<\\d.,]+)\\s*g", "i"));
        return m ? m[1] : null;
    };

    product.extras.fat = extract("Fat");
    product.extras.carbohydrates = extract("Carbohydrates");
    product.extras.protein = extract("Protein");
    product.extras.salt = extract("Salt");
    return product;
}