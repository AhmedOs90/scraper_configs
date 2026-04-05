// services/refiners/sites/trade.bemakers.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';

    product.price = product.price
        ?.replace(',', '.')
        .replace('DKK', '')
        .trim();

    product.description = product.description
        ?.replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim() || null;

    product.producer = await page.evaluate(() => {
        const dataLayer = window.dataLayer || [];
        const event = dataLayer.find(e => e.event === 'view_item');
        return event?.ecommerce?.items?.[0]?.item_brand || null;
    });

    product.extras = await page.evaluate(() => {
        const getSectionText = (title) => {
            const buttons = [...document.querySelectorAll('[data-collapse-target="button"]')];

            const btn = buttons.find(b =>
                b.textContent.trim().toLowerCase().includes(title)
            );

            if (!btn) return null;

            const container = btn.closest('[data-controller="collapse"]');
            const body = container?.querySelector('[data-collapse-target="body"]');

            return body?.textContent.replace(/\s+/g, ' ').trim() || null;
        };

        return {
            ingredients: getSectionText('ingredients'),
            allergens: getSectionText('allergens'),
        };
    });
    return product;
}