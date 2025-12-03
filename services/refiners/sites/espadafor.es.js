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
    return product;
}
