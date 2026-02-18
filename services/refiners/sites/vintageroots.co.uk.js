// services/refiners/sites/vintageroots.co.uk.js
export default async function refine(rootUrl, product, page) {
    product.name = product.name?.replace(' (label change)', '').trim();
    product.price = product.price?.replace('£', '').trim();
    product.country = 'UK';
    product.currency = 'GBP';
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const flags = await page.evaluate(() => {
        const labels = [...document.querySelectorAll(
            '.s-hero-split__block-info-cat-block-item p'
        )].map(el => el.textContent.toLowerCase());

        return {
            vegan: labels.some(text => text.includes('vegan')),
            gluten: labels.some(text => text.includes('gluten')),
        };
    })

    if (flags.vegan) product.vegan = 'Vegan';
    if (flags.gluten) product.gluten_free = 'Gluten free';

    const abv = await page.evaluate(() => {
        const el = document.querySelector(
            '.s-hero-split__block-info-3__item-content--list'
        );
        if (!el) return null;

        const items = [...el.querySelectorAll('li')].map((li) =>
            li.innerText.trim()
        );

        return items.find((t) => t.includes('%')) || null;
    });

    if (abv) product.abv = abv;

    const producer = await page.evaluate(() => {
        const el = document.querySelector(
            '.s-hero-split__block-info-3__item-content a'
        );
        return el ? el.textContent.trim() : null;
    });

    if (producer) product.producer = producer;
    return product;
}