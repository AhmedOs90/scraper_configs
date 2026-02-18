// services/refiners/sites/onestopwineshop.com.js
export default async function refine(rootUrl, product, page) {

    await page.waitForSelector('.product-text .title');

    const data = await page.evaluate(() => {
        const get = (sel) => document.querySelector(sel)?.textContent.trim() || null;

        return {
            name: get(".product-text .title"),
            images: Array.from(document.querySelectorAll(".product-image img")).map(
                (i) => i.src
            ),
            price:
                document
                    .querySelector(".c7-product__add-to-cart__price > span:nth-of-type(2)")
                    ?.textContent.replace(/\s+/g, "").trim() || null,
            description: get(".detail-more-about h3 + p")
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

    product.country = "USA";
    product.currency = "USD";
    
    return product;
}