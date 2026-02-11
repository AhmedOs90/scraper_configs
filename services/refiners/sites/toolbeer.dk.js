// services/refiners/sites/toolbeer.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = "Denmark";
    product.producer = "To Øl";
    product.price = product.price.replace(",", ".").trim();

    const info = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(".product__info-line"));

        const out = {
            abv: null,
            nutritionText: null
        };

        for (const row of rows) {
            const label = row
                .querySelector(".product__info-line_label")
                ?.textContent?.trim()
                ?.toLowerCase();

            const value =
                row.querySelector(".product__info-line_content")?.textContent?.trim() ||
                null;

            if (!label || !value) continue;

            if (label === "abv") out.abv = value;

            if (label.includes("nutrition facts per 100 ml")) {
                out.nutritionText = value;
            }
        }

        return out;
    }).catch(() => ({ abv: null, nutritionText: null }));

    if (info.abv) {
        const abvMatch = info.abv.match(/(\d+(?:[.,]\d+)?)\s*%/);
        if (abvMatch) {
            product.abv = `${abvMatch[1].replace(",", ".")}%`;
        }
    }

    if (info.nutritionText) {
        const txt = info.nutritionText.replace(/\s+/g, " ").trim();

        const kcalMatch = txt.match(/(\d+(?:[.,]\d+)?)\s*kcal/i);
        const kjMatch = txt.match(/(\d+(?:[.,]\d+)?)\s*kJ/i);

        if (kcalMatch) {
            product.energy = `${kcalMatch[1].replace(",", ".")} kcal`;
        } else if (kjMatch) {
            product.energy = `${kjMatch[1].replace(",", ".")} kJ`;
        }

        const sugarMatch = txt.match(
            /sugars?\s*(?:[:])?\s*(<\s*)?(\d+(?:[.,]\d+)?)\s*g/i
        );

        if (sugarMatch) {
            const lessThan = Boolean(sugarMatch[1]);
            const val = sugarMatch[2].replace(",", ".");
            product.sugar = `${lessThan ? "<" : ""}${val} g`;
        }
    }

    return product;
}