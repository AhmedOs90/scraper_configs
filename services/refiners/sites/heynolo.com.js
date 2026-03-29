// services/refiners/sites/heynolo.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';

    product.name = product.name.replace(product.producer, "").trim();

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.extras = product.extras || {};

    product.extras.ingredients = await page.evaluate(() => {
        const blocks = [...document.querySelectorAll('details')];
        const match = blocks.find(d => {
            const h = d.querySelector('h3');
            return h && h.textContent.trim().toLowerCase() === 'ingredients';
        });
        const text = match?.querySelector('.metafield-rich_text_field')?.textContent || '';
        return text.replace(/\s+/g, ' ').trim();
    });
    return product;
}