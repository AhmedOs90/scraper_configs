// services/refiners/sites/joinclubsoda.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'UK';
    product.currency = 'GBP';

    product.name = product.name.replace(' - Club Soda', '').trim();
    product.price = product.price.replace('£', '').trim();

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const extra = await page.evaluate(() => {
        const el = document.querySelector('#elementor-tab-content-6322');
        if (!el) return { abv: null, energy: null, sugar: null };

        const text = el.innerText;

        const abv =
            text.match(/\bABV:\s*([\d.]+%)/i)?.[1] ||
            null;

        const energy =
            text.match(/\bEnergy\b\s*([\d]+kJ\s*\/\s*[\d.]+kcal)/i)?.[1]?.replace(/\s+/g, '') ||
            text.match(/\bCalories:\s*([\d.]+kcal)\s*\/\s*100ml/i)?.[1] + '/100ml' ||
            text.match(/\bCalories:\s*([\d.]+kcal)\b/i)?.[1] ||
            null;

        const sugar =
            text.match(/\bof which sugars\s*([\d.]+g)/i)?.[1] ||
            text.match(/\bSugar:\s*([\d.]+g)\s*\/\s*100ml/i)?.[1] + '/100ml' ||
            text.match(/\bSugar:\s*([\d.]+g)\b/i)?.[1] ||
            null;

        return { abv, energy, sugar };
    });

    product.abv = extra.abv;
    product.energy = extra.energy;
    product.sugar = extra.sugar;

    return product;
}