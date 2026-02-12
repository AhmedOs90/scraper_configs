// services/refiners/sites/vinmedmere.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'EUR';
    product.price = product.price.replace(',', '.').trim();

    if (product.description) {
        product.description = product.description
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    const abvText = await page.$eval('.description1 .Description_Productinfo', el => el.textContent);
    const match = abvText.match(/(?:Less than\s*)?[\d.,]+\s*%/i);
    if (match) {
        product.abv = match[0].replace(/\s+/g, "").replace('Lessthan', '');
    }
    return product;
}