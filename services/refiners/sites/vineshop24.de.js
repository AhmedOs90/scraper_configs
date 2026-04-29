// services/refiners/sites/vineshop24.de.js
function normalize(text) {
    if (!text) return text;
    return text
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

export default async function refine(rootUrl, product, page) {
    product.country = 'Germany';
    product.currency = 'EUR';
    product.price = product.price.replace(',', '.').replace('€', '').trim();
    product.description = normalize(product.description);

    const data = await page.evaluate(() => {
        const normalize = (text) => {
            if (!text) return text;
            return text
                .replace(/\s+/g, " ")
                .trim();
        };

        const rows = [...document.querySelectorAll('table tr')];

        const getVal = (label) => {
            const row = rows.find(r =>
                r.children[0]?.textContent.trim().toLowerCase().includes(label)
            );
            return row ? normalize(row.children[1].textContent) : null;
        };

        const props = [...document.querySelectorAll('.properties-row')];

        const getProp = (label) => {
            const row = props.find(r =>
                r.querySelector('.properties-label')?.textContent
                    .trim()
                    .toLowerCase()
                    .includes(label)
            );
            return row
                ? normalize(row.querySelector('.properties-value')?.textContent)
                : null;
        };

        const isVegan = props.some(r =>
            r.querySelector('.properties-label')?.textContent
                .toLowerCase()
                .includes('vegan') &&
            r.querySelector('.properties-value i')
        );

        return {
            energy: getVal('energie'),
            sugar: getVal('zucker'),
            extras: {
                fat: getVal('fett'),
                saturated_fatty_acids: getVal('gesättigte'),
                carbohydrates: getVal('kohlenhydrate'),
                protein: getVal('eiweiß'),
                salt: getVal('salz'),

                residual_sugar: getProp('restzucker'),
                size: getProp('füllmenge'),
                taste: getProp('geschmack'),
                acidity: getProp('säure'),
                allergens: getProp('allergene'),
                serving_temperature: getProp('trinktemperatur'),
                abv: getProp('alkoholgehalt')
            },
            vegan: isVegan
        };
    });

    product.energy = normalize(data.energy);
    product.sugar = normalize(data.sugar);

    product.extras = {
        ...product.extras,
        ...Object.fromEntries(
            Object.entries(data.extras).map(([k, v]) => [k, normalize(v)])
        )
    };

    product.abv = normalize(data.extras.abv);

    if (data.vegan) {
        product.vegan = 'Vegan';
    }
    return product;
}