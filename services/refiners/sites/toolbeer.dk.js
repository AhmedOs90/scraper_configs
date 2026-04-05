// services/refiners/sites/toolbeer.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = "Denmark";
    product.producer = "To Øl";
    product.price = product.price.replace(",", ".").trim();

    product.extras ||= {};

    const info = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(".product__info-line"));

        const out = {
            abv: null,
            size: null,
            allergens: null,
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
            if (label === "size") out.size = value;
            if (label === "allergens") out.allergens = value;

            if (label.includes("nutrition facts per 100 ml")) {
                out.nutritionText = value;
            }
        }

        return out;
    }).catch(() => ({
        abv: null,
        size: null,
        allergens: null,
        nutritionText: null
    }));

    if (info.abv) {
        const abvMatch = info.abv.match(/(\d+(?:[.,]\d+)?)\s*%/);
        if (abvMatch) {
            product.abv = `${abvMatch[1].replace(",", ".")}%`;
        }
    }

    if (info.size) {
        product.extras.size = info.size;
    }

    if (info.allergens) {
        product.extras.allergens = info.allergens;
    }

    if (info.nutritionText) {
        const txt = info.nutritionText.replace(/\s+/g, " ").trim();

        const getVal = (regex, suffix = "g") => {
            const match = txt.match(regex);
            if (!match) return null;
            const lessThan = Boolean(match[1]);
            const val = match[2].replace(",", ".");
            return `${lessThan ? "<" : ""}${val} ${suffix}`;
        };

        const energyMatch = txt.match(
            /energy\s*(\d+(?:[.,]\d+)?)\s*kJ\s*\/\s*(\d+(?:[.,]\d+)?)\s*kcal/i
        );

        if (energyMatch) {
            product.energy = `${energyMatch[1].replace(",", ".")} kJ / ${energyMatch[2].replace(",", ".")} kcal`;
        }

        product.sugar = getVal(/sugars\s*(?:[:])?\s*(<\s*)?(\d+(?:[.,]\d+)?)\s*g/i);
        product.extras.fat = getVal(/fat\s*(?:[:])?\s*(<\s*)?(\d+(?:[.,]\d+)?)(?:\s*g)?/i);
        product.extras.carbohydrates = getVal(/carbohydrates\s*(?:[:])?\s*(<\s*)?(\d+(?:[.,]\d+)?)\s*g/i);
        product.extras.protein = getVal(/protein\s*(?:[:])?\s*(<\s*)?(\d+(?:[.,]\d+)?)\s*g/i);
        product.extras.salt = getVal(/salt\s*(?:[:])?\s*(<\s*)?(\d+(?:[.,]\d+)?)\s*g/i);
    }
    return product;
}