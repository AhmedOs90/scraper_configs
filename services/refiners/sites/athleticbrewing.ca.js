// services/refiners/sites/athleticbrewing.ca.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Canada';
    product.producer = 'Athletic Brewing Co.';
    product.price = product.price?.replace('$', '').trim();
    product.currency = 'CAD';
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
           
    const extra = await page.evaluate(() => {
        const abvIcon = document.querySelector('img[src*="abv-new-ico"]');
        const veganIcon = document.querySelector('img[src*="vegan-new-ico"]');

        return {
            abv: abvIcon ? "<0.5%" : null,
            vegan: veganIcon ? "Vegan" : null
        };
    });

    if (extra.abv) product.abv = extra.abv;
    if (extra.vegan) product.vegan = extra.vegan;

    const nutrition = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.pdp_info_panel ul li'));

        const find = (label) => {
            const row = rows.find(r =>
                r.querySelector('span.text-abc-navy')?.textContent.trim().startsWith(label)
            );
            return row
                ? row.querySelector('span.text-grey-1')?.textContent.trim() || null
                : null;
        };

        return {
            energy: find('Calories'),
            sugar: find('Sugar'),
            fat: find('Fat'),
            carbohydrates: find('Carbohydrates'),
            fibre: find('Fibre'),
            protein: find('Protein'),
            cholesterol: find('Cholesterol'),
            sodium: find('Sodium'),
            potassium: find('Potassium'),
            calcium: find('Calcium'),
            iron: find('Iron')
        };
    });

    if (nutrition.energy) product.energy = nutrition.energy;
    if (nutrition.sugar) product.sugar = nutrition.sugar;

    product.extras = {
        ...(product.extras || {}),
        fat: nutrition.fat,
        carbohydrates: nutrition.carbohydrates,
        fibre: nutrition.fibre,
        protein: nutrition.protein,
        cholesterol: nutrition.cholesterol,
        sodium: nutrition.sodium,
        potassium: nutrition.potassium,
        calcium: nutrition.calcium,
        iron: nutrition.iron
    };
    return product;
}