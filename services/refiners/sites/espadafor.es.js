// services/refiners/sites/espadafor.es.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Spain';
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    
    product.producer = await page.evaluate(() => {
        const el = document.querySelector('.pwb-single-product-brands a');
        return el ? el.getAttribute('title')?.trim() : null;
    });

    product.name = product.name
        .replace('▷ ', '')
        .replace(' - Espadafor', '')
        .replace(' - Industrias Espadafor S.A.', '')
        .trim();

    product.extras = product.extras || {};

    product.extras.size = await page.evaluate(() => {
        const row = document.querySelector('.woocommerce-product-attributes-item--attribute_pa_tamano');
        if (!row) return null;
        const value = row.querySelector('.woocommerce-product-attributes-item__value p');
        return value ? value.textContent.trim() : null;
    });

    product.extras.ingredients = await page.evaluate(() => {
        const el = document.querySelector('#tab-ingredientes');
        return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
    });
    return product;
}