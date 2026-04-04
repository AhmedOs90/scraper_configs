// services/refiners/sites/sluktoersten.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.name = product.name
        .replace('hos SlukTørsten', '')
        .replace(' - Sluktørsten', '')
        .trim();

    const match = product.name?.match(/(\<?\d+(?:[.,]\d+)?)\s*%/);
    product.abv = match ? match[1].replace(',', '.') + '%' : null;

    product.producer = await page.evaluate(() => {
        const script = document.querySelector('#pys-js-extra');
        if (!script?.textContent) return null;

        const m = script.textContent.match(/"item_category2"\s*:\s*"([^"]+)"/);
        return m ? m[1] : null;
    }).catch(() => null);

    product.extras = product.extras || {};

    product.extras.size = await page.evaluate(() => {
        const rows = document.querySelectorAll('.woocommerce-product-attributes tr');

        for (const row of rows) {
            const label = row.querySelector('th')?.textContent?.trim().toLowerCase();
            if (label === 'størrelse') {
                return row.querySelector('td')?.textContent?.trim() || null;
            }
        }
        return null;
    }).catch(() => null);
    return product;
}