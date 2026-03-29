// services/refiners/sites/inn-express.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'UK';
    product.currency = 'GBP';
    product.price = product.price
        .replace('£', '')
        .trim();

    product.images = await page.evaluate(() => {
        const scripts = document.querySelectorAll(
            'script[type="application/ld+json"]'
        );

        for (const s of scripts) {
            try {
                const json = JSON.parse(s.textContent);

                const candidates = json['@graph'] ?? [json];

                for (const obj of candidates) {
                    const type = obj['@type'];
                    const isProduct =
                        type === 'Product' ||
                        (Array.isArray(type) && type.includes('Product'));

                    if (isProduct && obj.image) {
                        if (Array.isArray(obj.image)) {
                            return obj.image;
                        }

                        if (typeof obj.image === 'string') {
                            return [obj.image];
                        }

                        if (typeof obj.image === 'object' && obj.image.url) {
                            return [obj.image.url];
                        }
                    }
                }
            } catch {}
        }

        return [];
    });

    product.producer = await page.evaluate(() => {
        const items = document.querySelectorAll(
            '#product-detail-summary-module li p'
        );

        for (const p of items) {
            const text = p.textContent.trim();

            if (text.startsWith('Brand:')) {
                return text.replace('Brand:', '').trim();
            }
        }

        return null;
    });

    product.abv = await page.evaluate(() => {
        const items = document.querySelectorAll(
            '#product-detail-summary-module li p'
        );

        for (const p of items) {
            const text = p.textContent.trim();

            if (text.startsWith('ABV:')) {
                return text.replace('ABV:', '').trim();
            }
        }

        return null;
    });

    product.extras = product.extras || {};

    product.extras.size = await page.evaluate(() => {
        const items = document.querySelectorAll(
            '#product-detail-summary-module li p'
        );

        for (const p of items) {
            const text = p.textContent.trim();

            if (text.startsWith('Container Size:')) {
                return text.replace('Container Size:', '').trim();
            }
        }

        return null;
    });

    product.size = product.size || {};

    product.size.allergens = await page.evaluate(() => {
        const rows = document.querySelectorAll(
            '#allergens table.product-allergen-table tbody tr'
        );

        const allergens = {};

        for (const row of rows) {
            const key = row.querySelector('th')?.textContent.trim();
            const value = row.querySelector('td')?.textContent.trim();

            if (key) {
                allergens[key] = value;
            }
        }

        return allergens;
    });
    return product;
}