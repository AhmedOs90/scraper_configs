// services/refiners/sites/trade.bemakers.com.js
export default async function refine(rootUrl, product, page) {
    if (product.price) {
        const [price, currency] = product.price.split(" ");
        product.price = price.replace(",", ".") || null;
        product.currency = currency || null;
    }

    if (product.country) {
        product.country = product.country.replace(/\s*\(.*?\)\s*/g, "").trim();
    }

    if (product.description) {
        product.description = product.description
            .replace(/<[^>]*>/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    const producer = await page.evaluate(() => {
        const dataLayer = window.dataLayer || [];
        const event = dataLayer.find(e => e.event === "view_item");
        return event?.ecommerce?.items?.[0]?.item_brand || null;
    });

    product.producer = producer;
    return product;
}