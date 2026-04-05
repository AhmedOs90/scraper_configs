// services/refiners/sites/wineanthology.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "USA";
    product.currency = "USD";
    product.price = product.price.replace("$", "").trim();

    const size = await page.evaluate(() => {
        const rows = [...document.querySelectorAll(".product-specs-box tr")];
        const row = rows.find(
            (r) => r.querySelector(".spec-name")?.textContent.trim() === "Size"
        );

        return row?.querySelector(".spec-value")?.textContent.trim() || null;
    });

    product.extras = product.extras || {};
    product.extras.size = size;
    return product;
}