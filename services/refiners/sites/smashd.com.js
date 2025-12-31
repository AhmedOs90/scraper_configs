// services/refiners/sites/smashd.com.js
export default async function refine(rootUrl, product, page) {
    product.producer = 'SMASHD';
    product.country = 'USA';
    product.abv = '< 0.5%'
    product.gluten_free = 'Gluten free';

    const twitterDescription = await page.evaluate(() => {
        const el = document.querySelector('meta[name="twitter:description"]');
        return el?.getAttribute('content') || '';
    });

    if (twitterDescription) {
        const [beforeNutritionFacts] = twitterDescription.split('Nutrition Facts');
        if (beforeNutritionFacts && beforeNutritionFacts.trim()) {
            product.description = beforeNutritionFacts.replace(/\s*\n\s*/g, ' ').trim();
        }

        const caloriesMatch = twitterDescription.match(/Calories\s*([0-9]+)\b/i);
        if (caloriesMatch) {
            product.energy = `${caloriesMatch[1]}cal`;
        }

        const sugarMatch = twitterDescription.match(/Organic\s+Cane\s+Sugar\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]+)?/i);
        if (sugarMatch) {
            const value = sugarMatch[1];
            const unit = (sugarMatch[2] || '').toLowerCase();

            product.sugar = unit === 'g' || unit === 'mg' ? `${value}${unit}` : value;
        }
    }

    return product;
}
