// services/refiners/sites/threespiritdrinks.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'UK';
    product.producer = 'Three Spirit';

    const { ingredients, vegan, gluten } = await page.evaluate(() => {
        const content = document.querySelector('.Popup__Content');

        const ingredientsEl = content?.querySelector('.metafield-rich_text_field');
        const ingredients = ingredientsEl?.textContent?.replace(/\s+/g, ' ').trim() || null;

        const benefitsText = content?.querySelector('.product-benefits')?.textContent?.toLowerCase() || '';

        return {
            ingredients,
            vegan: benefitsText.includes('vegan'),
            gluten: benefitsText.includes('gluten'),
        };
    });

    product.extras ??= {};
    product.extras.ingredients = ingredients;

    if (vegan) product.vegan = 'Vegan';
    if (gluten) product.gluten_free = 'Gluten free';
    return product;
}