// services/refiners/sites/le-moderato.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "France";
    product.producer = "Moderato";
    product.price = product.price.replace(',', '.');

    await page.waitForSelector('details.accordion summary');

    const data = await page.evaluate(() => {
        const blocks = [...document.querySelectorAll('details.accordion')];

        const ingredientsBlock = blocks.find((block) => {
            const title = block.querySelector('summary .accordion__toggle > span')?.textContent?.trim();
            return /INGREDIENTS/i.test(title || '');
        });

        const content = ingredientsBlock?.querySelector('.accordion__content');
        const rawText = content?.textContent?.replace(/\s+/g, ' ').trim() || null;

        const ingredients = rawText
            ? rawText.split(/Nutritional values/i)[0].trim()
            : null;

        const energyMatch = rawText?.match(/Energy\s*([\d.]+)\s*kJ/i);
        const sugarMatch = rawText?.match(/including sugars\s*([\d.]+)\s*g/i);

        const lipidsMatch = rawText?.match(/Lipids\s*<?\s*([\d.]+)\s*g/i);
        const saturatedMatch = rawText?.match(/saturated fatty acids\s*<?\s*([\d.]+)\s*g/i);
        const carbsMatch = rawText?.match(/Carbohydrates\s*([\d.]+)\s*g/i);
        const proteinMatch = rawText?.match(/Protein\s*<?\s*([\d.]+)\s*g/i);
        const saltMatch = rawText?.match(/Salt\s*<?\s*([\d.]+)\s*g/i);

        return {
            ingredients,
            energy: energyMatch ? `${energyMatch[1]} kJ` : null,
            sugar: sugarMatch ? `${sugarMatch[1]} g` : null,
            lipids: lipidsMatch ? `${lipidsMatch[1]} g` : null,
            saturated_fatty_acids: saturatedMatch ? `${saturatedMatch[1]} g` : null,
            carbohydrates: carbsMatch ? `${carbsMatch[1]} g` : null,
            protein: proteinMatch ? `${proteinMatch[1]} g` : null,
            salt: saltMatch ? `${saltMatch[1]} g` : null,
        };
    });

    product.energy = data.energy;
    product.sugar = data.sugar;

    product.extras ??= {};
    product.extras.ingredients = data.ingredients;
    product.extras.lipids = data.lipids;
    product.extras.saturated_fatty_acids = data.saturated_fatty_acids;
    product.extras.carbohydrates = data.carbohydrates;
    product.extras.protein = data.protein;
    product.extras.salt = data.salt;
    return product;
}