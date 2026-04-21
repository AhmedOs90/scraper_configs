// services/refiners/sites/hawesko.de.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Germany';
    product.currency = 'EUR';

    product.name = product.name.replace(' | Hawesko.de', '').trim();

    product.price = product.price
        .replace('€', '')
        .replace('statt  ', '')
        .replace(',', '.')
        .trim();

    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const details = await page.evaluate(() => {
        const out = {};
        const items = [...document.querySelectorAll('.product-features-list__item')];

        for (const item of items) {
            const labels = [...item.querySelectorAll('.product-features-list__label')];
            const values = [...item.querySelectorAll('.product-features-list__value')];

            labels.forEach((label, i) => {
                out[label.textContent.trim()] = values[i]?.textContent?.trim() || '';
            });
        }

        return out;
    });

    product.abv =
        details['Alkoholgehalt']?.match(/^[^(]+(?:\([^)]*\))?/)?.[0]?.trim() || null;

    if (product.abv == 'Alkoholfrei (Enthält weniger als 0,5 % Vol. Alkohol)') {
        product.abv = '<0.5%';
    }

    product.energy =
        details['Brennwert']?.match(/[0-9.,]+\s*kJ\s*\/\s*[0-9.,]+\s*kcal/i)?.[0] || null;

    product.sugar =
        details['Kohlenhydrate']?.match(/davon Zucker:\s*([0-9.,]+\s*g)/i)?.[1] || null;

    product.extras = product.extras || {};

    product.extras.allergens = details['Allergenhinweis'] || null;
    product.extras.size = details['Füllmenge'] || null;
    product.extras.color = details['Farbe'] || null;
    product.extras.grape_varieties = details['Rebsorten'] || null;
    product.extras.clousre = details['Verschluss'] || null;

    product.extras.fat = details['Fett'] || null;

    product.extras.carbohydrates =
        details['Kohlenhydrate']
            ?.replace(/\s*[,;]?\s*davon Zucker:.*$/i, '')
            .trim() || null;

    product.extras.protein = details['Eiweiß'] || null;
    product.extras.salt = details['Salz'] || null;
    product.extras.ingredients = details['Zutaten'] || null;
    return product;
}