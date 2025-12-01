// services/refiners/sites/drinksurely.com.js
export default async function refine(rootUrl, product, page) {
    product.producer = "Surely";
    product.country = "USA";

    const scraped = await page.evaluate(() => {
        const product = {};

        const labels = Array.from(
            document.querySelectorAll('.product__labels li span')
        ).map(el => el.textContent.trim().toLowerCase());

        for (const label of labels) {
            if (label.includes('cal')) {
                product.energy = label;
            }
            if (label.includes('sugar')) {
                product.sugar = label.replace(/[^0-9g]/g, '').trim() || label;
            }
            if (label.includes('gluten')) {
                product.gluten_free = "Gluten free";
            }
            if (label.includes('vegan')) {
                product.vegan = "Vegan";
            }
        }

        return product;
    });

    Object.assign(product, scraped);
    return product;
}