// services/refiners/sites/smashd.com.js
export default async function refine(rootUrl, product, page) {
    product.producer = 'SMASHD';
    product.country = 'USA';
    product.gluten_free = 'Gluten free';

    await page.waitForSelector('.station-tabs-local-above p', { timeout: 10000 }).catch(() => {});

    const data = await page.evaluate(() => {
        const result = {};

        const descriptionEl = document.querySelector('.station-tabs-local-above p');
        if (descriptionEl) {
            result.description = descriptionEl.textContent.trim();
        }

        const ingredientsTab = document.querySelector('[data-slug="ingredients"]');
        const ingredientsPanel = ingredientsTab?.closest('.station-tabs-tabtitle')?.nextElementSibling;
        const ingredientsEl = ingredientsPanel?.querySelector('p');
        if (ingredientsEl) {
            result.ingredients = ingredientsEl.textContent.trim();
        }

        const nutritionTab = document.querySelector('[data-slug="nutrition-facts"]');
        const nutritionPanel = nutritionTab?.closest('.station-tabs-tabtitle')?.nextElementSibling;

        const nutritionItems = nutritionPanel?.querySelectorAll('li') || [];

        nutritionItems.forEach((li) => {
            const strong = li.querySelector('strong');
            const label = strong?.textContent.toLowerCase().trim() || '';
            const value = li.textContent.replace(strong?.textContent || '', '').trim();

            if (label.includes('calories')) result.energy = `${value}cal`;
            if (label.includes('sugar')) result.sugar = value;
            if (label.includes('fat')) result.fat = value;
            if (label.includes('sodium')) result.sodium = value;
            if (label.includes('protein')) result.protein = value;
            if (label.includes('potassium')) result.potassium = value;
            if (label.includes('magnesium')) result.magnesium = value;
        });

        return result;
    });

    if (data.description) {
        product.description = data.description;
    }

    if (data.energy) {
        product.energy = data.energy;
    }

    if (data.sugar) {
        product.sugar = data.sugar;
    }

    product.extras = {
        ...(product.extras || {}),
        ingredients: data.ingredients,
        fat: data.fat,
        sodium: data.sodium,
        protein: data.protein,
        potassium: data.potassium,
        magnesium: data.magnesium
    };
    return product;
}