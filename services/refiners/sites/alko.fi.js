// services/refiners/sites/alko.fi.js
export default async function refine(rootUrl, product, page) {
    product.country = "Finland";
    product.currency = "EUR";

    const price = await page.evaluate(() => {
        const script = document.querySelector(
            'script[type="application/ld+json"]'
        );
        if (!script) return null;

        try {
            const data = JSON.parse(script.textContent);
            return data?.offers?.price || null;
        } catch {
            return null;
        }
    });

    if (price) product.price = parseFloat(price);

    const extra = await page.evaluate(() => {
        const rows = Array.from(
            document.querySelectorAll('[role="tabpanel"] li')
        );

        const getValue = (label) => {
            const row = rows.find(
                (r) => r.querySelector("span")?.innerText.trim() === label
            );
            return row?.querySelector("div")?.innerText.trim() || null;
        };

        return {
            allergens: getValue("Allergens"),
            ingredients: getValue("Ingredients"),
            sugar: getValue("Sugars"),
            bitterness: getValue("Bitterness"),
            wort_strength: getValue("Wort strength"),
            producer: getValue("Producer"),
            energy: getValue("Energy"),
            fat: getValue("Fat"),
            carbohydrates: getValue("Carbohydrates"),
            size: getValue("Package size"),
        };
    });

    if (extra.allergens) product.extras.allergens = extra.allergens;
    if (extra.ingredients) product.extras.ingredients = extra.ingredients;
    if (extra.sugar) product.sugar = extra.sugar;
    if (extra.bitterness) product.extras.bitterness = extra.bitterness;
    if (extra.wort_strength) product.extras.wort_strength = extra.wort_strength;
    if (extra.producer) product.producer = extra.producer;
    if (extra.energy) product.energy = extra.energy;
    if (extra.fat) product.extras.fat = extra.fat;
    if (extra.carbohydrates) product.extras.carbohydrates = extra.carbohydrates;
    if (extra.size) product.extras.size = extra.size;
    return product;
}