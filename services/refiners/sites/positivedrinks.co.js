// services/refiners/sites/positivedrinks.co.js
export default async function refine(rootUrl, product, page) {
    product.country = 'UK';
    product.currency = 'GBP';
    product.price = product.price.replace('£', '').trim();
    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    product.abv = await page.evaluate(() => {
        const el = document.querySelector('.product__subtitle strong:last-child');
        return el ? el.textContent.trim() : null;
    });

    const icons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.product-icons-list .text-with-icon__label'))
            .map(el => el.textContent.toLowerCase());
    });

    if (icons.some(t => t.includes('gluten'))) product.gluten_free = 'Gluten free';
    if (icons.some(t => t.includes('vegan'))) product.vegan = 'Vegan';
    
    if (/\(VG\)/i.test(product.name)) product.vegan = 'Vegan';
    if (/\(GF\)/i.test(product.name)) product.gluten_free = 'Gluten free';

    product.producer = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const s of scripts) {
            try {
            const data = JSON.parse(s.textContent);
            if (data['@type'] === 'Product' && data.brand?.name) {
                return data.brand.name.trim();
            }
            } catch (_) {}
        }
        return null;
    });

    return product;
}