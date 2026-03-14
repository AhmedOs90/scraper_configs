// services/refiners/sites/gueuledejoie.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'France';
    product.price = product.price?.replace(',', '.');

    product.description = product.description
        ?.replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.abv = product.abv
        ?.replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .replace(/\s*\|.*$/, "")
        .replace(/°/g, "%")
        .trim();

    const extra = await page.evaluate(() => {
        const normalize = (v) => v?.replace(',', '.').trim() || null;

        const nutritionRow = [...document.querySelectorAll('.feature-chart__table-row')]
            .find(row =>
                /valeurs nutritionnelles/i.test(
                    row.querySelector('.feature-chart__heading')?.innerText || ''
                )
            );

        const text = nutritionRow
            ?.querySelector('.feature-chart__value')
            ?.innerText?.trim() || '';

        let energy = null;

        const match =
            text.match(/([\d.,]+\s*kJ\s*\/\s*[\d.,]+\s*kcal)/i) ||
            text.match(/([\d.,]+\s*kcal\s*\/\s*[\d.,]+\s*kJ)/i) ||
            text.match(/([\d.,]+\s*kJ\s*\(\s*[\d.,]+\s*kcal\s*\))/i) ||
            text.match(/([\d.,]+\s*kcal\s*\(\s*[\d.,]+\s*kJ\s*\))/i);

        if (match) {
            energy = match[1]
                .replace(/\s+/g, ' ')
                .replace(',', '.')
                .trim();
        }

        const sugarMatch =
            text.match(/dont\s*sucres?\s*[: ]?\s*([\d.,]+)\s*g/i) ||
            text.match(/sucres?\s*[: ]?\s*([\d.,]+)\s*g/i);

        const sugar = sugarMatch ? `${normalize(sugarMatch[1])} g` : null;

        return { energy, sugar };
    });

    product.energy = extra.energy;
    product.sugar = extra.sugar;
    return product;
}