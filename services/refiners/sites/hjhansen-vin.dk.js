// services/refiners/sites/hjhansen-vin.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
        
    product.price = product.price
        .replace('pr. flaske', '')
        .replace(',', '.')
        .trim();

    product.name = product.name
        .replace(new RegExp(`,\\s*${product.producer}$`), '')
        .trim();
        
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
    return product;
}