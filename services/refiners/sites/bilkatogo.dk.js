// services/refiners/sites/bilkatogo.dk.js
export default async function refine(rootUrl, product, page) {
    const flatten = (value) =>
        value
            ?.replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim() || null;

    const normalize = (value) =>
        value
            ?.replace(',', '.')
            .trim() || null;

    product.country = 'Denmark';
    product.currency = 'DKK';
    product.extras = product.extras || {};

    product.price = product.price
        .replace(',', '.')
        .replace(/[^0-9.]/g, '')
        .replace(/\.$/, '')
        .trim();

    product.description = flatten(product.description);

    product.producer = await page.$eval(
        '.info-box .product-sub-title b',
        (el) => el.textContent.replace(/\s+/g, ' ').trim()
    ).catch(() => null);

    product.extras.ingredients = await page.$eval(
        '#content-ingredients > div',
        (el) => el.textContent.replace(/\s+/g, ' ').trim()
    ).catch(() => null);

    const nutrition = await page.$$eval(
        '#content-nutritional_100 .row',
        (rows) => {
            const result = {};

            for (const row of rows) {
                const label = row.querySelector('.col-4')?.textContent.toLowerCase().trim();
                const value = row.querySelector('.col-8')?.textContent.trim();

                if (!label || !value) continue;

                if ((label.includes('energy') || label.includes('energi')) && !result.energy) {
                    result.energy = value;
                } else if (label.includes('sugars') || label.includes('sukker')) {
                    result.sugar = value;
                } else if (label.includes('fedt') || label.includes('fat')) {
                    result.fat = value;
                } else if (label.includes('kulhydrat') || label.includes('carbohydrate')) {
                    result.carbohydrates = value;
                } else if (label.includes('protein')) {
                    result.protein = value;
                } else if (label.includes('salt')) {
                    result.salt = value;
                }
            }

            return result;
        }
    );

    product.energy = normalize(nutrition.energy);
    product.sugar = normalize(nutrition.sugar);
    product.extras.fat = normalize(nutrition.fat);
    product.extras.carbohydrates = normalize(nutrition.carbohydrates);
    product.extras.protein = normalize(nutrition.protein);
    product.extras.salt = normalize(nutrition.salt);

    product.extras.size = await page.$$eval(
        '#content-product_details .row',
        (rows) => {
            for (const row of rows) {
                const label = row.querySelector('.col-4')?.textContent.toLowerCase().trim();
                if (label?.includes('netto')) {
                    return row.querySelector('.col-8')?.textContent.replace(/\s+/g, ' ').trim() || null;
                }
            }
            return null;
        }
    );

    product.abv = await page.$$eval(
        '#content-productspecification .row',
        (rows) => {
            for (const row of rows) {
                const label = row.querySelector('.col-4')?.textContent.toLowerCase().trim();
                if (
                    label &&
                    (
                        label.includes('alcohol percentage') ||
                        label.includes('alcohol') ||
                        label.includes('alkoholprocent')
                    )
                ) {
                    return row.querySelector('.col-8')?.textContent.replace(/\s+/g, '').trim() || null;
                }
            }
            return null;
        }
    );

    product.abv = normalize(product.abv);
    return product;
}