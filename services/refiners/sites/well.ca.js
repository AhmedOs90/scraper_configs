// services/refiners/sites/well.ca.js
export default async function refine(rootUrl, product, page) {
    product.name = product.name.replace(product.producer, '').trim();
    product.country = 'Canada';
    product.description = product.description.replace(/\r?\n|\r/g, ' ');

    const data = await page.evaluate(() => {
        const get = (prop) =>
            document.querySelector(`[itemprop="${prop}"]`)?.textContent.trim() || null;

        const size = document
            .querySelector('.nf-serving .nf-line')
            ?.textContent.replace('Serving size:', '')
            .trim() || null;

        const calories = get('calories');
        const sugar = get('sugarContent');

        return {
            calories,
            sugar,
            size,
            fat: get('fatContent'),
            cholesterol: get('cholesterolContent'),
            sodium: get('sodiumContent'),
            carbohydrates: get('carbohydrateContent'),
            protein: get('proteinContent'),
            vitamin_a: get('vitaminAContent'),
            vitamin_c: get('vitaminCContent'),
            calcium: get('calciumContent'),
            iron: get('ironContent'),
        };
    });

    product.energy = data.calories;
    product.sugar = data.sugar;

    product.extras = {
        size: data.size,
        fat: data.fat,
        cholesterol: data.cholesterol,
        sodium: data.sodium,
        carbohydrates: data.carbohydrates,
        protein: data.protein,
        vitamin_a: data.vitamin_a,
        vitamin_c: data.vitamin_c,
        calcium: data.calcium,
        iron: data.iron,
    };
    return product;
}