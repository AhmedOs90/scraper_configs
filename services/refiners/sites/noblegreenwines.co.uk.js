// services/refiners/sites/noblegreenwines.co.uk.js
export default async function refine(rootUrl, product, page) {
    product.country = "UK";
    product.currency = "GBP";
    product.name = product.name.replace(' | Noble Green Wines', '').trim();
    product.price = product.price.replace('£', '').trim();

    const details = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('dl > div'));
        const map = {};

        rows.forEach(row => {
            const key = row.querySelector('dt')?.textContent.trim();
            const value = row.querySelector('dd')?.textContent.trim();
            if (key && value) {
                map[key] = value;
            }
        });

        return map;
    });

    if (details.ABV) {
        product.abv = details.ABV;
    }

    if (details.Dietary) {
        const dietary = details.Dietary.toLowerCase();

        if (dietary.includes('vegan')) {
            product.vegan = 'Vegan';
        }

        if (dietary.includes('gluten')) {
            product.gluten_free = 'Gluten free';
        }
    }
    return product;
}