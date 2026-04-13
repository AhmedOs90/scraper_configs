// services/refiners/sites/uhrskov-vine.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';
    product.extras = product.extras || {};

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.price = product.price
        .replace('DKK  ', '')
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
                        return Array.isArray(obj.image) ? obj.image : [obj.image];
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

        return match[1].replace(',', '.') + '%';
    });

    const extras = await page.evaluate(() => {
        const out = {
            size: '',
            year: '',
            grapes: ''
        };

        const rows = document.querySelectorAll('.attribute-table .data-text');

        for (const row of rows) {
            const label = row.querySelector('.label')?.textContent?.trim();
            const value = row.querySelector('.data')?.textContent?.trim();

            if (!label || !value) continue;

            if (label === 'Størrelse') out.size = value;
            if (label === 'Årgang') out.year = value;
            if (label === 'Druetype') out.grapes = value;
        }

        return out;
    });

    product.extras.size = extras.size;
    product.extras.year = extras.year;
    product.extras.grapes = extras.grapes;
    return product;
}