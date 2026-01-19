// services/refiners/sites/fleggaard.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const jsonLd = await page.$$eval(
        'script[type="application/ld+json"]',
        scripts => {
            for (const script of scripts) {
                try {
                    const data = JSON.parse(script.textContent);
                    if (data && data['@graph']) {
                        return data;
                    }
                } catch (_) {}
            }
            return null;
        }
    );

    if (jsonLd) {
        const productLd = jsonLd['@graph'].find(
            entry => entry['@type'] === 'Product'
        );

        if (productLd) {
            product.producer = productLd.brand?.name ?? null;
            product.price = productLd.offers?.price ?? null;
        }
    }

    return product;
}