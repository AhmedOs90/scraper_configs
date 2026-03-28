// services/refiners/sites/drinknolow.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const data = await page.evaluate(() => {
        const spans = document.querySelectorAll("span.metafield-multi_line_text_field");

        if (!spans.length) {
            return { vegan: false, glutenfree: false, abv: null, ingredients: null };
        }

        const text = Array.from(spans).map(s => s.innerText).join(" ");
        const lower = text.toLowerCase();

        const abvMatch =
            lower.match(/less\s+than\s+(\d+(?:\.\d+)?)\s*%/) ||
            lower.match(/<\s*(\d+(?:\.\d+)?)\s*%/);

        const ingredients = text
            .replace(/\s+/g, " ")
            .trim();

        return {
            vegan: lower.includes("vegan"),
            glutenfree: lower.includes("gluten"),
            abv: abvMatch ? `${abvMatch[1]}%` : null,
            ingredients
        };
    });

    product.extras = product.extras || {};
    product.extras.ingredients = data.ingredients || null;

    product.vegan = data.vegan ? "Vegan" : product.vegan || null;
    product.gluten_free = data.glutenfree ? "Gluten free" : product.gluten_free || null;
    product.abv = data.abv || product.abv || null;

    return product;
}