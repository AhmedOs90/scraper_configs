// services/refiners/sites/craftbeer-shop.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Germany';
    product.currency = 'EUR';
    product.price = product.price
        .replace(',', '.')
        .replace('€', '')
        .trim();
    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const attrs = await page.evaluate(() => {
        const rows = [
            ...document.querySelectorAll(
                '.productdetails-tabs__description-attributes table tr'
            ),
        ];

        const map = {};

        for (const row of rows) {
            const labelEl = row.querySelector('.attr-label');
            const valueEl = row.querySelector('.attr-value');

            if (!labelEl || !valueEl) continue;

            const label = labelEl.textContent
                .replace(/[:‍]/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            const value = valueEl.textContent
                .replace(/\s+/g, ' ')
                .trim();

            if (label && value) map[label] = value;
        }

        return map;
    });

    product.abv = attrs['Alkoholgehalt'] || null;
    product.energy = attrs['Energiegehalt'] || null;
    product.sugar = attrs['davon Zucker'] || null;
    product.producer = attrs['Hersteller'] || null;

    product.extras ??= {};

    product.extras.bitterness = attrs['Bittereinheiten'] || null;
    product.extras.serving_temperature = attrs['Genusstemperatur'] || null;
    product.extras.carbohydrates = attrs['Kohlenhydrate'] || null;
    product.extras.salt = attrs['Salz'] || null;
    product.extras.gravity = attrs['Stammwürze'] || null;
    product.extras.fatty_acids = attrs['davon gesättigte Fettsäuren'] || null;
    product.extras.fat = attrs['Fettgehalt'] || null;
    product.extras.weight = attrs['Versandgewicht'] || null;
    product.extras.size = attrs['Inhalt'] || null;
    return product;
}