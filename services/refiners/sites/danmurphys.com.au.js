// services/refiners/sites/danmurphys.com.au.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Australia';
    product.currency = 'AUD';
    product.price = product.price?.replace('$', '').trim();
    product.description = product.description
        ?.replace(/<[^>]*>/g, ' ')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    await page.waitForSelector('.product-skeleton__details-description', { timeout: 10000 }).catch(() => {});

    const attrs = await page.$$eval(
        '.mat-expansion-panel-body .product-attribute__item, .product-attribute__item',
        (items) => {
            const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const slug = (s) =>
                norm(s)
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '_')
                    .replace(/^_+|_+$/g, '');

            const isAbvKey = (key) => {
                const k = norm(key).toLowerCase();
                return (
                    /^(alcohol\s*volume|alc\.?\s*vol\.?|abv)$/.test(k) ||
                    k.includes('alcohol volume') ||
                    k.includes('abv')
                );
            };

            const extras = {};
            let abv = null;

            for (const li of items) {
                const keyEl = li.querySelector('.product-attribute__item-key');
                const valEl = li.querySelector('.product-attribute__item-value');

                const rawKey = norm(keyEl?.textContent);
                const rawVal = norm(valEl?.textContent);

                if (!rawKey || !rawVal) continue;

                if (isAbvKey(rawKey)) {
                    abv = rawVal;
                    continue;
                }

                extras[slug(rawKey)] = rawVal;
            }

            return { abv, extras };
        }
    ).catch(() => ({ abv: null, extras: {} }));

    product.abv = attrs.abv;
    product.extras = {
        ...(product.extras || {}),
        ...attrs.extras,
    };
    return product;
}