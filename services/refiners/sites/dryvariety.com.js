// services/refiners/sites/dryvariety.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Canada';

    let metaText = '';

    try {
        metaText = await page.$$eval(
            '.metafield-rich_text_field',
            nodes => nodes.map(n => n.innerText).join('\n')
        );
    } catch (err) { }

    const text = metaText || '';

    const abvMatch = text.match(
        /Alcohol:\s*(?:<\s*)?\d+(?:\.\d+)?\s*%?\s*(?:ABV)?/i
    );

    const energyMatch = text.match(
        /Calories:\s*\d+(?:\.\d+)?\s*(?:k?cal)?/i
    );

    const sugarsMatch = text.match(
        /Sugars:\s*\d+(?:\.\d+)?\s*g/i
    );

    if (!product.abv && abvMatch) {
        product.abv = abvMatch[0].replace(/Alcohol:\s*/i, '').trim();
    }

    if (!product.energy && energyMatch) {
        product.energy = energyMatch[0].replace(/Calories:\s*/i, '').trim();
    }

    if (!product.sugar && sugarsMatch) {
        product.sugar = sugarsMatch[0].replace(/Sugars:\s*/i, '').trim();
    }
    return product;
}