// services/refiners/sites/thezeroproof.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';
    product.name = product.name.replace(' | The Zero Proof', '').trim();
    
    const data = await page.evaluate(() => {
        const pillTexts = Array.from(document.querySelectorAll(".btn-pill"))
            .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
            .filter(Boolean);

        const abvText = pillTexts.find((t) => /abv/i.test(t)) || null;
        const abvMatch = abvText ? abvText.match(/([<>]?\s*\d+(?:\.\d+)?\s*%)/i) : null;
        const abv = abvMatch ? abvMatch[1].replace(/\s+/g, "") : null;

        const vegan = pillTexts.some((t) => /vegan/i.test(t));
        const glutenFree = pillTexts.some((t) => /gluten[-\s]?free/i.test(t));

        const scriptTag = document.querySelector("#viewed_product");
        if (!scriptTag) {
            return { abv, vegan, glutenFree, producer: null };
        }

        const content = scriptTag.textContent || "";
        const match = content.match(/Brand:\s*"([^"]+)"/);
        const producer = match ? match[1] : null;

        return { abv, vegan, glutenFree, producer };
    });

    if (data.abv) {
        product.abv = data.abv;
    }

    if (data.vegan) {
        product.vegan = "Vegan";
    }

    if (data.glutenFree) {
        product.gluten_free = "Gluten free";
    }

    if (data.producer) {
        product.producer = data.producer;
    }
    return product;
}