// services/refiners/sites/kolonnenull.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "Germany";
    product.price = (product.price || "").replace(",", ".").trim();
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    product.name = product.name
        .replace(' - KOLONNE NULL', '')
        .trim();

    const text = product.producer || "";

    const abvMatch = text.match(/(\d+(?:[.,]\d+)?)\s*%?\s*vol/i);
    if (abvMatch) {
        product.abv = `${abvMatch[1].replace(",", ".")} % vol`;
    }

    const energyMatch = text.match(/(\d+(?:[.,]\d+)?)\s*kcal/i);
    if (energyMatch) {
        product.energy = `${energyMatch[1].replace(",", ".")} kcal`;
    }

    const sugarMatch = text.match(/(?:Zucker|sugars?)\s+(\d+(?:[.,]\d+)?)\s*g/i);
    if (sugarMatch) {
        product.sugar = `${sugarMatch[1].replace(",", ".")} g`;
    }

    product.producer = null;
    return product;
}