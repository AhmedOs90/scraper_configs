// services/refiners/sites/collectivecraftbeer.com.js
export default async function refine(rootUrl, product, page) {
    
    product.country = 'Canada';

    product.producer = await page.evaluate(() => {
        const ld = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
            .map(s => { try { return JSON.parse(s.textContent); } catch { return null; } })
            .find(obj => obj && obj['@type'] === 'Product');

            if (ld?.brand) {
                return typeof ld.brand === 'string' ? ld.brand : ld.brand?.name;
            }
        return null;
    });

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const abvMatch = product.description.match(/ABV:\s*([\d.]+%)/i);

    if (abvMatch) {
        product.abv = abvMatch[1];
    }

    return product;
}