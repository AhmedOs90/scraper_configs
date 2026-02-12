// services/refiners/sites/belowbrewco.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'UK';
    product.producer = 'Below Brew Co.';
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const parseNutrition = text => {
        if (!text) return false;

        const clean = text.replace(/\s+/g, " ");
        const energy = clean.match(/Energy\s+([\d.]+)kj/i)?.[1];
        const sugar = clean.match(/sugars\s+([\d.]+)g/i)?.[1];

        if (energy) product.energy = `${energy}kj`;
        if (sugar) product.sugar = `${sugar}g`;

        return Boolean(energy || sugar);
    };

    for (const selector of ['meta[property="og:description"]', 'meta[name="description"]']) {
        try {
            const content = await page.$eval(selector, el => el.getAttribute('content'));
            if (parseNutrition(content)) return product;
        } catch (e) {}
    }

    try {
        const tableText = await page.$eval('.product-description table', el => el.innerText);
        parseNutrition(tableText);
    } catch (e) {}
    return product;
}