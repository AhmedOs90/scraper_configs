// services/refiners/sites/amavine.nl.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Netherlands';
    product.currency = 'EUR';

    const scraped = await page.evaluate(() => {
        const getTxt = (el) => (el?.textContent || '').trim();
        const rows = Array.from(
            document.querySelectorAll('.woocommerce-product-attributes.shop_attributes tr')
        );

        const pick = (re) => {
            for (const tr of rows) {
                const label = getTxt(tr.querySelector('th')).toLowerCase();
                const value = getTxt(tr.querySelector('td'));
                if (label && re.test(label)) return (value || '').trim() || null;
            }
            return null;
        };

        const hasWord = (s, word) => new RegExp(`\\b${word}\\b`, 'i').test(s || '');

        const producer = pick(/\b(merk|brand)\b/i);

        let abv = pick(/\b(alcoholpercentage|alcohol percentage)\b/i);
        abv = abv?.replace('Kleiner dan ', '<').trim();

        let energy = pick(/\b(calorie|kcal)\b/i);
        energy = energy
            ?.replace('Deze informatie wordt aangegeven bij elk afzonderlijk product in de online boetiek', '')
            .replace(/\s+/g, ' ')
            .replace(',', '.')
            .trim();

        let sugars = pick(/\b(suiker|suikers|sugars)\b/i);
        sugars = sugars
            ?.replace('Deze informatie wordt aangegeven bij elk afzonderlijk product in de online boetiek', '')
            .replace(/\s+/g, ' ')
            .replace(',', '.')
            .trim();

        let vegan = null;
        const veganVal = pick(/\bvegan\b/i);
        if (veganVal && (/^\s*(ja|yes)\s*$/i.test(veganVal) || hasWord(veganVal, 'vegan'))) {
            vegan = 'vegan';
        }

        let glutenFree = null;
        for (const tr of rows) {
            const label = getTxt(tr.querySelector('th'));
            const value = getTxt(tr.querySelector('td'));
            if (
                hasWord(label, 'gluten') || /glutenvrij/i.test(label) ||
                hasWord(value, 'gluten') || /glutenvrij/i.test(value)
            ) {
                glutenFree = 'gluten free';
                break;
            }
        }

        return { producer, abv, energy, sugars, vegan, glutenFree };
    });

    if (!product.producer && scraped.producer) product.producer = scraped.producer;
    if (!product.abv && scraped.abv) product.abv = scraped.abv;
    if (!product.energy && scraped.energy) product.energy = scraped.energy;
    if (!product.sugar && scraped.sugars) product.sugar = scraped.sugars;
    if (!product.vegan && scraped.vegan) product.vegan = scraped.vegan;
    if (!product.gluten_free && scraped.glutenFree) product.gluten_free = scraped.glutenFree;

    return product;
}