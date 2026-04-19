// services/refiners/sites/honest-rare.de.js
export default async function refine(rootUrl, product, page) {
    const clean = (str) =>
        (str || '')
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();

    const normalizeValue = (str) => clean(str).replace(/\s+/g, ' ').trim();

    product.country = 'Germany';
    product.price = (product.price || '').replace('€', '').replace(',', '.').trim();
    product.currency = 'EUR';
    product.producer = clean(product.producer).replace(/^View more from\s+/i, '');
    product.description = clean(product.description);

    product.abv = null;
    product.energy = null;
    product.sugar = null;

    product.extras = product.extras || {};

    const featureMap = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('.ty-product-features .ty-product-feature')];

        const clean = (str) =>
            (str || '')
                .replace(/\s+/g, ' ')
                .trim();

        const map = {};
        for (const row of rows) {
            const label = clean(row.querySelector('.ty-product-feature__label')?.textContent)
                .replace(/:$/, '')
                .toLowerCase();
            const value = clean(row.querySelector('.ty-product-feature__value')?.textContent);

            if (label) map[label] = value;
        }

        return map;
    });

    const getFeature = (...keys) => {
        for (const key of keys) {
            const value = featureMap[key.toLowerCase()];
            if (value) return normalizeValue(value);
        }
        return null;
    };

    const nutrition =
        getFeature('Nutritional values per 100g', 'Nutritional values per 100ml') || '';

    const pickNutrition = (...labels) => {
        for (const label of labels) {
            const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const match = nutrition.match(new RegExp(`${escaped}:\\s*([^|]+)`, 'i'));
            if (match) return match[1].trim();
        }
        return null;
    };

    const abvFromIcons = await page.evaluate(() => {
        const items = [...document.querySelectorAll('.brand .ty-features-list__item')];

        const match = items.find((item) => {
            const img = item.querySelector('img');
            const alt = img?.getAttribute('alt')?.toLowerCase() || '';
            const title = img?.getAttribute('title')?.toLowerCase() || '';
            return alt.includes('alkohol') || title.includes('alkohol');
        });

        const raw = match?.querySelector('.ty-features-list__item-value')?.textContent?.trim();
        return raw ? raw.replace(/\s*vol\.?\s*/i, '').trim() : null;
    });

    const nonAlcoholic = getFeature('Non-alcoholic');
    const beverageType = getFeature('Beverage type');
    const alcoholFreeProcess = getFeature('Manufacturing process alcohol free');

    if (abvFromIcons) {
        product.abv = abvFromIcons;
    } else if (
        /yes/i.test(nonAlcoholic || '') ||
        /alcohol[- ]?free|non[- ]?alcoholic/i.test(beverageType || '') ||
        /without alcohol|alcohol free/i.test(alcoholFreeProcess || '')
    ) {
        product.abv = '<0.5%';
    }

    const size =
        getFeature('Contents') ||
        product.extras.size;

    product.extras.size = size
        ? normalizeValue(size)
              .replace(/^contents:\s*/i, '')
              .replace(',', '.')
        : null;

    product.energy = pickNutrition('Calorific value', 'Energy');
    product.sugar = pickNutrition('of which sugar', 'Sugar');

    product.extras.botanicals = getFeature('Botanicals');
    product.extras.color = getFeature('Color');
    product.extras.ingredients = getFeature('Ingredients');
    product.extras.fat = pickNutrition('Fat');
    product.extras.fatty_acids = pickNutrition(
        'of which saturated fatty acids',
        'Of which saturated fatty acids'
    );
    product.extras.carbohydrates = pickNutrition('Carbohydrates');
    product.extras.protein = pickNutrition('Protein');
    product.extras.salt = pickNutrition('Salt');
    return product;
}