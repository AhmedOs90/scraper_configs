// services/refiners/sites/vildmedvin.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';

    product.abv = await page.$$eval(".product-attribute", (rows) => {
        for (const row of rows) {
            const label = row.querySelector(".name span")?.textContent?.trim();
            const value = row.querySelector(".value div")?.textContent?.trim();
            if (label && value && label.toLowerCase().includes("alkohol")) {
                return value;
            }
        }
        return null;
    }).catch(() => null);

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