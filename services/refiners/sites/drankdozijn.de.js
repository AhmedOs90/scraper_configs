// services/refiners/sites/drankdozijn.de.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Germany';
    product.currency = 'EUR';

    product.name = product.name
        .replace('?', '')
        .replace(' | DrankDozijn.de', '')
        .trim();

    product.price = product.price
        .replace(',', '.')
        .trim();

    const data = await page.$eval(
        'script[type="application/ld+json"]',
        el => JSON.parse(el.textContent)
    );

    product.producer = data.brand?.name || null;
    product.images = data.image || [];

    const specs = await page.$$eval(
        '.description_row table.specs tr',
        rows => {
            const out = {};
            rows.forEach(row => {
                const key = row.querySelector('.key')?.textContent.trim();
                const value = row.querySelector('.value')?.textContent.trim();
                if (key && value) out[key] = value;
            });
            return out;
        }
    );

    product.abv = specs['Alkoholgehalt']
        ? specs['Alkoholgehalt'].replace(',', '.').trim()
        : null;

    product.extras = product.extras || {};
    product.extras.grape = specs['Traube'] || null;
    product.extras.closure = specs['Verschluss'] || null;
    product.extras.size = specs['Inhalt'] || null;
    return product;
}