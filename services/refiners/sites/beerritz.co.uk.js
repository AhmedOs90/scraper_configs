// services/refiners/sites/beerritz.co.uk.js
export default async function refine(rootUrl, product, page) {
    product.currency = 'GBP';
    product.country = 'UK';

    product.producer = await page.evaluate(() => {
        const li = Array.from(
            document.querySelectorAll('.product-summary-list li')
        ).find(el => el.textContent.startsWith('Brewery:'));
        return li ? li.textContent.replace('Brewery:', '').trim() : null;
    });

    product.description = product.description
        .replace('Product Details' , '')
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    return product;
}