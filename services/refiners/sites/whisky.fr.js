// services/refiners/sites/whisky.fr.js
export default async function refine(rootUrl, product, page) {
    product.country = "France";
    product.currency = "EUR";

    product.name = product.name
        .replace(" - Etats Unis", "")
        .replace(" - Maison du Whisky", "")
        .trim();

    product.price = product.price.replace("€", "").trim();

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.producer = await page.evaluate(() => {
        const items = document.querySelectorAll('[id^="tab-panel-"] li');
        for (const li of items) {
            const label = li.querySelector(".sc-c047f47e-1")?.textContent?.replace(/\s+/g, " ").trim();
            if (label?.startsWith("Marque")) {
                return li.querySelector(".sc-c047f47e-4, .sc-c047f47e-2")?.textContent?.trim() || null;
            }
        }
        return null;
    });

    product.abv = await page.evaluate(() => {
        const items = document.querySelectorAll('[id^="tab-panel-"] li');
        for (const li of items) {
            const label = li.querySelector(".sc-c047f47e-1")?.textContent?.replace(/\s+/g, " ").trim();
            if (label?.startsWith("Degré")) {
                return li.querySelector(".sc-c047f47e-2")?.textContent?.replace(/\s+/g, "").trim() || null;
            }
        }
        return null;
    });

    product.energy = await page.evaluate(() => {
        const el = document.querySelector("#tab-panel-4 tr:nth-child(1) td");
        return el ? el.textContent.trim() : null;
    });

    product.sugar = await page.evaluate(() => {
        const el = document.querySelector("#tab-panel-4 tr:nth-child(4) td p");
        return el ? el.textContent.trim() : null;
    });

    product.extras = product.extras || {};

    product.extras.size = await page.evaluate(() => {
        const items = document.querySelectorAll('[id^="tab-panel-"] li');
        for (const li of items) {
            const label = li.querySelector(".sc-c047f47e-1")?.textContent?.replace(/\s+/g, " ").trim();
            if (label?.startsWith("Volume")) {
                return li.querySelector(".sc-c047f47e-2")?.textContent?.trim() || null;
            }
        }
        return null;
    });

    product.extras.ingredients = await page.evaluate(() => {
        const el = document.querySelector("#tab-panel-2 p");
        return el ? el.textContent.replace(/\s+/g, " ").trim() : null;
    });
    return product;
}