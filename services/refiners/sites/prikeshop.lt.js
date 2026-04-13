// services/refiners/sites/prikeshop.lt.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Lithuania';
    product.currency = 'EUR';
    product.price = product.price.replace('€', '').trim();
    product.name = product.name.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    product.description = product.description.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

    const scope = '#product-description.selected';

    const special = await page.$eval(
        `${scope} p.attribute-special_feature`,
        el => el.textContent.toLowerCase()
    ).catch(() => '');

    if (special.includes('vegan')) product.vegan = 'Vegan';
    if (special.includes('gluten free')) product.gluten_free = 'Gluten free';
    return product;
}