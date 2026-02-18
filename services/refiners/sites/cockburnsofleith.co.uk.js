// services/refiners/sites/cockburnsofleith.co.uk.js
export default async function refine(rootUrl, product, page) {
    product.country = "UK";

    product.price = product.price.replace('£', '').trim();
    product.currency = "GBP";

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.abv = await page.$eval(
        '.woocommerce-product-attributes-item--attribute_pa_abv .woocommerce-product-attributes-item__value a',
        el => el.textContent.trim()
    );

    product.producer = await page.$eval(
        '.woocommerce-product-attributes-item--attribute_pa_producer .woocommerce-product-attributes-item__value a',
        el => el.textContent.trim()
    );
    return product;
}