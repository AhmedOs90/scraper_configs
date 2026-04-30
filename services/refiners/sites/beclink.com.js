// services/refiners/sites/beclink.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';
    product.currency = 'USD';
    product.name = product.name
        .replace(' - beclink.com', '')
        .replace(' | BeClink', '')
        .trim();
    product.price = product.price.replace('$', '').trim();
    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    

    product.extras ??= {};

    const detailsText = await page.evaluate(() => {
        const el = document.querySelector('.coltwo');
        return el?.textContent?.replace(/\s+/g, ' ').trim() || '';
    });

    const labels = [
        'Brand',
        'Origin',
        'Alcohol Content',
        'Certification\\(s\\)',
        'Standardized Calories',
        'Standardized Carbs / Sugar',
        'Volume \\(ml\\)',
        'Common Shot / Wine Pours',
        'Grape Variety',
        'UPC',
        'Categories',
    ];

    const grab = (label) => {
        const stopLabels = labels.filter((item) => item !== label).join('|');
        const re = new RegExp(`${label}:\\s*(.*?)(?=\\s*(?:${stopLabels}):|$)`, 'i');
        return detailsText.match(re)?.[1]?.trim();
    };

    const producer = grab('Brand');
    if (producer != null) product.producer = producer;

    const abv = grab('Alcohol Content');
    if (abv != null) product.abv = abv;

    const calories = grab('Standardized Calories');
    if (calories != null) {
        product.energy = calories.replace(/\s*\(per.*?\)\s*/i, '').trim();
    }

    const carbsSugar = grab('Standardized Carbs / Sugar');
    if (carbsSugar != null) {
        const match = carbsSugar.match(/([\d.]+\s*g?)\s*\/\s*([\d.]+\s*g?)/i);
        if (match) {
            product.extras.carbohydrates = match[1].replace(/\s+/g, '');
            product.sugar = match[2].replace(/\s+/g, '');
        }
    }

    const size = grab('Volume \\(ml\\)');
    if (size != null) product.extras.size = size;

    const servingSize = grab('Common Shot / Wine Pours');
    if (servingSize != null) product.extras.serving_size = servingSize;

    const grapeVariety = grab('Grape Variety');
    if (grapeVariety != null) product.extras.grape_variety = grapeVariety;

    const certs = grab('Certification\\(s\\)') || '';
    if (/vegan/i.test(certs)) product.vegan = 'Vegan';
    if (/halal/i.test(certs)) product.extras.halal = 'Halal';
    return product;
}