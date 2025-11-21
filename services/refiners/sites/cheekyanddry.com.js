// services/refiners/sites/cheekyanddry.com.js
export default async function refine(rootUrl, product, page) {
    product.currency = "USD";
    product.country = "USA";
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    product.price = product.price?.replace("$", "").trim();

    const producer = await page.evaluate(() => {
        const el = document.querySelector('script[type="application/ld+json"]');
        if (!el) return null;
        try {
            const data = JSON.parse(el.textContent.trim());
            return data.brand?.name || null;
        } catch {
            return null;
        }
    });
    product.producer = producer || product.producer;
    
    return product;
}