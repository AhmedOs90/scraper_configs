// services/refiners/sites/uhrskov-vine.dk.js
export default async function refine(rootUrl, product, page) {
    
    product.country = 'Denmark';
    product.currency = 'DKK';

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.price = product.price
        .replace('DKK  ', '')
        .replace(',', '.')
        .trim();

    product.images = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');

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
                        return Array.isArray(obj.image)
                            ? obj.image
                            : [obj.image];
                    }
                }
            } catch {}
        }

        return [];
    });

    product.abv = await page.evaluate(() => {
        const el = document.querySelector('div.attribute-table');
        if (!el) return '';

        const text = el.innerText;
        const match = text.match(/(?:^|[^\w])(\d+(?:[.,]\d+)?)\s*%(?=\s|$)/);

        if (!match) return '';

        const value = match[1].replace(',', '.');
        return value + '%';
    });

    return product;
}