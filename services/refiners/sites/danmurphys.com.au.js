export default async function refine(rootUrl, product, page) {
    product.country = 'Australia';
    product.currency = 'AUD';
    product.price = product.price?.replace('$', '').trim();
    product.description = product.description
        ?.replace(/<[^>]*>/g, ' ')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    product.abv = await page.$$eval(
        '.mat-expansion-panel-body .product-attribute__item, .product-attribute__item',
        (items) => {
            const norm = (s) =>
                (s || '').replace(/\s+/g, ' ').trim().toLowerCase();

            for (const li of items) {
                const keyEl = li.querySelector('.product-attribute__item-key');
                const valEl = li.querySelector('.product-attribute__item-value');

                const key = norm(keyEl?.textContent);
                if (!key) continue;

                if (
                    /^(alcohol\s*volume|alc\.?\s*vol\.?|abv)$/.test(key) ||
                    key.includes('alcohol volume') ||
                    key.includes('abv')
                ) {
                    const val = valEl?.textContent?.trim() || null;
                    if (val) return val;
                }
            }

            return null;
        }
    ).catch(() => null);
    return product;
}