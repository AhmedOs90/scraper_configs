// services/refiners/sites/philipsonwine.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';
    product.name = product.name.replace(' | Philipson Wine', '').trim();
    product.price = product.price.replace(',', '.').trim();

    const extras = await page.evaluate(() => {
        const getField = (label) => {
            const fields = Array.from(document.querySelectorAll('.field'));
            const match = fields.find(f =>
                f.querySelector('.field__key')?.textContent.trim() === label
            );
            return match?.querySelector('.field__value')?.textContent.trim() || null;
        };

        return {
            grapes: getField('Druesorter'),
            size: getField('Flaskestørrelse'),
            abvRaw: getField('Alkoholprocent'),
        };
    });

    product.extras = {
        ...product.extras,
        grapes: extras.grapes,
        size: extras.size,
    };

    if (extras.abvRaw === 'Alkoholfri') {
        product.abv = '<0.5%';
    }
    return product;
}