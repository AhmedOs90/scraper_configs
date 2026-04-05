// services/refiners/sites/threshers.co.uk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'UK';
    product.currency = 'GBP';
    product.price = product.price
        ?.replace(/[^\d.]/g, '')
        .trim();
    product.description = product.description
        ?.replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const text = await page.evaluate(() => {
        return document
            .querySelector('[id^="Product-content-"]')
            ?.textContent || '';
    });

    product.abv = text.match(/ABV\s*([\d.]+%)/i)?.[1] || null;
    product.extras = product.extras || {};
    product.extras.size = text.match(/SIZE\s*([^\n]+)/i)?.[1]?.trim() || null;
    return product;
}