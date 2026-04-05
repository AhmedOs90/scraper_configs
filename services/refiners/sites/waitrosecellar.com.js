// services/refiners/sites/waitrosecellar.com.js
export default async function refine(rootUrl, product, page) {
    product.currency = 'GBP';
    product.country = 'UK';
    product.price = product.price.replace('£', '').trim();

    await page.waitForSelector(
        'div[class*="ProductDescriptionPage_imageContainer"] img',
        { timeout: 15000 }
    );

    product.images = await page.evaluate(() => {
        const img = document.querySelector(
            'div[class*="ProductDescriptionPage_imageContainer"] img'
        );

        if (!img) return [];

        const urls = new Set();

        if (img.src) urls.add(img.src);

        if (img.srcset) {
            img.srcset.split(',').forEach(entry => {
                const url = entry.trim().split(/\s+/)[0];
                if (url) urls.add(url);
            });
        }

        return [...urls];
    });

    product.extras = product.extras || {};

    if (product.description) {
        const sizeMatch = product.description.match(/Size\s*([0-9]+(?:\.[0-9]+)?\s*(?:ml|cl|l))/i);
        if (sizeMatch) {
            product.extras.size = sizeMatch[1].trim();
        }

        const abvMatch = product.description.match(/Alcohol\s*Vol\.?\s*([0-9]+(?:\.[0-9]+)?)%/i);
        if (abvMatch) {
            product.abv = `${abvMatch[1]}%`;
        }
    }
    return product;
}