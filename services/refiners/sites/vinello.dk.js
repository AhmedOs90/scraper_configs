// services/refiners/sites/vinello.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';

    if (product.abv) {
        product.abv = product.abv
        .toString()
        .replace(',', '.')
        .replace(/[^\d.]/g, '')
        .trim() + '%';
    }

    const attr23 = await page.$eval(
        ".product--properties-row #attribute-23",
        el => el.textContent.trim().toLowerCase()
    ).catch(() => null);

    if (attr23) {
        product.vegan = attr23.includes("vegan") ? "Vegan" : null;
        product.glutenFree = attr23.includes("gluten") ? "Gluten free" : null;
    }

    if (product.name && product.producer) {
        const suffix = ` - ${product.producer}`;
        if (product.name.endsWith(suffix)) {
            product.name = product.name.slice(0, -suffix.length).trim();
        }
    }

    product.name = product.name.replace(' alkoholfrei', '').trim();

    return product;
}
