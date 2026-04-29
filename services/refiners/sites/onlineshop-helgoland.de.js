// services/refiners/sites/onlineshop-helgoland.de.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Germany';

    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    product.extras ??= {};

    const description = product.description;

    const labels = [
        'Beschreibung',
        'Sensorik',
        'Servierempfehlung',
        'Pflichtangaben',
        'Pflichtangaben Deutsch',
        'Bezeichnung',
        'Zutaten',
        'Farbstoff',
        'Nettofüllmenge',
        'Herkunftsland',
        'Hersteller',
        'Lagerung',
        'Mindesthaltbarkeitsdatum',
        'Nährwertangaben pro 100 ml',
        'Nährwerte pro 100 ml',
        'Nährwertangaben',
        'Nährwerte',
        'Energie',
        'Fett',
        'davon gesättigte Fettsäuren',
        'Kohlenhydrate',
        'davon Zucker',
        'Ballaststoffe',
        'Eiweiß',
        'Salz',
        'Allergene',
        'Alkoholgehalt'
    ];

    const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const labelPattern = label => escapeRegex(label).replace(/\s+/g, '\\s+');

    const cleanValue = value => value
        ?.replace(/^\(+|\)+$/g, '')
        ?.replace(/[.,]\s*$/, '')
        ?.trim() ?? null;

    const get = label => {
        const current = labelPattern(label);
        const next = labels
            .filter(item => item !== label)
            .map(labelPattern)
            .join('|');

        return cleanValue(
            description.match(
                new RegExp(`(?:^|[\\s(])${current}\\s*:?\\s*(.*?)\\s*(?=(?:^|[\\s(])(?:${next})\\s*:?|$)`, 'i')
            )?.[1]
        );
    };

    const abv = description.match(/Alkoholgehalt\s*:?\s*(<?\s*\d+(?:[,.]\d+)?)\s*%\s*(?:vol\.?)?/i)?.[1]
        ?? description.match(/(\d+(?:[,.]\d+)?)\s*%\s*(?:vol\.?)?/i)?.[1];

    if (abv) {
        product.abv = `${abv.replace(',', '.').replace(/\s+/g, '')}%`;
    }

    product.extras.ingredients = get('Zutaten');
    product.extras.size = get('Nettofüllmenge');

    product.energy = get('Energie');
    product.extras.fat = get('Fett');
    product.extras.saturated_fatty_acids = get('davon gesättigte Fettsäuren');
    product.extras.carbohydrates = get('Kohlenhydrate');
    product.sugar = get('davon Zucker');
    product.extras.protein = get('Eiweiß');
    product.extras.salt = get('Salz');
    return product;
}