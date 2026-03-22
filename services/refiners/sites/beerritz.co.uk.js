// services/refiners/sites/beerritz.co.uk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'UK';
    product.currency = 'GBP';    
    
    product.producer = await page.evaluate(() => {
        const li = Array.from(
            document.querySelectorAll('.product-summary-list li')
        ).find(el => el.textContent.startsWith('Brewery:'));
        return li ? li.textContent.replace('Brewery:', '').trim() : null;
    });

    product.abv = await page.evaluate(() => {
        const li = Array.from(
            document.querySelectorAll('.product-summary-list li')
        ).find(el => el.textContent.startsWith('ABV:'));
        return li ? li.textContent.replace('ABV:', '').trim() : null;
    });

    product.extras = product.extras || {};

    product.extras.size = await page.evaluate(() => {
        const li = Array.from(
            document.querySelectorAll('.product-summary-list li')
        ).find(el => el.textContent.startsWith('Unit Size:'));
        return li ? li.textContent.replace('Unit Size:', '').trim() : null;
    });

    product.description = product.description
        .replace('Product Details' , '')
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    return product;
}