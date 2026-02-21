// services/refiners/sites/nirvanabrewery.com.js

export default async function refine(rootUrl, product, page) {
    // Currency is always GBP
    product.currency = "GBP";

    // Country is always United Kingdom (site + brewery)
    if (!product.country) {
        product.country = "United Kingdom";
    }

    // Producer is always Nirvana Brewery
    if (!product.producer) {
        product.producer = "Nirvana Brewery";
    }

    // Extract ABV from title or description
    if (!product.abv) {
        const abvSource = `${product.name || ""} ${product.description || ""}`;
        const abvMatch = abvSource.match(/(\d+\.?\d*)\s*%\s*(ABV|abv|vol)?/i);
        if (abvMatch) {
            product.abv = `${abvMatch[1]}% ABV`;
        }
    }

    // Try extracting description from accordion if missing
    if (!product.description || product.description.length < 20) {
        const desc = await page.evaluate(() => {
            // Try accordion first
            const accordion = document.querySelector(
                ".accordion-details, details .accordion__content"
            );
            if (accordion) {
                const text = accordion.textContent.trim();
                if (text.length > 20) return text;
            }
            // Fallback to product description div
            const descDiv = document.querySelector(".product__description");
            return descDiv ? descDiv.textContent.trim() : null;
        });
        if (desc && desc.length > 20) {
            product.description = desc;
        }
    }

    // Clean up description
    if (product.description) {
        product.description = product.description
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    // Nutrition hints (if present in description)
    // Examples: "Energy: 20kcal" / "Energy 85 kJ" / "Sugars 0.0g"
    const blob = `${product.name || ""} ${product.description || ""}`;
    if (!product.energy) {
        const m = blob.match(/\b(energy|energi|calories|kcal)\b[^0-9]{0,20}([\d]+(?:[.,]\d+)?)\s*(kcal|kj)?/i);
        if (m) {
            const num = m[2].replace(',', '.');
            const unit = (m[3] || (m[1].toLowerCase().includes('kj') ? 'kJ' : 'kcal')).toLowerCase() === 'kj' ? 'kJ' : 'kcal';
            product.energy = `${num} ${unit}`;
        }
    }
    if (!product.sugar) {
        const m = blob.match(/\b(sugar|sugars)\b[^0-9]{0,20}([\d]+(?:[.,]\d+)?)\s*g\b/i);
        if (m) product.sugar = `${m[2].replace(',', '.')} g`;
    }

    return product;
}
