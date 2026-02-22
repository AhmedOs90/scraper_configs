// services/refiners/sites/goodpairdays.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Australia';
    product.currency = 'AUD';

    await page.waitForSelector('img[alt="productImage"]', { timeout: 15000 });

    await page.waitForFunction(() => {
        const img = document.querySelector('img[alt="productImage"]');
        return img && img.complete && img.naturalWidth > 0;
    }, { timeout: 15000 });

    product.name = product.name.replace(' | Good Pair Days', '').trim();
    product.price = product.price.replace('$', '').trim();

    const data = await page.evaluate(() => {
        const clean = s => (s || '').replace(/\s+/g, ' ').trim();

        let producer = '';
        let abv = '';

        const specsTable = document.querySelector('h5#specs')?.nextElementSibling;
        if (specsTable) {
            for (const row of specsTable.querySelectorAll('tbody tr')) {
                const key = clean(row.querySelector('td strong')?.textContent).toUpperCase();
                const val = clean(row.querySelector('td:last-child')?.textContent);
                if (key === 'PRODUCER') producer = val;
                if (key === 'ALCOHOL') abv = val;
            }
        }

        let node = document.querySelector('h5#pairing-guide')?.nextElementSibling;
        const parts = [];

        while (node) {
            parts.push(clean(node.textContent));
            node = node.nextElementSibling;
        }

        return {
            producer,
            abv,
            description: clean(parts.join(' '))
        };
    });

    product.producer = data.producer;
    product.abv = data.abv;
    product.description = data.description;
    return product;
}