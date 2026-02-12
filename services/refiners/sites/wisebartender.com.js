// services/refiners/sites/wisebartender.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'UK';
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
        
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();

    const brand = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const n of nodes) {
            try {
                const data = JSON.parse(n.textContent || 'null');
                const arr = Array.isArray(data) ? data : [data];
                for (const obj of arr) {
                    if (obj && obj['@type'] === 'Product' && obj.brand) {
                        if (typeof obj.brand === 'string') return obj.brand;
                        if (obj.brand && typeof obj.brand.name === 'string') return obj.brand.name;
                    }
                }
            } catch (_) {}
        }
        return null;
    });
    if (brand) product.producer = brand;

    if (!product.producer && product.name) {
        const name = norm(product.name);
        const guess =
            (name.match(/^([^'‘’"]+?)\s*['‘”]/)?.[1] ||
                name.match(/^(.+?)(?:\s+Alcohol\b|\s+Non[- ]Alcohol|\s+\(\d*\.?\d*%?\s*ABV\)|\s+0(?:\.0)?\s*ABV)/i)?.[1])?.trim();
        if (guess && guess.length >= 2 && guess.length <= 60) product.producer = norm(guess);
    }

    if (product.name && !product.abv) {
        const m = product.name.match(/(\d+(?:\.\d+)?)\s*ABV\b/i) || product.name.match(/\b(0(?:\.0)?)\s*ABV\b/i);
        if (m) product.abv = `${m[1]} ABV`;
    }

    const extracted = await page.evaluate(() => {
        const txt = (document.body.innerText || '').toLowerCase();

        const result = {
            vegan: /(^|\b)vegan( friendly)?(\b|$)/i.test(txt),
            glutenFree: /gluten\s*free/i.test(txt),
            energy: null,
            sugars: null
        };

        const rows = document.querySelectorAll('.tfv1-table[data-table-name="Nutrition"] .tfv1-tr');
        for (const row of rows) {
            const label = row.querySelector('.tfv1-label .tfv1-data')?.innerText?.trim().toLowerCase();
            const value = row.querySelector('.tfv1-value .tfv1-data span')?.innerText?.trim().toLowerCase();
            if (!label || !value) continue;

            if (!result.energy && label.includes('energy')) {
                const match = value.match(/([0-9]+(?:\.[0-9]+)?)\s*kcal/i);
                if (match) result.energy = `${match[1]} kcal`;
                continue;
            }

            if (!result.sugars && /carbohydrate/i.test(label) && /sugar/i.test(label)) {
                const match = value.match(/\(([\d.]+)\s*g\)/i);
                if (match) result.sugars = `${match[1]} g`;
            }

            if (result.energy && result.sugars) break;
        }

        return result;
    });

    if (extracted.vegan) product.vegan = 'Vegan';
    if (extracted.glutenFree) product.gluten_free = 'Gluten free';
    if (extracted.energy) product.energy = extracted.energy;
    if (extracted.sugars) product.sugar = extracted.sugars;

    return product;
}