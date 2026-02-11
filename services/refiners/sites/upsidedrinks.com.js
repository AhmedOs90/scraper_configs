// services/refiners/sites/upsidedrinks.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Canada';
    product.currency = 'CAD';
    product.price = product.price.replace('$', '').trim();

    product.abv = await page
        .evaluate(() => {
            const paragraphs = document.querySelectorAll("p");
            for (const p of paragraphs) {
                const strong = p.querySelector("strong");
                if (
                    strong &&
                    strong.textContent?.trim().toLowerCase().startsWith("alcohol")
                ) {
                    const span = p.querySelector("span");
                    if (span) {
                        const v = span.textContent.trim();
                        if (v) return v;
                    }

                    const textAfterStrong = p.textContent
                        .replace(strong.textContent, "")
                        .trim();

                    return textAfterStrong || null;
                }
            }
            return null;
        })
        .catch(() => null);

    product.producer = await page
        .evaluate(() => {
            const scripts = Array.from(
                document.querySelectorAll('script[type="application/ld+json"]')
            );

            for (const s of scripts) {
                const raw = s.textContent || "";
                if (!raw.includes('"@type": "Product"')) continue;

                try {
                    const json = JSON.parse(raw);

                    const nodes = Array.isArray(json?.["@graph"])
                        ? json["@graph"]
                        : [json];

                    const prod = nodes.find((n) => n?.["@type"] === "Product");
                    if (!prod) continue;

                    const brand = prod.brand;
                    if (typeof brand === "string") return brand.trim() || null;
                    if (brand && typeof brand === "object") {
                        const name = (brand.name || "").toString().trim();
                        return name || null;
                    }
                } catch {
                    // continue
                }
            }

            return null;
        })
        .catch(() => null);
    return product;
}