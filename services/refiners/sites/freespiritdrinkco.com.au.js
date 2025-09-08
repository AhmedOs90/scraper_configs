// services/refiners/sites/freespiritdrinkco.com.au.js
export default async function refine(rootUrl, product, page) {
    // Description
    const html = await page.evaluate(() => {
        for (const s of document.querySelectorAll("script[type='application/json']")) {
        try {
            const p = JSON.parse(s.textContent)?.product;
            if (p?.content || p?.description) return p.content || p.description;
        } catch {}
        }
        return null;
    });

    if (html) {
        product.description = await page.evaluate(h => {
        const div = document.createElement('div');
        div.innerHTML = h;
        return (div.textContent || '').replace(/\s+/g, ' ').trim();
        }, html);
    }

    const text = (product.description || '').toLowerCase();

    // Abv
    if (product.abv) {
        if (product.abv.includes(' ABV')) product.abv = product.abv.replace(' ABV', '');
    }

    // Vegan
    if (!product.vegan) {
        if (/\bvegan\b/.test(text) && !/\bnon-?vegan\b/.test(text)) product.vegan = 'Vegan';
    }

    // Gluten-free
    if (!product.gluten_free) {
        if (/\bgluten[\s-]?free\b/.test(text) && !/\bcontains gluten\b/.test(text)) product.gluten_free = 'Gluten Free';
    }

    // Sugar
    if (!product.sugar) {
        // Phrases
        if (/\b(sugar[-\s]?free|zero\s+sugar|no\s+added\s+sugar)\b/.test(text)) {
        product.sugar = '0 g';
        } else {
        // Numeric (e.g., "3.2 g sugar", "sugars 2 g per 100ml")
        const m = text.match(/(\d+(?:\.\d+)?)\s*g(?:\s*of)?\s*(?:sugars?|sugar)\b(?:[^a-z]|$)/i);
        if (m) product.sugar = `${m[1]} g`;
        }
    }

    // Energy
    if (!product.energy) {
        // kcal / cal
        const kcal = text.match(/(\d+(?:\.\d+)?)\s*(?:kcal|cal(?:ories?)?)\b(?:.*?\b(per|\/)\s*(?:100\s*ml|100ml|serve|serving))?/i);
        // kJ
        const kJ = text.match(/(\d+(?:\.\d+)?)\s*(?:kj|kJ)\b(?:.*?\b(per|\/)\s*(?:100\s*ml|100ml|serve|serving))?/i);
        if (kcal) {
        product.energy = `${kcal[1]} kcal`;
        } else if (kJ) {
        product.energy = `${kJ[1]} kJ`;
        }
    }

    return product;
}
