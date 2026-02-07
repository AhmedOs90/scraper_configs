// services/refiners/sites/boisson.co.js
export default async function refine(rootUrl, product, page) {
    product.country = "USA";

    product.abv = await page.evaluate(() => {
        const el = document.querySelector("#description-1");
        if (!el) return null;

        const text = el.innerText;
        const match = text.match(/(\d+(\.\d+)?%)/);

        return match ? match[1] : null;
    });

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    return product;
}