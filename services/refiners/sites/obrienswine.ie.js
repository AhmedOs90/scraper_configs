// services/refiners/sites/obrienswine.ie.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Ireland';

    const abvText = await page.$$eval(
        '.product__highlights .product__highlights-item',
        (items) => {
            return (
                items
                    .map((el) =>
                        (el.textContent || '').replace(/\s+/g, ' ').trim()
                    )
                    .find((t) => /(\d+(?:\.\d+)?)\s*%/.test(t)) || null
            );
        }
    );

    if (abvText) {
        const match = abvText.match(/(\d+(?:\.\d+)?\s*%)/);
        if (match) {
            product.abv = match[1];
        }
    }

    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    return product;
}