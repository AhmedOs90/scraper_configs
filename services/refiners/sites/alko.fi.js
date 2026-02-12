// services/refiners/sites/alko.fi.js
export default async function refine(rootUrl, product, page) {
    product.price = await page.$eval('.js-price-container', el => el.getAttribute('content'));
    product.currency = "EUR";
    product.country = "Finland";

    const details = await page.evaluate(() => {
        const getFact = (label) => {
            const el = [...document.querySelectorAll('.fact-label')]
                .find(e => e.textContent.trim().toUpperCase() === label);
            return el?.nextElementSibling?.textContent.trim() || null;
        };

        return {
            abv: getFact('ALCOHOL'),
            sugar: getFact('SUGAR'),
            energy: getFact('ENERGY'),
        };
    });

    product.abv = details.abv;
    product.sugar = details.sugar;
    product.energy = details.energy;
    return product;
}