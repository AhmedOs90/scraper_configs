// services/refiners/sites/sansdrinks.com.au.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Australia';
    product.name = product.name.replace(' |  Sans Drinks  Australia  ', '').trim();
    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const nutrition = await page
        .evaluate(() => {
            const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();

            const valueFor = (...needles) => {
                const ths = Array.from(document.querySelectorAll('th'));
                const th = ths.find((el) => {
                    const t = normalize(el.textContent);
                    return needles.some((n) => t.includes(normalize(n)));
                });
                const tdText = th?.nextElementSibling?.textContent;
                return tdText ? tdText.replace(/\s+/g, ' ').trim() : null;
            };

            return {
                energy: valueFor('energy', 'calories'),
                sugar: valueFor('sugars', 'sugar', '- sugars'),
                abv: valueFor('abv'),
            };
        })
        .catch(() => ({ energy: null, sugar: null, abv: null }));

    product.energy = nutrition.energy;
    product.sugar = nutrition.sugar;
    product.abv = product.abv || nutrition.abv;

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
    return product;
}