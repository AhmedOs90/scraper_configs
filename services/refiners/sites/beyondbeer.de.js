// services/refiners/sites/beyondbeer.de.js
export default async function refine(rootUrl, product, page) {
    product.abv = await page.evaluate(() => {
        const rows = document.querySelectorAll("table.product-detail-properties-table tr.properties-row");
        for (let row of rows) {
            const label = row.querySelector("th.properties-label")?.textContent?.trim().toLowerCase();
            const value = row.querySelector("td.properties-value")?.textContent?.trim();

            if (label && label.includes("alkoholgehalt")) {
                return value.replace(',', '.').replace(' %', '%').trim() || null;
            }
        }
        return null;
    }).catch(() => null);

    product.energy = await page.evaluate(() => {
        const rows = document.querySelectorAll("table.sw-text-editor-table tr");
        for (let row of rows) {
            const cols = row.querySelectorAll("td");
            if (cols.length < 2) continue;

            const label = cols[0].textContent?.trim().toLowerCase();
            const value = cols[1].textContent?.trim();

            if (label && label.includes("brennwert")) {
                return value || null;
            }
        }
        return null;
    }).catch(() => null);

    product.sugar = await page.evaluate(() => {
        const rows = document.querySelectorAll("table.sw-text-editor-table tr");
        for (let row of rows) {
            const cols = row.querySelectorAll("td");
            if (cols.length < 2) continue;

            const label = cols[0].textContent?.trim().toLowerCase();
            const value = cols[1].textContent?.trim();

            if (label && label.includes("zucker")) {
                return value || null;
            }
        }
        return null;
    }).catch(() => null);
    return product;
}