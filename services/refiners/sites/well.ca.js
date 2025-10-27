// services/refiners/sites/well.ca.js
export default async function refine(rootUrl, product, page) {
    product.name = product.name.replace(product.producer, '').trim();
    product.country = 'Canada';
    product.description = product.description.replace(/\r?\n|\r/g, ' ');

    const data = await page.evaluate(() => {
        const calories = document.querySelector('[itemprop="calories"]')?.textContent.trim() || null;
        const sugar = document.querySelector('[itemprop="sugarContent"]')?.textContent.trim() || null;
        return { calories, sugar };
    });

    product.energy = data.calories;
    product.sugar = data.sugar;

    return product;
}
