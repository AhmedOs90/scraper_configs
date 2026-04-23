// services/refiners/sites/tastillery.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Germany';
    product.price = product.price.replace(',', '.').trim();
    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const detailsText = await page.evaluate(() => {
        const section = [...document.querySelectorAll('section')]
            .find(el => /THE NERDY DETAILS/i.test(el.textContent || ''));

        return (section?.textContent || document.body.textContent || '')
            .replace(/\s+/g, ' ')
            .trim();
    });

    const pick = (regex) => detailsText.match(regex)?.[1]?.trim();

    const rawAbv = pick(/ALKOHOLGEHALT\s*:?\s*([<>]?[\d.,]+\s*%(?:\s*Vol\.?)?)/i);
    product.abv = rawAbv
        ?.replace(',', '.')
        .replace(/Vol\.?/i, '')
        .trim();
        
    product.energy = pick(/(?:Energie|Brennwert)\s*:?\s*([<>]?[\d.,]+\s*kJ(?:\s*\/\s*[\d.,]+\s*kcal)?)/i);
    product.sugar = pick(/davon Zucker\s*:?\s*([<>]?[\d.,]+\s*g)/i);

    product.extras ||= {};
    product.extras.size = pick(/INHALT\s*:?\s*([<>]?[\d.,]+\s*[Ll])/i);
    product.extras.fat = pick(/Fett\s*:?\s*([<>]?[\d.,]+\s*g)/i);
    product.extras.carbohydrates = pick(/Kohlenhydrate\s*:?\s*([<>]?[\d.,]+\s*g)/i);
    product.extras.protein = pick(/(?:Eiweiß|Eiweiss)\s*:?\s*([<>]?[\d.,]+\s*g)/i);
    product.extras.salt = pick(/Salz\s*:?\s*([<>]?[\d.,]+(?:,\d+)?\s*g)/i);
    return product;
}