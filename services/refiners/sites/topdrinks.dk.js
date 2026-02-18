// services/refiners/sites/topdrinks.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';

    product.price = product.price
        .replace(',', '.')
        .replace(/[^0-9.]/g, '')
        .replace(/\.$/, '')
        .trim();

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.abv = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.attr-row'));
        for (const row of rows) {
            const label = row.querySelector('.attr-label')?.textContent?.trim();
            if (label === 'Alcohol Percentage') {
                return row.querySelector('.attr-value')?.textContent?.trim() ?? null;
            }
        }
        return null;
    });

    if (product.abv) {
        product.abv = product.abv
            .replace(/\s+%/, '%')
            .trim();
    }

    product.images = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');

        for (const s of scripts) {
            try {
                const json = JSON.parse(s.textContent);
                if (json['@type'] === 'Product' && json.image) {
                    return Array.isArray(json.image) ? json.image : [json.image];
                }
            } catch {}
        }

        return [];
    });
    return product;
}