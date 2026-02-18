// services/refiners/sites/albertabeerexchange.ca.js
export default async function refine(rootUrl, product, page) {

    product.price = product.price?.replace('C$', '').trim();
    product.currency = 'CAD';
    product.country = 'Canada';
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const brand = await page.evaluate(() => {
        const el = document.querySelector('script[type="application/ld+json"]');
        if (!el) return null;
        try {
            const data = JSON.parse(el.textContent);
            const product = data.find(x => x['@type'] === 'Product');
            return product?.brand || null;
        } catch {
            return null;
        }
    });

    product.producer = brand;
    
    return product;
}