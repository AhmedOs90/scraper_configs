// services/refiners/sites/mondaydistillery.com.js
export default async function refine(rootUrl, product, page) {
    product.producer = 'Monday Distillery';
    product.currency = 'AUD';
    product.country = 'Australia';
    product.price = `${product.price} / 24 Bottles`;
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.extras = product.extras || {};
    product.extras.ingredients = await page.evaluate(() => {
        const blocks = document.querySelectorAll('.collapsible-content');

        for (const block of blocks) {
            const text = block.textContent.toLowerCase();

            if (!text.includes('ingredients')) {
                continue;
            }

            const p = block.querySelector('p');

            if (!p) {
                continue;
            }

            return p.textContent
                .replace(/ingredients\s*:?\s*/i, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        return null;
    });
    return product;
}