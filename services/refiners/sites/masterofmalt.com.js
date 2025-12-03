// services/refiners/sites/masterofmalt.com.js
export default async function refine(rootUrl, product, page) {
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    product.country = "UK";
    product.currency = "GBP";
    product.price = product.price
        .replace(/[^\d.]/g, "")
        .slice(0, 5);

    product.abv = await page.evaluate(() => {
        const el = document.querySelector(".flex.flex-wrap .flex.items-center");
        if (!el) return null;
        const text = el.textContent || "";
        const match = text.match(/(\d+(?:\.\d+)?)%/);
        return match ? match[0] : null;
    });

    return product;
}