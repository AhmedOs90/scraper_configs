// services/refiners/sites/decantalo.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';
    product.price = product.price.replace(/[^0-9.]/g, '');
    
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const details = await page.$$eval('.product-features__item', (items) => {
        const out = {};
        for (const item of items) {
            const nameEl = item.querySelector('.product-features__item__name');
            const valueEl = item.querySelector('.product-features__item__value b');
            const name = nameEl?.textContent?.trim();
            const value = valueEl?.textContent?.trim();
            if (name) out[name] = value ?? '';
        }
        return out;
    }).catch(() => ({}));

    if (details['Winery']) {
        product.producer = details['Winery'];
    }

    const abvIsNull =
        product.abv === null || product.abv === undefined || product.abv === '';

    if (details['Alcohol'] === 'Alcohol free' && abvIsNull) {
        product.abv = '<0.5%';
    }

    return product;
}
