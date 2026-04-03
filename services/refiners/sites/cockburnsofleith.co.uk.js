// services/refiners/sites/cockburnsofleith.co.uk.js
export default async function refine(rootUrl, product, page) {
    product.country = "UK";
    product.currency = "GBP";
    product.price = product.price.replace("£", "").trim();
    product.description = product.description
        ?.replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const attrs = await page.$$eval(
        ".woocommerce-product-attributes li",
        (items) =>
            items.map((item) => {
                const label = item
                    .querySelector(".woocommerce-product-attributes-item__label")
                    ?.textContent.trim();

                const values = Array.from(
                    item.querySelectorAll(".woocommerce-product-attributes-item__value a")
                ).map((a) => a.textContent.trim());

                return { label, values };
            })
    );

    product.extras = {};

    for (const { label, values } of attrs) {
        if (!label || !values.length) continue;

        const key = label.toLowerCase().replace(/\s+/g, "_");
        const value = values.length === 1 ? values[0] : values;

        if (key === "abv") {
            product.abv = value;
            continue;
        }

        if (key === "producer") {
            product.producer = value;
            continue;
        }

        product.extras[key] = value;
    }
    return product;
}