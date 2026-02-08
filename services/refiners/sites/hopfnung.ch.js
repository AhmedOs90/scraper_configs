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
    
    const abvText = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('ul.product-attributes li.flx'));

        for (const li of items) {
            const label = li.querySelector('strong')?.innerText.trim();

            if (label && label.includes('Alcohol content')) {
                return li.querySelector('span.right a.tag')?.innerText.trim() ?? null;
            }
        }

        return null;
    });

    if (abvText) {
        const abvMatch = abvText.match(/<?\s*([\d.,]+)\s*%/);
        if (abvMatch) {
            product.abv = `${abvMatch[1].replace(',', '.')}%`;
        }
    }

    return product;
}