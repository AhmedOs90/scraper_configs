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
        const el = document.querySelector("#tab-panel-1 li:nth-child(1) .sc-c047f47e-4");
        return el ? el.textContent.trim() : null;
    });

    product.abv = await page.evaluate(() => {
        const el = document.querySelector("#tab-panel-1 li:nth-child(4) .sc-c047f47e-2");
        return el ? el.textContent.replace(/\s+/g, "").trim() : null;
    });

    product.energy = await page.evaluate(() => {
        const el = document.querySelector("#tab-panel-4 tr:nth-child(1) td");
        return el ? el.textContent.trim() : null;
    });

    product.sugar = await page.evaluate(() => {
        const el = document.querySelector("#tab-panel-4 tr:nth-child(4) td p");
        return el ? el.textContent.trim() : null;
    });

    return product;
}