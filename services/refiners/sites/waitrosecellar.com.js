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
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');

        for (const s of scripts) {
            try {
            const json = JSON.parse(s.textContent);
            if (json['@type'] === 'Product' && json.image) {
                return Array.isArray(json.image) ? json.image : [json.image];
            }
            } catch {}
        }

        return [];
    });

    product.producer = await page.evaluate(() => {
        const el = document.querySelector('#gg01_origin');
        return el ? el.textContent.replace(' (brand origin)', '').trim() : "";
    });

    product.abv = await page.evaluate(() => {
        const el = document.querySelector('#gg01_alcohol_percentage_wrapper');
        return el ? el.textContent.trim() : "";
    });

    product.description = await page.evaluate(() => {
        const el = document.querySelector('.gg01_tab_content p.gg01_product_description');
        return el ? el.textContent.replace(/\s+/g, ' ').trim() : "";
    });
    return product;
}