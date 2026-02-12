// services/refiners/sites/thenewbar.com.js
export default async function refine(rootUrl, product, page) {
    const tags = await page.evaluate(() => window?.Rivo?.common?.product?.tags || []);

    const abvTag = tags.find(t => t.toLowerCase().includes('abv'));
    if (abvTag) product.abv = abvTag;

    if (tags.some(t => t.toLowerCase() === 'vegan')) product.vegan = 'Vegan';
    if (tags.some(t => t.toLowerCase() === 'gluten-free')) product.gluten_free = 'Gluten free';

    product.producer = await page.evaluate(() => {
        const scriptTag = document.querySelector('#viewed_product');
        if (!scriptTag) return null;
        const content = scriptTag.textContent || '';
        const match = content.match(/Brand:\s*"([^"]+)"/);
        return match ? match[1] : null;
    });

    const nutrition = await page.evaluate(() => {
        const el = document.querySelector('.product-tabs__tab-item-content .metafield-rich_text_field');
        if (!el) return { sugar: null, energy: null };

        const text = el.innerText.replace(/\s+/g, ' ').trim();

        const sugarMatch = text.match(/Total\s*Sugars?\s*:?\s*([<≈]?\s*\d+(\.\d+)?\s*g)/i);

        const caloriesMatch = text.match(/Calories?\s*([<≈]?\s*\d+(\.\d+)?)/i);
        const kjMatch = text.match(/(\d+(\.\d+)?)\s*k[jJ]/);
        const kcalWordMatch = text.match(/(\d+(\.\d+)?)\s*k?cal/i);

        let energy = null;
        if (caloriesMatch) {
            energy = `${caloriesMatch[1]} kcal`;
        } else if (kcalWordMatch) {
            energy = `${kcalWordMatch[1]} kcal`;
        } else if (kjMatch) {
            energy = `${kjMatch[1]} kJ`;
        }

        return {
            sugar: sugarMatch ? sugarMatch[1].replace(/\s+/g, ' ').trim() : null,
            energy: energy ? energy.replace(/\s+/g, ' ').trim() : null,
        };
    });

    if (nutrition.sugar) product.sugar = nutrition.sugar;
    if (nutrition.energy) product.energy = nutrition.energy;
    return product;
}