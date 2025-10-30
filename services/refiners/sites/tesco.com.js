// services/refiners/sites/tesco.com.js
export default async function refine(rootUrl, product, page) {
    product.currency = "GBP";
    product.country = "UK";
    product.price = product.price.replace('£', '').trim();
    product.description = product.description
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const producer = await page.evaluate(() => {
        const el = document.querySelector('script[type="application/ld+json"]');
        if (!el) return null;
        try {
            const data = JSON.parse(el.textContent);
            const productNode = Array.isArray(data['@graph'])
                ? data['@graph'].find(x => x['@type'] === 'Product')
                : data;
            return productNode?.brand?.name?.trim() || null;
        } catch {
            return null;
        }
    });

    if (producer) product.producer = producer;

    return product;
}