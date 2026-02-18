// services/refiners/sites/noblegreenwines.co.uk.js
export default async function refine(rootUrl, product, page) {
    product.price = product.price
        .replace(/Single Price:/i, '')
        .replace(/£/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    product.abv = await page.evaluate(() => {
        const row = [...document.querySelectorAll('#product-properties tr')]
        .find(tr => tr.querySelector('td')?.textContent.trim() === 'ABV');
        return row ? row.querySelectorAll('td')[1].textContent.trim() : null;
    });

    product.currency = "GBP";
    product.country = "UK";
    
    if (product.description) {
        const text = product.description.toLowerCase();

        if (text.includes('vegan')) {
            product.vegan = 'Vegan';
        }

        if (text.match(/\bgluten[-\s]?free\b/)) {
            product.gluten_free = 'Gluten free';
        }
    }
    
    return product;
}