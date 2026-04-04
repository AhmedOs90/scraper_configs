// services/refiners/sites/onestopwineshop.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "USA";
    product.currency = "USD";

    await page.waitForSelector('.product-text .title');

    const data = await page.evaluate(() => {
        const get = (sel) => document.querySelector(sel)?.textContent.trim() || null;

        const facts = Array.from(
            document.querySelectorAll(".detail-wine-facts .detail-content > div")
        ).reduce((acc, el) => {
            const key = el.querySelector("h3")?.textContent.trim().toLowerCase();
            const val = el.querySelector("p")?.textContent.trim();

            if (key && val) acc[key] = val;
            return acc;
        }, {});

        return {
            name: get(".product-text .title"),
            images: Array.from(document.querySelectorAll(".product-image img")).map(
                (i) => i.src
            ),
            price:
                document
                    .querySelector(".c7-product__add-to-cart__price > span:nth-of-type(2)")
                    ?.textContent.replace(/\s+/g, "").trim() || null,
            description: get(".detail-more-about h3 + p"),
            facts
        };
    });

    product.name = data.name;
    product.images = data.images;
    product.price = data.price?.replace("$", "").trim();
    product.description =
        data.description
            ?.replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim();

    product.sugar = data.facts["residual sugar"] || null;
    product.abv = data.facts["alcohol %"] || null;

    product.extras = {
        ...(product.extras || {}),
        acid: data.facts["acid"] || null,
        ph: data.facts["ph"] || null,
        varietal: data.facts["varietal"] || null,
        appelation: data.facts["appellation"] || null,
        vintage: data.facts["vintage"] || null
    };
    return product;
}