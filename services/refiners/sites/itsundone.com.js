// services/refiners/sites/itsundone.com.js

export default async function refine(rootUrl, product, page) {
    // Dismiss overlays (cookie banner + newsletter popup)
    try {
        await page.evaluate(() => {
            document.querySelector("button.cky-btn-accept")?.click();
            document.querySelector(".popup-close")?.click();
            document.querySelector("button[aria-label='Close']")?.click();
        });
    } catch { }

    // Currency is always USD
    product.currency = "USD";

    // Country fallback (site is the US storefront)
    if (!product.country) {
        product.country = 'United States';
    }

    // Clean price — the .sales-price element contains "Sale price$61.00"
    if (product.price && typeof product.price === "string") {
        product.price = product.price
            .replace(/sale\s*price/i, "")
            .replace(/[^0-9.,]/g, "")
            .trim();
    }

    // Fallback: extract price from page if still missing
    if (!product.price) {
        product.price = await page
            .evaluate(() => {
                const el = document.querySelector(
                    ".h4.sales-price, .price-list--product .sales-price, [class*='sales-price']"
                );
                if (!el) return null;
                return el.textContent
                    .replace(/sale\s*price/i, "")
                    .replace(/[^0-9.,]/g, "")
                    .trim();
            })
            .catch(() => null);
    }

    // Extract brand from JSON-LD schema
    if (!product.producer) {
        product.producer = await page.evaluate(() => {
            try {
                const scripts = document.querySelectorAll(
                    'script[type="application/ld+json"]'
                );
                for (const s of scripts) {
                    const data = JSON.parse(s.textContent);
                    if (data["@type"] === "Product" && data.brand?.name) {
                        return data.brand.name;
                    }
                }
            } catch { }
            return null;
        });
    }

    // Fallback: brand is always UNDONE
    if (
        !product.producer ||
        product.producer === "undone-us" ||
        product.producer === "itsundone"
    ) {
        product.producer = "UNDONE";
    }

    // Clean up description
    if (product.description) {
        product.description = product.description
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    // Vegan / gluten-free hints (if present in description)
    const desc = (product.description || '').toLowerCase();
    if (!product.vegan && /\bvegan\b/.test(desc)) {
        product.vegan = 'Vegan';
    }
    if (!product.gluten_free && /\bgluten\s*free\b|\bgluten-free\b/.test(desc)) {
        product.gluten_free = 'Gluten free';
    }

    return product;
}
