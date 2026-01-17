// services/refiners/sites/kjaersommerfeldt.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';

    product.price = product.price
        .replace(',', '.')
        .replace(/[^0-9.]/g, '')
        .replace(/\.$/, '')
        .trim();

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    await page.waitForSelector('.product-image__container', { timeout: 15000 });

    const jsonLd = await page.$$eval(
        'script[type="application/ld+json"]',
        scripts => {
            for (const s of scripts) {
                try {
                    const data = JSON.parse(s.textContent);
                    if (data['@type'] === 'Product') return data;
                } catch (e) {}
            }
            return null;
        }
    );

    if (jsonLd) {
        product.name = jsonLd.name?.trim();
        product.producer = jsonLd.brand?.name?.trim();
    }

    return product;
}