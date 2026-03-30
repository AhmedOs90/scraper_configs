// services/refiners/sites/boisson.co.js
export default async function refine(rootUrl, product, page) {
    product.country = "USA";

    const data = await page.evaluate(() => {
        const el = document.querySelector("#description-1");
        if (!el) return { abv: null, size: null };

        const text = el.innerText;

        const abvMatch = text.match(/(\d+(\.\d+)?%)/);
        const sizeMatch = text.match(/Product Size:\s*([^\n]+)/i);

        return {
            abv: abvMatch ? abvMatch[1] : null,
            size: sizeMatch ? sizeMatch[1].trim() : null
        };
    });

    product.abv = data.abv;

    product.extras = product.extras || {};
    product.extras.size = data.size;

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    return product;
}