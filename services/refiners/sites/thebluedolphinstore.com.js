// services/refiners/sites/thebluedolphinstore.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "Spain";
    product.currency = "EUR";

    product.price = product.price
        .replace("€", "")
        .replace(",", ".")
        .trim();

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const abvMatch = product.description.match(
        /graduación\s*:\s*([\d.,]+)\s*%/i
    );

    if (abvMatch) {
        product.abv = abvMatch[1].replace(",", ".") + "%";
    }

    const sizeMatch = product.description.match(
        /volumen:\s*([\d.,]+\s*cl)/i
    );

    if (sizeMatch) {
        product.extras = product.extras || {};
        product.extras.size = sizeMatch[1].trim();
    }

    // nutrition (from tab)
    const nutritionText = await page.evaluate(() => {
        const el = document.querySelector("#tab-description");
        return el ? el.textContent : "";
    });

    const extract = (regex) => {
        const m = nutritionText.match(regex);
        return m ? m[1].replace(",", ".").trim() : null;
    };

    product.energy = extract(/calor[ií]as:\s*([\d.,]+\s*kcal)/i);
    product.sugar = extract(/az[úu]cares:\s*([\d.,]+\s*g)/i);

    product.extras = product.extras || {};

    product.extras.protein = extract(/prote[ií]nas:\s*([\d.,]+\s*g)/i);
    product.extras.fat = extract(/grasa:\s*([\d.,]+\s*g)/i);
    product.extras.salt = extract(/sal:\s*([\d.,]+\s*g)/i);
    product.extras.carbohydrates = extract(/hidratos\s+de\s+carbono:\s*([\d.,]+\s*g)/i);
    return product;
}