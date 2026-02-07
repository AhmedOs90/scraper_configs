// services/refiners/sites/craftzero.com.au.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Australia';
    product.name = product.name.replace(' | Craftzero', '').trim();
    product.description = product.description.replace(' | Available at CraftZero', '').trim();

    const abvText = await page.evaluate(() => {
        const titles = Array.from(document.querySelectorAll('h2.accordion__title'));
        const title = titles.find(
            (el) => (el.textContent || '').trim().toLowerCase() === 'alcohol content'
        );
        if (!title) return null;

        const accordion = title.closest('.product__accordion, .accordion');
        if (!accordion) return null;

        const p = accordion.querySelector('.accordion__content__inner p');
        return (p?.textContent || '').trim() || null;
    });

    if (abvText) {
        product.abv = abvText;
    }

    const nutrition = await page.evaluate(() => {
        const titles = Array.from(document.querySelectorAll('h2.accordion__title'));
        const title = titles.find(
            (el) =>
                (el.textContent || '')
                    .trim()
                    .toLowerCase() === 'nutritional information per 100ml'
        );
        if (!title) return null;

        const accordion = title.closest('.product__accordion, .accordion');
        if (!accordion) return null;

        const span = accordion.querySelector('.accordion__content__inner span');
        const text = (span?.textContent || '').trim();
        if (!text) return null;

        const caloriesMatch = text.match(/Calories:\s*([\d.]+)/i);
        const sugarMatch = text.match(/Sugars?:\s*([\d.]+g)/i);

        return {
            calories: caloriesMatch ? caloriesMatch[1] : null,
            sugar: sugarMatch ? sugarMatch[1] : null,
        };
    });

    if (nutrition?.sugar) {
        product.sugar = nutrition.sugar;
    }

    if (nutrition?.calories) {
        product.energy = nutrition.calories;
    }

    const producer = await page.evaluate(() => {
        const script = document.querySelector('script#viewed_product');
        const text = script?.textContent || '';
        const match = text.match(/Brand:\s*"([^"]+)"/);
        return match ? match[1].trim() : null;
    });

    if (producer) {
        product.producer = producer;
    }

    return product;
}