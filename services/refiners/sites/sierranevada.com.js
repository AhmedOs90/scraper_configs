// services/refiners/sites/sierranevada.com.js
export default async function refine(rootUrl, product, page) {

    product.description = await page.evaluate(() => {
        const nodes = document.querySelectorAll('.styles_productDescription__W7aFv .styles_productDescription__prMDV');
        if (nodes.length < 2) return "";

        const full = nodes[1];

        return full.textContent
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim();
    });

    const stats = await page.evaluate(() => {
        const getVal = (label) => {
            const el = [...document.querySelectorAll('.stat')].find(s =>
                s.querySelector('.stat-title')?.innerText.trim().toLowerCase() === label
            );
            return el ? el.querySelector('p')?.innerText.trim() : null;
        };

        return {
            abv: getVal('alcohol by volume (abv)'),
            carbs: getVal('carbs'),
            calories: getVal('calories')
        };
    });

    product.abv = stats.abv;
    product.sugar = stats.carbs;
    product.energy = stats.calories;

    product.country = "USA";
    product.currency = "USD";
    product.producer = "Sierra Nevada Brewing Co.";
    product.price = product.price.replace("$", "").trim();
    
    return product;
}