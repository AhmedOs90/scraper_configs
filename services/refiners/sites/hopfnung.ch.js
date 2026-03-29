// services/refiners/sites/hopfnung.ch.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Switzerland';
    product.currency = 'CHF';

    product.description = product.description
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    product.producer = product.producer
        .replace('Manufacturer: ', '')
        .trim();

    product.price = product.price
        .replace('CHF', '')
        .trim();

    const energyMatch = product.description.match(/Calories:\s*([\d.,]+)\s*kcal/i);
    if (energyMatch) {
        product.energy = `${energyMatch[1].replace(',', '.')} kcal`;
    }

    const carbMatch = product.description.match(/Carbohydrates:\s*([\d.,]+)\s*g/i);
    if (carbMatch) {
        product.sugar = `${carbMatch[1].replace(',', '.')} g`;
    }

    const attrs = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('ul.product-attributes li'));

        let abvText = null;
        let ingredients = null;
        let size = null;

        for (const li of items) {
            const label = li.querySelector('strong')?.innerText.trim();

            if (!label) continue;

            if (label.includes('Alkoholgehalt')) {
                abvText =
                    li.querySelector('span.right a.tag')?.innerText.trim() ||
                    li.querySelector('span.tag')?.innerText.trim() ||
                    null;
            }

            if (label.includes('Zutaten')) {
                ingredients = Array.from(li.querySelectorAll('a.tag'))
                    .map((a) => a.innerText.replace(/^\*/, '').trim())
                    .filter(Boolean);
            }

            if (label.includes('Inhalt')) {
                size =
                    li.querySelector('span.right a.tag')?.innerText.trim() ||
                    li.querySelector('span.tag')?.innerText.trim() ||
                    null;
            }
        }

        return { abvText, ingredients, size };
    });

    if (attrs.abvText) {
        const abvMatch = attrs.abvText.match(/<?\s*([\d.,]+)\s*%/);
        if (abvMatch) {
            product.abv = `${abvMatch[1].replace(',', '.')}%`;
        }
    }

    product.extras = product.extras || {};

    if (attrs.ingredients?.length) {
        product.extras.ingredients = attrs.ingredients;
    }

    if (attrs.size) {
        product.extras.size = attrs.size;
    }
    return product;
}