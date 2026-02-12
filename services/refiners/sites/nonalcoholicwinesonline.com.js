// services/refiners/sites/nonalcoholicwinesonline.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "USA";
    product.description = product.description?.replace(/\s+/g, " ").trim();

    const vendor = await page.evaluate(() => {
        const script = document.querySelector("#web-pixels-manager-setup");
        if (!script) return null;
        const match = script.textContent.match(/"vendor":"([^"]+)"/);
        return match ? match[1] : null;
    });
    if (vendor) product.producer = vendor;

    const abvMatch = product.description.match(/(?:Ethanol|Percentage Alcohol):\s*([^<>\n:]+)/i);
    if (abvMatch) {
        product.abv = abvMatch[1].trim();
    }

    const calMatch = product.description.match(/Calories(?:\/Serving)?:\s*[:]?([A-Za-z0-9<>\s.()]+)/i);
    if (calMatch) {
        let calories = calMatch[1].replace(/approximately|approx\.?|Cases Produced/gi, "").trim();
        product.energy = calories;
    }

    const carbMatch = product.description.match(/Carbohydrates:\s*[:]?([A-Za-z0-9<>\s.()]+)/i);
    if (carbMatch) {
        let sugar = carbMatch[1].replace(/Percentage Juice/gi, "").trim();
        product.sugar = sugar;
    }

    const descLower = product.description.toLowerCase();
    if (descLower.includes("vegan")) {
        product.vegan = "Vegan";
    }
    if (descLower.includes("gluten")) {
        product.gluten_free = "Gluten free";
    }

    return product;
}