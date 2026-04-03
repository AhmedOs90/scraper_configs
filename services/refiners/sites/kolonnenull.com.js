// services/refiners/sites/kolonnenull.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "Germany";
    product.producer = "Kolonnenull";

    const out = await page.evaluate(() => {
        const norm = (s) =>
            String(s || "")
                .replace(/\u00a0|\u202f/g, " ")
                .replace(/\s+/g, " ")
                .trim();

        const rich =
            document.querySelector(".product-area__rich-text-block") ||
            document.querySelector(".product-area__rich-text-block .metafield-rich_text_field") ||
            document.querySelector(".product-detail__gap-sm.rte");

        const richText = norm(rich?.innerText || rich?.textContent || "").toLowerCase();
        const hasVegan = /\bvegan\b/.test(richText);
        const hasGlutenFree =
            /\bglutenfrei\b/.test(richText) ||
            /\bgluten\s*-\s*free\b/.test(richText) ||
            /\bgluten\s*free\b/.test(richText) ||
            /\bglutenfree\b/.test(richText);

        const data = {};
        const rows = Array.from(document.querySelectorAll(".product-detail-accordion table tr, table tr"));

        for (const row of rows) {
            const cells = row.querySelectorAll("td,th");
            if (cells.length < 2) continue;

            const label = norm(cells[0]?.innerText || cells[0]?.textContent || "").toLowerCase();
            let value = norm(cells[1]?.innerText || cells[1]?.textContent || "");

            if (label.includes("zutaten")) data.ingredients = value.replace(/\n+/g, " ");
            else if (label.includes("nährwertangaben")) data.nutritionLine = value;
            else if (label.includes("allergene")) data.allergens = value;
            else if (label.includes("säuregehalt") || label.includes("saeuregehalt")) data.acidity = value;
        }

        return { hasVegan, hasGlutenFree, ...data };
    }).catch(() => ({ hasVegan: false, hasGlutenFree: false }));

    if (!product.vegan && out.hasVegan) product.vegan = "vegan";
    if (!product.gluten_free && out.hasGlutenFree) product.gluten_free = "glutenfree";

    if (product.description) {
        product.description = String(product.description).replace(/\n+/g, " ");
    }

    product.extras ||= {};
    if (!product.extras.ingredients && out.ingredients) product.extras.ingredients = out.ingredients;
    if (!product.extras.allergens && out.allergens) product.extras.allergens = out.allergens;
    if (!product.extras.acidity && out.acidity) product.extras.acidity = out.acidity;

    const line = String(out.nutritionLine || "").replace(/\s+/g, " ").trim();
    if (line) {
        const kjKcal =
            line.match(/Brennwert\s*([0-9]+(?:[.,][0-9]+)?)\s*kJ\s*\/\s*([0-9]+(?:[.,][0-9]+)?)\s*kcal/i) ||
            line.match(/Brennwert\s*([0-9]+(?:[.,][0-9]+)?)\s*kcal\s*\/\s*([0-9]+(?:[.,][0-9]+)?)\s*kJ/i);

        if (!product.energy && kjKcal) {
            const a = kjKcal[1].replace(",", ".");
            const b = kjKcal[2].replace(",", ".");
            product.energy = /kJ\s*\/\s*\d/i.test(kjKcal[0]) ? `${b} kcal/${a} kJ` : `${a} kcal/${b} kJ`;
        }

        const carbsMatch = line.match(/\bKohlenhydrate\s*([0-9]+(?:[.,][0-9]+)?)\s*g/i);
        if (!product.extras.carbohydrates && carbsMatch?.[1]) {
            product.extras.carbohydrates = `${carbsMatch[1].replace(",", ".")} g`;
        }

        const sugarMatch =
            line.match(/\(.*?davon\s*([0-9]+(?:[.,][0-9]+)?)\s*g\s*Zucker.*?\)/i) ||
            line.match(/\bZucker\s*([0-9]+(?:[.,][0-9]+)?)\s*g/i);

        if (!product.sugar && sugarMatch?.[1]) {
            product.sugar = `${sugarMatch[1].replace(",", ".")} g`;
        }
    }
    return product;
}