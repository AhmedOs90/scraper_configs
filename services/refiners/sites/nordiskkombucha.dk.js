// services/refiners/sites/nordiskkombucha.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';
    product.producer = 'Nordisk Kombucha';
    product.description = product.description
        ?.replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (product.price == null) {
        await page.waitForSelector('.woocommerce-variation-price, .nk-bundle-price', { timeout: 10000 });
        product.price = await page.evaluate(() => {
            const el =
                document.querySelector('.woocommerce-variation-price') ||
                document.querySelector('.nk-bundle-price');
            if (!el) return null;
            return el.textContent;
        });
    }

    product.price = product.price
        ?.replace(',', '.')
        .replace(/\s*kr\.\s*-?/, '')
        .trim();

    const normalize = (val) =>
        val
            .replace(',', '.')
            .replace(/\s+/g, '')
            + '/100ml';

    const energyMatch = product.description.match(/Energi\s*([\d.,]+\s*kJ\s*\/\s*[\d.,]+\s*kcal)/i);
    if (energyMatch) {
        product.energy = energyMatch[1].replace(/\s+/g, '');
    }

    const sugarMatch = product.description.match(/(?:Heraf sukkerarter|Sukkerindhold:)\s*([\d.,]+(?:%|\s*g))/i);
    if (sugarMatch) {
        const sugarValue = sugarMatch[1];
        product.sugar = /g/i.test(sugarValue) ? normalize(sugarValue) : sugarValue.replace(',', '.');
    }

    product.extras ??= {};

    const carbsMatch = product.description.match(/Kulhydrater\s*([\d.,]+\s*g)/i);
    if (carbsMatch) {
        product.extras.carbohydrates = normalize(carbsMatch[1]);
    }

    const organicAcidsMatch = product.description.match(/Organiske syrer\s*([\d.,]+\s*g)/i);
    if (organicAcidsMatch) {
        product.extras.organic_acids = normalize(organicAcidsMatch[1]);
    }

    const fatMatch = product.description.match(/Fedt\s*([\d.,]+\s*g)/i);
    if (fatMatch) {
        product.extras.fat = normalize(fatMatch[1]);
    }

    const proteinMatch = product.description.match(/Protein\s*([\d.,]+\s*g)/i);
    if (proteinMatch) {
        product.extras.protein = normalize(proteinMatch[1]);
    }

    const saltMatch = product.description.match(/Salt\s*([\d.,]+\s*g)/i);
    if (saltMatch) {
        product.extras.salt = normalize(saltMatch[1]);
    }

    const abvMatch = product.description.match(/Alkohol\s*([<>]?[\d.,]+\s*g)/i);
    if (abvMatch) {
        product.abv = normalize(abvMatch[1]);
    }
    return product;
}