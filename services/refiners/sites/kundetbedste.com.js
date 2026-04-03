// services/refiners/sites/kundetbedste.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';

    product.price = product.price.replace(',', '.').trim();

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const abvMatch = product.description.match(/Alkohol:\s*([\d]+(?:[.,]\d+)?)\s*%/i);
    if (abvMatch) {
        product.abv = abvMatch[1].replace(",", ".") + "%";
    }

    const sizeMatch = product.description.match(/Indhold:\s*([\d]+(?:[.,]\d+)?)\s*(cl|ml|l)/i);
    if (sizeMatch) {
        product.extras = product.extras || {};
        product.extras.size = sizeMatch[1].replace(",", ".") + " " + sizeMatch[2].toLowerCase();
    }

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