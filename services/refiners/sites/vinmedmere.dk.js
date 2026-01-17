// services/refiners/sites/vinmedmere.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';
    product.price = product.price
        .replace(' DKK', '')
        .replace(',', '.')
        .trim();

    if (product.description) {
        product.description = product.description
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    const abvText = await page.$eval(
        '.pane.m-product-additional-info.customdata',
        el => el.textContent.trim()
    );

    const match = abvText.match(/[\d.,]+\s*%/);
    if (match) {
        product.abv = match[0].replace(/\s+/g, "");
    }

    return product;
}