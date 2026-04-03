// services/refiners/sites/evergreencurated.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';

    const producer = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        const productScript = scripts.map(s => {
            try { return JSON.parse(s.innerText); } catch { return null; }
        }).find(s => s && s['@type'] === 'Product');

        return productScript?.brand?.name || null;
    });

    if (producer) product.producer = producer;

    const ingredients = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('summary, .accordion__title, h2, h3, h4'));

        const ingredientsHeading = headings.find(el =>
            el.textContent?.trim().toLowerCase() === 'ingredients'
        );

        if (!ingredientsHeading) return null;

        const details = ingredientsHeading.closest('details');
        const content = details?.querySelector('.accordion__content');

        return content?.textContent
            ?.replace(/\s+/g, ' ')
            .trim() || null;
    });

    if (ingredients) {
        product.extras ??= {};
        product.extras.ingredients = ingredients;
    }
    return product;
}