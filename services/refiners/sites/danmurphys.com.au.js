// services/refiners/sites/danmurphys.com.au.js
export default async function refine(rootUrl, product, page) {

    const info = await page.evaluate(() => {
        try {
        const script = document.querySelector('script[type="application/ld+json"]');
        if (!script) return null;
        const data = JSON.parse(script.textContent);
        return {
            price: data.offers?.price || null,
            currency: data.offers?.priceCurrency || null
        };
        } catch {
        return null;
        }
    });

    if (info) {
        product.price = info.price;
        product.currency = info.currency;
    }

    product.abv = await page.$$eval(
        '.mat-expansion-panel-body .product-attribute__item, .product-attribute__item',
        (items) => {
        const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
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