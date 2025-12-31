// services/refiners/sites/1001spirits.com.js
export default async function refine(rootUrl, product, page) {
    product.price = product.price
        .replace(',', '.')
        .replace(/[^0-9.]/g, '');

    product.currency = 'EUR';
    product.country = 'Germany';

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.producer = await page.$$eval(
        'script[type="application/ld+json"]',
        scripts => {
            for (const s of scripts) {
                try {
                    const d = JSON.parse(s.textContent);
                    if (d['@type'] === 'Product' && d.brand?.name) {
                        return d.brand.name;
                    }
                } catch {}
            }
            return null;
        }
    );

    return product;
}
