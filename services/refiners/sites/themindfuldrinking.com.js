// services/refiners/sites/themindfuldrinking.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';
    product.description = product.description
        ?.replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();


    const data = await page.evaluate(() => {
        const result = {};

        document.querySelectorAll('.product__accordion details').forEach((block) => {
            const title = block.querySelector('summary h2')?.textContent?.toLowerCase().trim();
            const content = block.querySelector('.accordion__content');

            if (!title || !content) return;

            if (title.includes('ingredients')) {
                result.ingredients = content.textContent
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            if (title.includes('nutritional')) {
                content.querySelectorAll('tr').forEach((row) => {
                    const label = row.querySelector('th')?.textContent?.toLowerCase().trim();
                    const value = row.querySelector('td')?.textContent?.trim();

                    if (!label || !value) return;

                    if (label.includes('calories')) result.energy = value;
                    if (label.includes('sugar')) result.sugar = value;
                    if (label.includes('fat')) result.fat = value;
                    if (label.includes('carbohydrate')) result.carbohydrates = value;
                    if (label.includes('protein')) result.protein = value;
                });
            }
        });

        return result;
    }).catch(() => ({}));

    product.energy = data.energy || null;
    product.sugar = data.sugar || null;

    product.extras = product.extras || {};
    product.extras.ingredients = data.ingredients || null;
    product.extras.fat = data.fat || null;
    product.extras.carbohydrates = data.carbohydrates || null;
    product.extras.protein = data.protein || null;
    return product;
}