export default async function refine(rootUrl, product, page) {
    product.country = 'Canada';

    let metaText = '';

    try {
        metaText = await page.$$eval(
            '.metafield-rich_text_field',
            nodes => nodes.map(n => n.innerText).join('\n')
        );
    } catch (err) {}

    const text = metaText || '';

    product.extras = product.extras || {};

    const abvMatch = text.match(/Alcohol:\s*(?:<\s*)?\d+(?:\.\d+)?\s*%?\s*(?:ABV)?/i);
    const energyMatch = text.match(/Calories:\s*\d+(?:\.\d+)?\s*(?:k?cal)?/i);
    const sugarsMatch = text.match(/Sugars:\s*\d+(?:\.\d+)?\s*g/i);

    const fatMatch = text.match(/Fat:\s*(?:<\s*)?\d+(?:\.\d+)?\s*g/i);
    const proteinMatch = text.match(/Protein:\s*(?:<\s*)?\d+(?:\.\d+)?\s*g/i);
    const carbsMatch = text.match(/Carbohydrate:\s*\d+(?:\.\d+)?\s*g/i);
    const cholesterolMatch = text.match(/Cholesterol:\s*\d+(?:\.\d+)?\s*mg/i);
    const sodiumMatch = text.match(/Sodium:\s*(?:<\s*)?\d+(?:\.\d+)?\s*mg/i);
    const ingredientsMatch = text.match(/Ingredients:\s*([\s\S]*?)(?:Contains:|$)/i);

    if (!product.abv && abvMatch) {
        product.abv = abvMatch[0].replace(/Alcohol:\s*/i, '').trim();
    }

    if (!product.energy && energyMatch) {
        product.energy = energyMatch[0].replace(/Calories:\s*/i, '').trim();
    }

    if (!product.sugar && sugarsMatch) {
        product.sugar = sugarsMatch[0].replace(/Sugars:\s*/i, '').trim();
    }

    if (!product.extras.fat && fatMatch) {
        product.extras.fat = fatMatch[0].replace(/Fat:\s*/i, '').trim();
    }

    if (!product.extras.protein && proteinMatch) {
        product.extras.protein = proteinMatch[0].replace(/Protein:\s*/i, '').trim();
    }

    if (!product.extras.carbohydrates && carbsMatch) {
        product.extras.carbohydrates = carbsMatch[0].replace(/Carbohydrate:\s*/i, '').trim();
    }

    if (!product.extras.cholesterol && cholesterolMatch) {
        product.extras.cholesterol = cholesterolMatch[0].replace(/Cholesterol:\s*/i, '').trim();
    }

    if (!product.extras.sodium && sodiumMatch) {
        product.extras.sodium = sodiumMatch[0].replace(/Sodium:\s*/i, '').trim();
    }

    if (!product.extras.ingredients && ingredientsMatch) {
        product.extras.ingredients = ingredientsMatch[1].trim();
    }
    return product;
}