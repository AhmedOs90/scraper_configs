// services/refiners/sites/otto-duborg.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const size = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('.product-reference')];
        const match = rows.find(
            (row) => row.querySelector('strong')?.innerText.trim() === 'Mængde'
        );
        return match?.querySelector('span')?.innerText.trim() || null;
    });

    product.extras = product.extras || {};
    product.extras.size = size;
    return product;
}