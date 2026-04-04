// services/refiners/sites/osterbrovin.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';

    if (product.price) {
        product.price = product.price.replace(',', '.').trim();
    }

    if (product.producer) {
        product.producer = product.producer.replace('Ved ', '').trim();
    }

    const details = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('.table-description-new tr')];

        const getValue = (label) => {
            for (const row of rows) {
                const cells = [...row.querySelectorAll('td')].map(td => td.textContent.trim());
                for (let i = 0; i < cells.length; i++) {
                    if (cells[i] === label) return cells[i + 1] || '';
                }
            }
            return '';
        };

        return {
            abv: getValue('Alkohol'),
            year: getValue('Årgang'),
            grapes: getValue('Druer'),
            size: getValue('Flaskestørrelse'),
        };
    });

    if (details.abv) {
        product.abv = details.abv.replace('%', '').replace(',', '.').trim();
    }

    product.extras = product.extras || {};

    if (details.year && details.year !== '%') {
        product.extras.year = details.year;
    }

    if (details.grapes) {
        product.extras.grapes = details.grapes;
    }

    if (details.size) {
        product.extras.size = details.size;
    }
    return product;
}