// services/refiners/sites/thenonalcoholicclub.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Australia';
    product.description = product.description
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    const nutritionText = await page.evaluate(() => {
        const collapsibles = Array.from(document.querySelectorAll('.Collapsible.Collapsible--large'));

        const nutrition = collapsibles.find(c => {
            const btn = c.querySelector('button.Collapsible__Button');
            return btn && btn.textContent.trim().startsWith('Nutrition');
        });

        const el = nutrition?.querySelector('.Collapsible__Content');
        return el ? el.innerText.replace(/\s+/g, ' ').trim() : '';
    });

    const energyMatch = nutritionText.match(/Energy\s+(\d+)\s*kJ/i);
    if (energyMatch) {
        product.energy = energyMatch[1];
    }

    const sugarMatch = nutritionText.match(/Sugars\s+([\d.]+)\s*g/i);
    if (sugarMatch) {
        product.sugar = sugarMatch[1];
    }
    return product;
}