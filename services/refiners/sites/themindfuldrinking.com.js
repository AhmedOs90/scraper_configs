// services/refiners/sites/themindfuldrinking.com.js
export default async function refine(rootUrl, product, page) {
    if (product.description) {
        product.description = product.description
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    const nutrition = await page.evaluate(() => {
        const result = {};
        document.querySelectorAll(".info-table tr").forEach(row => {
            const th = row.querySelector("th");
            const td = row.querySelector("td");
            if (!th || !td) return;
            const label = th.textContent.toLowerCase();
            if (label.includes("calories")) result.energy = td.textContent.trim();
            if (label.includes("sugar")) result.sugar = td.textContent.trim();
        });
        return result;
    }).catch(() => ({}));

    product.energy = nutrition.energy || null;
    product.sugar = nutrition.sugar || null;
    return product;
}