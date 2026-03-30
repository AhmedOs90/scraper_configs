// services/refiners/sites/foetex.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';

    product.price = product.price
        .replace(',', '.')
        .replace('-', '00')
        .trim();

    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    product.name = product.name.replace(' | Køb på føtex.dk!', '').trim();

    const producer = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');

        for (const s of scripts) {
            try {
                const data = JSON.parse(s.textContent);
                if (data && data['@type'] === 'Product') {
                    return data.brand || null;
                }
            } catch (_) {}
        }

        return null;
    });

    product.producer = producer;

    const extras = await page.evaluate(() => {
        const skip = new Set([
            'id',
            'varenummer',
            'oprindelsesland',
            'flaske/bag-in-box',
            'flaske/bag',
            'energi',
            'alkoholprocent',
        ]);

        const rows = [...document.querySelectorAll('.specification-table table tr')];

        const normalizeKey = (key) =>
            key
                .toLowerCase()
                .trim()
                .replace(/^-\s*/, '')
                .replace(/\([^)]*\)/g, '')
                .replace(/[/%]/g, '')
                .replace(/æ/g, 'ae')
                .replace(/ø/g, 'oe')
                .replace(/å/g, 'aa')
                .replace(/&/g, 'and')
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '');

        const shouldSkip = (label) => {
            const l = label.toLowerCase().trim();
            return (
                skip.has(l) ||
                l.includes('fedtsyrer') ||
                l.includes('sukker')
            );
        };

        return Object.fromEntries(
            rows
                .map((row) => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length < 2) return null;

                    const label = cells[0].innerText.trim();
                    const value = cells[1].innerText.replace(/\s+/g, ' ').trim();

                    if (!label || !value || shouldSkip(label)) return null;

                    return [normalizeKey(label), value];
                })
                .filter(Boolean)
        );
    });

    product.extras = extras;
    return product;
}