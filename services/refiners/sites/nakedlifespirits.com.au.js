// services/refiners/sites/nakedlifespirits.com.au.js
export default async function refine(rootUrl, product, page) {
    product.name = product.name.replace('Naked Life Non-Alcoholic Cocktail ', '').trim();
    product.country = 'Australia';
    product.currency = 'AUD';
    product.price = product.price.replace('$', '').trim();
    product.producer = 'Naked Life';

    const data = await page.evaluate(() => {
        const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

        const result = {
            energy: null,
            sugar: null,
            protein: null,
            fat: null,
            carbohydrates: null,
            sodium: null,
            ingredients: null,
        };

        const wrappers = [...document.querySelectorAll('.collapsibles-wrapper')];

        const getSectionByTitle = (title) =>
            wrappers.find((wrap) => {
                const btn = wrap.querySelector('.collapsible-trigger-btn');
                return btn && clean(btn.textContent).toLowerCase().includes(title);
            });

        const nutritionSection = getSectionByTitle('nutrition information');

        if (nutritionSection) {
            const rows = [...nutritionSection.querySelectorAll('tbody tr')];

            for (const row of rows) {
                const cells = row.querySelectorAll('td');
                if (cells.length < 2) continue;

                const label = clean(cells[0].textContent).toLowerCase();
                const value = clean(cells[1].textContent);

                if (label === 'energy') result.energy = value;
                else if (label === '- sugars') result.sugar = value;
                else if (label === 'protein') result.protein = value;
                else if (label === 'fat.total' || label === 'fat total') result.fat = value;
                else if (label === 'carbohydrate') result.carbohydrates = value;
                else if (label === 'sodium') result.sodium = value;
            }
        }

        const ingredientsSection = getSectionByTitle('ingredients');

        if (ingredientsSection) {
            const inner = ingredientsSection.querySelector('.collapsible-content__inner');
            if (inner) {
                const text = clean(inner.textContent);
                result.ingredients = text || null;
            }
        }

        return result;
    });

    product.energy = data.energy;
    product.sugar = data.sugar;

    product.extras = product.extras || {};
    product.extras.protein = data.protein;
    product.extras.fat = data.fat;
    product.extras.carbohydrates = data.carbohydrates;
    product.extras.sodium = data.sodium;
    product.extras.ingredients = data.ingredients;
    return product;
}