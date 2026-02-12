// services/refiners/sites/thealcoholfreeco.co.uk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'UK';

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const info = await page.$eval('.product-info__liquid', el =>
        el.innerText.replace(/\s+/g, ' ').trim()
    );

    const abvMatch = info.match(/(\d+(?:\.\d+)?)\s*%\s*abv/i);
    if (abvMatch) {
        product.abv = abvMatch[1];
    }

    if (/vegan/i.test(info)) {
        product.vegan = 'Vegan';
    }

    if (/gluten/i.test(info)) {
        product.gluten_free = 'Gluten free';
    }

    const producer = await page.$$eval('script[type="application/ld+json"]', scripts => {
        for (const s of scripts) {
            const text = (s.textContent || '').trim();
            if (!text) continue;

            try {
                const data = JSON.parse(text);
                const items = Array.isArray(data) ? data : [data];

                for (const item of items) {
                    const brandName = item?.brand?.name;
                    if (brandName) {
                        return brandName;
                    }
                }
            } catch (e) {
                continue;
            }
        }
        return null;
    });

    if (producer) {
        product.producer = producer;
    }
    return product;
}