// services/refiners/sites/zerodrinks.co.za.js
export default async function refine(rootUrl, product, page) {
    product.name = product.name.replace(' | Zero Drinks', '').trim();
    product.country = 'South Africa';

    const ingredients = await page.evaluate(() => {
        const el = document.querySelector('.brand-writeup .metafield-multi_line_text_field');
        return el ? el.textContent.trim() : null;
    });

    product.extras = product.extras || {};
    product.extras.ingredients = ingredients;
    return product;
}