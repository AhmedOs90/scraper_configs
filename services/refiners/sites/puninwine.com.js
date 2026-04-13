// services/refiners/sites/puninwine.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Cyprus';
    product.price = product.price.replace(',', '.').trim();
    product.name = product.name.replace(' |  Sans Drinks  Australia  ', '').trim();
    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const details = await page.evaluate(() => {
        const out = {
            abv: null,
            extras: {
                sweetness: null,
                grape: null,
                serving_temperature: null,
                size: null,
                color: null,
            },
        };

        const items = [...document.querySelectorAll('li[class*="ai-product-details__item"]')];

        const map = {};
        for (const item of items) {
            const label = item.querySelector('p[class*="ai-product-details__label"]')?.textContent?.trim();
            const value = item.querySelector('p[class*="ai-product-details__value"]')?.textContent?.trim();

            if (label && value) {
                map[label.toLowerCase()] = value;
            }
        }

        out.abv = map.strength || null;
        out.extras.sweetness = map.sweetness || null;
        out.extras.grape = map['wine grape'] || null;
        out.extras.serving_temperature = map['serving temperature'] || null;
        out.extras.size = map.volume || null;
        out.extras.color = map.color || null;

        return out;
    });

    product.abv = details.abv;
    product.extras = {
        ...product.extras,
        ...details.extras,
    };
    return product;
}