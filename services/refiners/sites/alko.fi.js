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
            sugar: getValue("Sugars"),
            energy: getValue("Energy"),
            producer: getValue("Producer"),
        };
    });

    if (price) product.price = parseFloat(price);
    if (extra.sugar) product.sugar = extra.sugar;
    if (extra.energy) product.energy = extra.energy;
    if (extra.producer) product.producer = extra.producer;
    return product;
}