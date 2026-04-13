// services/refiners/sites/vinello.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';
    product.name = product.name.replace(' alkoholfrei', '').trim();

    if (product.abv) {
        const cleaned = product.abv
            .toString()
            .replace(',', '.')
            .replace(/[^\d.]/g, '')
            .trim();

        product.abv = cleaned ? cleaned + '%' : null;
    }

    const attr23 = await page.$eval(
        ".product--properties-row #attribute-23",
        el => el.textContent.trim().toLowerCase()
    ).catch(() => null);

    if (attr23) {
        product.vegan = attr23.includes("vegan") ? "Vegan" : null;
        product.glutenFree = attr23.includes("gluten free") ? "Gluten free" : null;
    }

    if (product.name && product.producer) {
        const suffix = ` - ${product.producer}`;
        if (product.name.endsWith(suffix)) {
            product.name = product.name.slice(0, -suffix.length).trim();
        }
    }

    const getAttr = async (id) =>
        page.$eval(`#attribute-${id}`, el => el.textContent.trim())
            .catch(() => null);

    product.extras = product.extras || {};

    product.extras.color = await getAttr(30);
    product.extras.year = await getAttr(6);
    product.extras.taste = await getAttr(21);
    product.extras.aroma = await getAttr(20);
    product.extras.mouthfeel = await getAttr(25);
    product.extras.grape = await getAttr(16);
    product.extras.serving_temperature = await getAttr(9);
    product.extras.size = await getAttr(22);
    product.extras.closure = await getAttr(15);
    product.extras.allergens = await getAttr(29);

    if (product.extras.size) {
        product.extras.size = product.extras.size + ' L';
    }

    if (product.extras.serving_temperature) {
        product.extras.serving_temperature += ' °C';
    }
    return product;
}