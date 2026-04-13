// services/refiners/sites/sansdrinks.com.au.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Australia';
    product.name = product.name.replace(' |  Sans Drinks  Australia  ', '').trim();
    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    product.producer = await page
        .evaluate(() => {
            const scripts = Array.from(
                document.querySelectorAll('script[type="application/ld+json"]')
            );

            const tryParse = (txt) => {
                try {
                    return JSON.parse(txt);
                } catch {
                    return null;
                }
            };

            const nodes = scripts
                .map((s) => tryParse(s.textContent || s.innerText || ''))
                .filter(Boolean)
                .flatMap((j) => (Array.isArray(j) ? j : [j]));

            const productLd = nodes.find((j) => {
                const t = j?.['@type'];
                return t === 'Product' || (Array.isArray(t) && t.includes('Product'));
            });

            const b = productLd?.brand;

            if (typeof b === 'string') {
                return b.trim() || null;
            }

            if (b && typeof b === 'object') {
                return (b.name || b.legalName || '').toString().trim() || null;
            }

            return null;
        })
        .catch(() => null);

    const facts = await page
        .evaluate(() => {
            const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();

            const valueFor = (...needles) => {
                const ths = Array.from(document.querySelectorAll('th'));
                const th = ths.find((el) => {
                    const t = normalize(el.textContent);
                    return needles.some((n) => t.includes(normalize(n)));
                });
                const next = th?.nextElementSibling?.textContent;
                return next ? next.replace(/\s+/g, ' ').trim() : null;
            };

            return {
                energy: valueFor('energy', 'calories'),
                sugar: valueFor('sugars', 'sugar', '- sugars'),
                abv: valueFor('abv'),
                protein: valueFor('protein'),
                fat: valueFor('fat total', 'fat'),
                carbohydrates: valueFor('carbohydrates', 'carbs'),
                sodium: valueFor('sodium'),
                contains_sulphites: valueFor('contains sulphites'),
            };
        })
        .catch(() => ({
            energy: null,
            sugar: null,
            abv: null,
            protein: null,
            fat: null,
            carbohydrates: null,
            sodium: null,
            contains_sulphites: null,
        }));

    product.energy = facts.energy;
    product.sugar = facts.sugar;
    product.abv = product.abv || facts.abv;

    product.extras = {
        ...(product.extras || {}),
        protein: facts.protein,
        fat: facts.fat,
        carbohydrates: facts.carbohydrates,
        sodium: facts.sodium,
        contains_sulphites: facts.contains_sulphites,
    };

    const desc = product.description.toLowerCase();

    if (desc.includes('vegan')) {
        product.vegan = 'Vegan';
    }

    if (desc.includes('gluten')) {
        product.gluten_free = 'Gluten free';
    }
    return product;
}