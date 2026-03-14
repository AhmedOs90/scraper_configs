// services/refiners/sites/nordiskkombucha.dk.js
export default async function refine(rootUrl, product, page) {
    product.producer = 'Nordisk Kombucha';
    product.country = 'Denmark';
    product.currency = 'DKK';
    product.abv = '<0.5% ABV';

    product.description = product.description
        ?.replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (product.price == null) {
        await page.waitForSelector('.woocommerce-variation-price, .nk-bundle-price', { timeout: 10000 });
        product.price = await page.evaluate(() => {
            const el =
                document.querySelector('.woocommerce-variation-price') ||
                document.querySelector('.nk-bundle-price');
            if (!el) return null;
            return el.textContent;
        });
    }

    product.price = product.price
        ?.replace(',', '.')
        .replace(/\s*kr\.\s*-?/, '')
        .trim();

    const energyMatch = product.description.match(/Energi\s*([\d.,]+\s*kJ\/\s*[\d.,]+\s*kcal)/i);
    if (energyMatch) {
        product.energy = energyMatch[1];
    }

    const sugarMatch = product.description.match(/Sukkerindhold:\s*([\d.,]+%)/i);
    if (sugarMatch) {
        product.sugar = sugarMatch[1];
    }
    return product;
}