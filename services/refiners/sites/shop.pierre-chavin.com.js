// services/refiners/sites/shop.pierre-chavin.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "France";
    product.description = product.description
        .replace(/\s+/g, ' ')
        .replace(' (visual not contractual)', '')
        .trim();

    const { abv, sugar } = await page.evaluate(() => {
        const getValue = label => {
        const dt = [...document.querySelectorAll('section.product-features dt')].find(
            el => el.textContent.trim().toLowerCase() === label.toLowerCase()
        );
        return dt ? dt.nextElementSibling?.textContent.trim() : null;
        };

        return {
            abv: getValue('Alcohol volume'),
            sugar: getValue('Sugar level'),
        };
    });

    product.abv = abv;
    product.sugar = sugar;

    return product;
}
