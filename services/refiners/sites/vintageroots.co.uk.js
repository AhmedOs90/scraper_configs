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
    });

    if (flags.vegan) product.vegan = 'Vegan';
    if (flags.gluten) product.gluten_free = 'Gluten free';

    const details = await page.evaluate(() => {
        const el = document.querySelector(
            '.s-hero-split__block-info-3__item-content--list'
        );
        if (!el) return { abv: null, size: null };

        const items = [...el.querySelectorAll('li')].map((li) =>
            li.innerText.trim()
        );

        return {
            abv: items.find((t) => t.includes('%')) || null,
            size: items.find((t) => /\b\d+\s?(cl|ml|l)\b/i.test(t)) || null,
        };
    });

    if (details.abv) product.abv = details.abv;
    if (details.size) {
        product.extras = product.extras || {};
        product.extras.size = details.size;
    }

    const producer = await page.evaluate(() => {
        const el = document.querySelector(
            '.s-hero-split__block-info-3__item-content a'
        );
        return el ? el.textContent.trim() : null;
    });

    if (producer) product.producer = producer;
    return product;
}