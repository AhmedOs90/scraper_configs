// services/refiners/sites/wineformothers.com.js
export default async function refine(rootUrl, product, page) {

    const text = await page.evaluate(() => {
        const getTxt = (el) => (el?.innerText || el?.textContent || "").trim();
        const block = document.querySelector("#tab-description");
        return block ? getTxt(block) : getTxt(document.body);
    }).catch(() => "");

    if (!text) return product;

    const norm = text
        .normalize("NFKC")
        .replace(/\s+/g, " ")
        .trim();
    const lower = norm.toLowerCase();

    // 1) Vegan
    if (/\bvegan\b/i.test(lower)) {
        product.vegan = "Vegan";
    }

    // 2) Gluten free (any mention of "gluten")
    if (/\bgluten\b/i.test(lower)) {
        product.gluten_free = "Gluten free";
    }

    // 3) Energy (e.g., "19 calories per 100ml", "19 kcal/100 ml", "19 kcal")
    {
        let m =
        norm.match(/(\d+(?:\.\d+)?)\s*(kcal|calories?)\s*(?:per|\/)\s*100\s*(?:ml|g)/i) ||
        norm.match(/(\d+(?:\.\d+)?)\s*(?:per|\/)\s*100\s*(?:ml|g)\s*(kcal|calories?)/i) ||
        norm.match(/(\d+(?:\.\d+)?)\s*(kcal|calories?)/i);

        if (m) {
            const val = m[1];
            const unit = /kcal/i.test(m[2] || "") ? "kcal" : "calories";
            const per100 = /(?:per|\/)\s*100/i.test(m[0]) ? " / 100ml" : "";
            product.energy = val;
        }
    }

    // 4) Sugar (e.g., "4g of sugar", "sugar 4 g/100ml", "4 grams sugar", etc.)
    {
        let m =
        norm.match(/(\d+(?:\.\d+)?)\s*(g|gram|grams)\s*(?:of\s*)?sugars?\s*(?:per|\/)\s*100\s*(?:ml|g)?/i) ||
        norm.match(/sugars?[^0-9]{0,15}(\d+(?:\.\d+)?)\s*(g|gram|grams)\s*(?:per|\/)\s*100\s*(?:ml|g)?/i) ||
        norm.match(/(\d+(?:\.\d+)?)\s*(g|gram|grams)\s*(?:of\s*)?sugars?/i) ||
        norm.match(/sugars?[^0-9]{0,15}(\d+(?:\.\d+)?)\s*(g|gram|grams)/i);

        if (m) {
            const val = m[1];
            const per100 = /(?:per|\/)\s*100/i.test(m[0]) ? " / 100ml" : "";
            product.sugar = val;
        }
    }

    return product;
}
