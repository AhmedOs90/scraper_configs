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
        const brandEl = document.querySelector(
            '#product-detail-summary-module li p strong'
        );

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
    return product;
}