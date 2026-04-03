// services/refiners/sites/eriksorensenvin.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.price = product.price?.replace(',', '.').replace('kr.', '').trim();
    product.currency = 'DKK';

    const info = await page.$$eval(
        'table.table.b-table tbody tr',
        rows => {
            const data = {};
            rows.forEach(row => {
                const key = row.querySelector('td:first-child strong')?.textContent.trim();
                const value = row.querySelector('td:last-child span')?.textContent.trim();
                if (key) data[key] = value;
            });
            return data;
        }
    );

    product.abv = info['Alkohol %'];

    product.extras ||= {};
    product.extras.cultivation_method = info['Dyrkningsmetode'];
    product.extras.dryness_level = info['Tørhedsgrad'];
    product.extras.closing_method = info['Lukkemetode'];
    product.extras.year = info['Årgang'];
    product.extras.size = info['Flaskestørrelse'];
    return product;
}