// services/refiners/sites/beyondbeer.de.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Germany';

    product.abv = await page.evaluate(() => {
        const rows = document.querySelectorAll("table.product-detail-properties-table tr.properties-row");
        for (let row of rows) {
            const label = row.querySelector("th.properties-label")?.textContent?.trim().toLowerCase();
            const value = row.querySelector("td.properties-value")?.textContent?.trim();

            if (label && label.includes("alkoholgehalt")) {
                return value.replace(',', '.').replace(' %', '%').trim() || null;
            }
        }
        return null;
    }).catch(() => null);

    const nutrition = await page.evaluate(() => {
        const container = document.querySelector('[itemprop="description"]');
        if (!container) return {};

        const normalized = container.innerText
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const extractValue = (patterns) => {
            for (const pattern of patterns) {
                const match = normalized.match(pattern);
                if (match?.[1]) {
                    return `${match[1].replace(',', '.').trim()}g`;
                }
            }
            return null;
        };

        const energy = (() => {
            const match = normalized.match(
                /(?:energie|brennwert|energy)\s*\((?:kj\/kcal)\)\s*([0-9]+(?:[.,][0-9]+)?\s*(?:kj)?\s*\/\s*[0-9]+(?:[.,][0-9]+)?\s*(?:kcal)?)/i
            );

            if (!match?.[1]) return null;

            let value = match[1]
                .replace(/\s+/g, '')
                .replace(',', '.');

            const parts = value.split('/');
            if (parts.length !== 2) return value;

            let kj = parts[0];
            let kcal = parts[1];

            if (!/kj$/i.test(kj)) kj += 'kJ';
            if (!/kcal$/i.test(kcal)) kcal += 'kcal';

            return `${kj} / ${kcal}`;
        })();

        return {
            energy,
            sugar: extractValue([
                /(?:davon\s+zucker|zucker)\s*\(g\)\s*([0-9]+(?:[.,][0-9]+)?)/i,
                /(?:of\s+which\s+sugars|sugars?)\s*\(g\)\s*([0-9]+(?:[.,][0-9]+)?)/i,
            ]),
            fat: extractValue([
                /(?:^|[\s/])fett\s*\(g\)\s*([0-9]+(?:[.,][0-9]+)?)/i,
                /(?:^|[\s/])fat\s*\(g\)\s*([0-9]+(?:[.,][0-9]+)?)/i,
            ]),
            carbohydrates: extractValue([
                /kohlenhydrate\s*\(g\)\s*([0-9]+(?:[.,][0-9]+)?)/i,
                /carbohydrates\s*\(g\)\s*([0-9]+(?:[.,][0-9]+)?)/i,
            ]),
            protein: extractValue([
                /eiwei(?:ß|ss)\s*\(g\)\s*([0-9]+(?:[.,][0-9]+)?)/i,
                /protein\s*\(g\)\s*([0-9]+(?:[.,][0-9]+)?)/i,
            ]),
            salt: extractValue([
                /salz\s*\(g\)\s*([0-9]+(?:[.,][0-9]+)?)/i,
                /salt\s*\(g\)\s*([0-9]+(?:[.,][0-9]+)?)/i,
            ]),
        };
    }).catch(() => ({}));

    product.energy = nutrition.energy || null;
    product.sugar = nutrition.sugar || null;

    product.extras = {
        fat: nutrition.fat || null,
        carbohydrates: nutrition.carbohydrates || null,
        protein: nutrition.protein || null,
        salt: nutrition.salt || null,
    };
    return product;
}