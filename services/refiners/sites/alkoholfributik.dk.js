// services/refiners/sites/alkoholfributik.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    product.price = product.price.replace(',', '.').trim();
    product.abv = (product.abv.match(/\d+(?:[.,]\d+)?%/) || [""])[0];

    const brand = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const s of scripts) {
            const txt = s.textContent && s.textContent.trim();
            if (!txt) continue;

            try {
                const data = JSON.parse(txt);
                const items = Array.isArray(data) ? data : [data];

                for (const it of items) {
                    if (it && it['@type'] === 'Product' && it.brand && it.brand.name) {
                        return it.brand.name;
                    }
                }
            } catch {}
        }
        return null;
    });

    if (brand) product.producer = brand;
    return product;
}