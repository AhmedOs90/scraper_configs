// services/refiners/sites/collectivecraftbeer.com.js
import { extractABVFromText } from "../refiners_helpers.js";

export default async function refine(rootUrl, product, page) {
    product.producer = await page.evaluate(() => {
        const ld = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
            .map(s => { try { return JSON.parse(s.textContent); } catch { return null; } })
            .find(obj => obj && obj['@type'] === 'Product');

            if (ld?.brand) {
                return typeof ld.brand === 'string' ? ld.brand : ld.brand?.name;
            }
        return null;
    });
    
    // product.abv = extractABVFromText(product.name, product.description);

    return product;
}