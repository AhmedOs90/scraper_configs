export default async function refine(rootUrl, product, page) {
    product.country = "Australia";

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const abv = await page.evaluate(() => {
        const rows = [...document.querySelectorAll("table tr")];
        for (const row of rows) {
            const label = row.cells[0]?.innerText?.trim();
            const value = row.cells[1]?.innerText?.trim();
            if (label === "Alcohol Content") return value;
        }
        return null;
    });

    const size = await page.evaluate(() => {
        const rows = [...document.querySelectorAll("table tr")];
        for (const row of rows) {
            const label = row.cells[0]?.innerText?.trim();
            const value = row.cells[1]?.innerText?.trim();
            if (label === "Size") return value;
        }
        return null;
    });

    product.abv = abv;

    product.extras = product.extras || {};
    product.extras.size = size;
    return product;
}