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
        .replace(/før.*$/i, '')
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

    product.extras = product.extras || {};

    const specs = await page.evaluate(() => {
        const rows = document.querySelectorAll('[class*="Specs__Line"]');
        const out = {};

        rows.forEach(row => {
            const key = row.querySelector('[class*="Specs__Bold"]')?.textContent?.trim().replace(':','');
            const value = row.querySelector('[class*="Specs__Value"]')?.textContent?.trim();
            if (key && value) out[key] = value;
        });

        return out;
    });

    product.extras.size = specs['Flaskestørrelse'] || null;
    return product;
}