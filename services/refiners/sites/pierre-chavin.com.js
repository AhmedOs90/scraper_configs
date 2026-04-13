// services/refiners/sites/pierre-chavin.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "France";
    product.description = product.description
        .replace(/\s+/g, ' ')
        .replace(' (visual not contractual)', '')
        .trim();

    const { abv, sugar, extras } = await page.evaluate(() => {
        const getValue = label => {
            const dt = [...document.querySelectorAll('section.product-features dt')].find(
                el => el.textContent.trim().toLowerCase() === label.toLowerCase()
            );
            return dt ? dt.nextElementSibling?.textContent.trim() : null;
        };

        return {
            abv: getValue('Alcohol volume'),
            sugar: getValue('Sugar level'),
            extras: {
                manufacturing_method: getValue('Manufacturing method'),
                size: getValue('Format'),
                color: getValue('Color'),
                grapes: getValue('Grape varieties'),
                service_temperature: getValue('Service temperature'),
                year: getValue('Millésime'),
            }
        };
    });

    product.abv = abv;
    product.sugar = sugar;

    product.extras = {
        ...(product.extras || {}),
        ...extras
    };
    //EXTRAS ARE 
    return product;
}