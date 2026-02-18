// services/refiners/sites/alcoholfreedrinks.co.uk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'UK';

    const brand = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const s of scripts) {
            const txt = s.textContent && s.textContent.trim();
            if (!txt) continue;

            try {
                const data = JSON.parse(txt);
                const items = Array.isArray(data) ? data : [data];

                for (const it of items) {
                    if (it && it['@type'] === 'Product' && it.brand && it.brand.name) {
                        return it.brand.name;
                    }
                }
            } catch {}
        }
        return null;
    });

    if (brand) product.producer = brand;

    const facts = await page.evaluate(() => {
        const out = {};
        const rows = document.querySelectorAll('.product__facts > div');

        for (const row of rows) {
            const key = row.querySelector('strong')?.textContent?.trim();
            const val = row.querySelector('span')?.textContent?.trim();
            if (!key || !val) continue;

            if (key === 'ABV') out.abv = val;
            if (key === 'Calories') out.energy = val;
            if (key === 'Sugar') out.sugar = val;
            if (key === 'Vegan' && val.toLowerCase() === 'yes') out.vegan = true;
            if (key === 'Gluten-Free' && val.toLowerCase() === 'yes') out.glutenFree = true;
        }

        return out;
    });

    if (facts.abv) product.abv = facts.abv;
    if (facts.energy) product.energy = facts.energy;
    if (facts.sugar) product.sugar = facts.sugar;
    if (facts.vegan) product.vegan = 'Vegan';
    if (facts.glutenFree) product.gluten_free = 'Gluten free';
    return product;
}