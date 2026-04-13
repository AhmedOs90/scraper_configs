// services/refiners/sites/thelightdrinker.com.js
export default async function refine(rootUrl, product, page) {
    product.name = product.name.replace(' - The Light Drinker', '').trim();
    product.currency = 'GBP';
    product.country = 'UK';
    product.price = product.price.replace('£', '').trim();
    product.description = product.description
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const info = await page.evaluate(() => {
        const getValue = label => {
            const el = [...document.querySelectorAll('.ld-2-cols.ld-bold')]
                .find(e => e.textContent.trim() === label);
            return el ? el.nextElementSibling.textContent.trim() : '';
        };

        return {
            producer: getValue('Producer'),
            vegan: getValue('Vegan').toLowerCase() === 'yes' ? 'Vegan' : '',
            gluten_free: getValue('Gluten Free').toLowerCase() === 'yes' ? 'Gluten free' : '',
            size: getValue('Bottle size (ml)'),
            fizz: getValue('Fizz'),
            fermented: getValue('Fermented'),
            distilled: getValue('Distilled'),
            grape: getValue('Grape'),
            style: getValue('Style'),
            color: getValue('Colour')
        };
    });

    product.producer = info.producer;
    product.vegan = info.vegan;
    product.gluten_free = info.gluten_free;

    product.extras = {
        size: info.size,
        fizz: info.fizz,
        fermented: info.fermented,
        distilled: info.distilled,
        grape: info.grape,
        style: info.style,
        color: info.color
    };
    return product;
}