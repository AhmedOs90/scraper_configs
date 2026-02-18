// services/refiners/sites/thenaddrinks.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'UK';
    product.description = product.description
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    product.producer = 'Jean Hick';
    product.price = product.price.replace(",", ".");

    const accordionText = await page.evaluate(() => {
        const blocks = [...document.querySelectorAll('.accordion__content.rte')];

        const matchBlock = blocks.find(b => {
            const t = b.textContent.replace(/\s+/g, ' ').trim();
            return t.includes('kJ') && t.includes('kcal');
        });

        return matchBlock?.textContent || '';
    });

    const energy =
        accordionText.match(/Energy content\s*:\s*([^\n]+)/i)?.[1] ||
        accordionText.match(/([0-9.,]+\s*kJ\s*\/\s*[0-9.,]+\s*kcal)/i)?.[1] ||
        null;

    const sugar =
        accordionText.match(/of which sugars[^0-9]*([0-9.,]+g)/i)?.[1] ||
        accordionText.match(/sugars[^0-9]*([0-9.,]+g)/i)?.[1] ||
        null;

    const abv =
        accordionText.match(/Alcohol\s*:\s*([^\n]+)/i)?.[1] ||
        accordionText.match(/([0-9.]+%)/)?.[1] ||
        null;

    product.energy = energy;
    product.sugar = sugar;
    product.abv = abv;

    if (/gluten[-\s]*free/i.test(accordionText)) {
        product.gluten_free = 'Gluten free';
    } else if (/gluten\s*:\s*</i.test(accordionText)) {
        product.gluten_free = null;
    }

    if (/vegan/i.test(accordionText)) {
        product.vegan = 'Vegan';
    }
    return product;
}