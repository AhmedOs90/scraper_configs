// services/refiners/sites/drinknolow.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const flags = await page.evaluate(() => {
        const spans = document.querySelectorAll("span.metafield-multi_line_text_field");
        if (!spans.length) return { vegan: false, glutenfree: false, abv: null };

        const text = Array.from(spans).map(s => s.innerText).join(" ");
        const lower = text.toLowerCase();

        const abvMatch =
            lower.match(/less\s+than\s+(\d+(?:\.\d+)?)\s*%/) ||
            lower.match(/<\s*(\d+(?:\.\d+)?)\s*%/);

        return {
            vegan: lower.includes("vegan"),
            glutenfree: lower.includes("gluten"),
            abv: abvMatch ? `${abvMatch[1]}%` : null,
        };
    });

    product.vegan = flags.vegan ? "Vegan" : product.vegan || null;
    product.gluten_free = flags.glutenfree ? "Gluten free" : product.gluten_free || null;
    product.abv = flags.abv || product.abv || null;

    return product;
}