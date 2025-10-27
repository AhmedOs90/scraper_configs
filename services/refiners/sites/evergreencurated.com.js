// services/refiners/sites/evergreencurated.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';

    const producer = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        const productScript = scripts.map(s => {
        try { return JSON.parse(s.innerText); } catch { return null; }
        }).find(s => s && s['@type'] === 'Product');

        return productScript?.brand?.name || null;
    });

    if (producer) product.producer = producer;

    return product;
}
