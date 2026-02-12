// services/refiners/sites/sluktoersten.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';

    const match = product.name?.match(/(\<?\d+(?:[.,]\d+)?)\s*%/);
    product.abv = match ? match[1].replace(',', '.') + '%' : null;

    product.producer = await page.evaluate(() => {
        const script = document.querySelector('#pys-js-extra');
        if (!script?.textContent) return null;

        const m = script.textContent.match(/"item_category2"\s*:\s*"([^"]+)"/);
        return m ? m[1] : null;
    }).catch(() => null);
    return product;
}