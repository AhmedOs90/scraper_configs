// services/refiners/sites/beerfordriving.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';
    product.currency = 'USD';
    product.price = product.price.replace('$', '').trim();
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const extra = await page.evaluate(() => {
        const getValue = (label) => {
            const blocks = Array.from(document.querySelectorAll('.bg-gray-50'));
            for (const b of blocks) {
                const k = b.querySelector('.text-xs')?.textContent?.trim();
                if (k === label) {
                    return b.querySelector('.font-semibold')?.textContent?.trim() || null;
                }
            }

            const rows = Array.from(document.querySelectorAll('div.flex.justify-between.py-2'));
            for (const r of rows) {
                const k = r.querySelector('span.font-semibold')?.textContent?.trim();
                if (k === label) {
                    return r.querySelector('span:not(.font-semibold)')?.textContent?.trim() || null;
                }
            }

            return null;
        };

        const abvText =
            getValue('ABV') ||
            getValue('Alcohol by Volume') ||
            document.querySelector('span.bg-green-100')?.textContent?.trim() ||
            null;

        const abvNum = abvText ? (abvText.match(/[\d.]+/) || [null])[0] : null;

        const energy = getValue('Calories');
        const carbs = getValue('Carbs') || getValue('Total Carbs') || getValue('Total Carbohydrates');
        const ibu = getValue('IBU');

        const sizeText =
            document.querySelector('p.text-xs')?.textContent || null;

        const size = sizeText
            ? (sizeText.match(/Serving Size\s*(.+)/i)?.[1]?.trim() || null)
            : null;

        const ingredients = Array.from(document.querySelectorAll('h3'))
            .find(h => h.textContent.trim() === 'Ingredients')
            ?.parentElement
            ?.querySelectorAll('span');

        const ingredientsList = ingredients
            ? Array.from(ingredients).map(el => el.textContent.trim())
            : null;

        return {
            abv: abvNum ? `${abvNum}%` : null,
            energy,
            carbs,
            size,
            ibu,
            ingredients: ingredientsList
        };
    });

    product.abv = extra.abv;
    product.energy = extra.energy;

    product.extras = {
        ...(product.extras || {}),
        carbohydrates: extra.carbs,
        size: extra.size,
        ibu: extra.ibu,
        ingredients: extra.ingredients
    };
    return product;
}