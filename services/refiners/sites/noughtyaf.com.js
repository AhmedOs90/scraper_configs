// services/refiners/sites/noughtyaf.com.js
export default async function refine(rootUrl, product, page) {
    product.producer = "Noughty";
    product.country = "UK";
    product.price = product.price.replace(/[^\d.]/g, "").trim();
    product.currency = "GBP";

    const description = await page.evaluate(() => {
        const blocks = document.querySelectorAll(".product-block .rte");
        if (!blocks.length) return null;

        const combined = Array.from(blocks)
            .map(el => el.innerText)
            .join(" ");

        return combined.replace(/\s+/g, " ").trim();
    }).catch(() => null);

    if (description) {
        const abvMatch = description.match(/alcohol[^:\d]*[:\s]*([\d.,]+)\s*%/i);
        const sugarMatch = description.match(/residual\s*sugar[^:\d]*[:\s]*([\d.,]+)\s*g\s*\/?\s*100ml/i);
        const energyMatch = description.match(/kcal[^:\d]*[:\s]*([\d.,]+)/i);

        if (abvMatch) product.abv = `${abvMatch[1]}%`;
        if (sugarMatch) product.sugar = `${sugarMatch[1]}g/100ml`;
        if (energyMatch) product.energy = `${energyMatch[1]} Kcal/100ml`;

        const lowerDesc = description.toLowerCase().replace(/\u00a0/g, " ");
        if (lowerDesc.includes("vegan")) product.vegan = "Vegan";
        if (lowerDesc.includes("gluten-free") || lowerDesc.includes("gluten free"))
            product.gluten_free = "Gluten free";
    }

    return product;
}