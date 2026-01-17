// services/refiners/sites/bilkatogo.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';

    product.price = product.price
        .replace(',', '.')
        .replace(/[^0-9.]/g, '')
        .replace(/\.$/, '')
        .trim();

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.producer = await page.$eval(
        '.info-box .product-sub-title b',
        el => el.textContent.replace(/\s+/g, ' ').trim()
    ).catch(() => null);

    const nutrition = await page.$$eval(
        '#content-nutritional_100 .row',
        rows => {
            const result = {};
            for (const row of rows) {
                const label = row.querySelector('.col-4')?.textContent.toLowerCase();
                const value = row.querySelector('.col-8')?.textContent.trim();
                if (!label || !value) continue;

                if ((label.includes('energy') || label.includes('energi')) && !result.energy) {
                    result.energy = value; // keeps unit (kJ)
                }

                if (label.includes('sugars') || label.includes('sukker')) {
                    result.sugar = value; // keeps unit (g)
                }
            }
            return result;
        }
    );

    product.energy = nutrition.energy.replace(',', '.').trim();
    product.sugar = nutrition.sugar.replace(',', '.').trim();

    product.abv = await page.$$eval(
        '#content-productspecification .row',
        rows => {
            for (const row of rows) {
                const label = row.querySelector('.col-4')?.textContent.toLowerCase();
                if (
                    label &&
                    (
                        label.includes('alcohol percentage') ||
                        label.includes('alcohol') ||
                        label.includes('alkoholprocent')
                    )
                ) {
                    return row
                        .querySelector('.col-8')
                        ?.textContent
                        .replace(',', '.')
                        .replace(/\s+/g, '')
                        .trim();
                }
            }
            return null;
        }
    );

    return product;
}