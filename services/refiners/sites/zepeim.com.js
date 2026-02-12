// services/refiners/sites/zepeim.com.js
export default async function refine(rootUrl, product, page) {
    const details = await page.evaluate(() => {
        const items = document.querySelectorAll(".productView-description-tabContent ul li");
        const result = {};

        for (let item of items) {
            const text = item.textContent?.trim();
            if (!text) continue;
            const lower = text.toLowerCase();

            if (lower.startsWith("alcohol content")) {
                const match = text.match(/Alcohol Content:\s*(.+)/i);
                result.abv = match ? match[1].trim() : text;
            }

            if (lower.startsWith("sugar")) {
                const match = text.match(/Sugar:\s*(.+)/i);
                result.sugar = match ? match[1].trim() : text;
            }

            if (lower.startsWith("calories")) {
                const match = text.match(/Calories:\s*(.+)/i);
                result.energy = match ? match[1].trim() : text;
            }

            if (lower.includes("gluten-free")) {
                result.gluten_free = lower.includes("yes") ? "Gluten free" : null;
            }

            if (lower.includes("vegan")) {
                result.vegan = lower.includes("yes") ? "Vegan" : null;
            }
        }

        return result;
    }).catch(() => ({}));

    if (details.abv) product.abv = details.abv;
    if (details.sugar) product.sugar = details.sugar;
    if (details.energy) product.energy = details.energy;
    if (details.gluten_free) product.gluten_free = details.gluten_free;
    if (details.vegan) product.vegan = details.vegan;

    if (product.producer) {
        const parts = product.producer.split(" - ").map(s => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
            product.producer = parts[0];
            product.country = parts.slice(1).join(" - ");
        }
    }

    if (product.name) {
        let rawName = product.name;
        rawName = rawName.replace(/-\s*Zepeim$/i, "").trim();
        rawName = rawName.replace(/\((?:Case|Pack)[^)]+\)/gi, "").trim();
        rawName = rawName.replace(/N°\s*/g, "No. ");
        rawName = rawName.replace(/\s{2,}/g, " ").trim();

        product.name = rawName;
    }

    if (product.price) {
        let rawPrice = product.price;

        rawPrice = rawPrice.replace(/\/\s*Bottle/i, "").trim();

        const match = rawPrice.match(/^([^\d\s]+)/);
        if (match) {
            product.currency = match[1]; // e.g., "$", "€", "£"
            rawPrice = rawPrice.replace(match[1], "").trim();
        }

        product.price = rawPrice;
    }
    return product;
}