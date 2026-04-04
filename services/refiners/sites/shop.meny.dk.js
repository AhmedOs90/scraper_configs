// services/refiners/sites/shop.meny.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';

    product.name = product.name.replace(' | MENY Vin', '').trim();

    product.price = product.price
        .replace(',', '.')
        .replace(' kr.', '')
        .trim();

    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .replace(' Læs mere', '')
        .trim();

    product.producer = product.producer
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const fields = await page.$$eval('#ProductFields .field', rows =>
        Object.fromEntries(
            rows.map(row => {
                const key = row.querySelector('.field__key')?.textContent?.replace(/\s+/g, ' ').trim();
                const value = row.querySelector('.field__value')?.textContent?.replace(/\s+/g, ' ').trim();
                return [key, value];
            }).filter(([k, v]) => k && v)
        )
    );

    product.extras ??= {};
    product.extras.size = fields['Flaskestørrelse'] || null;
    product.extras.grapes = fields['Druesammensætning'] || null;
    product.extras.serving_temperature = fields['Serveringstemperatur'] || null;
    product.sugar = fields['Restsukker'] || null;

    const alcohol = fields['Alkoholprocent'] || '';
    product.abv = /alkoholfri/i.test(alcohol) ? '<0.5%' : alcohol;

    product.extras.tasting_notes = product.extras.tasting_notes
        ?.replace(/<[^>]+>/g, '')
        .replace(/\n|\r|\t/g, ' ')
        .replace(/\s+/g, ' ')
        .replace('Læs vejledning', '')
        .trim() || null;
    return product;
}