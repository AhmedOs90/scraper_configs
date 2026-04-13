// services/refiners/sites/vildmedvin.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';

    product.extras = product.extras || {};

    const attributes = await page.$$eval(".product-attribute", (rows) => {
        const result = {};

        for (const row of rows) {
            const label = row.querySelector(".name span")?.textContent?.trim().toLowerCase();
            const value = row.querySelector(".value div")?.textContent?.trim();

            if (!label || !value) continue;

            if (label.includes("alkohol")) {
                result.abv = value;
            }

            if (label.includes("størrelse")) {
                result.size = value;
            }

            if (label.includes("dyrkning")) {
                result.culture = value;
            }
        }

        return result;
    }).catch(() => ({}));

    product.abv = attributes.abv || null;
    product.extras.size = attributes.size || null;
    product.extras.culture = attributes.culture || null;

    if (product.price) {
        product.price = product.price
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const match = product.price.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/);

        product.price = match
            ? match[1].replace(/\./g, '').replace(',', '.')
            : null;
    }
    return product;
}