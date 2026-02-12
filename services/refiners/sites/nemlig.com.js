// services/refiners/sites/nemlig.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';
    product.name = product.name.replace(' – Leveret med nemlig.com', '').trim();

    await page.waitForSelector("strong.product-detail__attribute-key", { timeout: 5000 });
    await page.waitForSelector(".product-detail__attribute-key", { timeout: 5000 });
    await page.waitForSelector("table", { timeout: 5000 });
    await page.waitForSelector(".nem-price-container__price-integer", { timeout: 5000 });

    product.producer = await page.evaluate(() => {
        const keys = document.querySelectorAll("strong.product-detail__attribute-key");
        for (const key of keys) {
            if (key.textContent?.trim().toLowerCase().includes("brand")) {
                return (
                    key.parentElement
                        ?.querySelector("span.product-detail__attribute-value")
                        ?.textContent?.trim() || null
                );
            }
        }
        return null;
    });

    product.abv = await page.evaluate(() => {
        const keys = document.querySelectorAll(".product-detail__attribute-key");
        for (const key of keys) {
            const label = key.textContent?.trim().toLowerCase();
            if (label && label.includes("alkohol-%")) {
                const valueEl = key.parentElement?.querySelector(
                    ".product-detail__attribute-value"
                );
                return valueEl?.textContent?.trim().replace(",", ".");
            }
        }
        return null;
    });

    product.energy = await page.evaluate(() => {
        const rows = document.querySelectorAll("table tr");
        for (const row of rows) {
            const label = row.querySelector("td")?.textContent?.trim();
            if (label && label.toLowerCase().includes("energi")) {
                return row.querySelectorAll("td")[1]?.textContent?.trim() || null;
            }
        }
        return null;
    });

    product.sugar = await page.evaluate(() => {
        const rows = document.querySelectorAll("table tr");
        for (const row of rows) {
            const label = row.querySelector("td")?.textContent?.trim();
            if (label && label.toLowerCase().includes("heraf sukkerarter")) {
                return row.querySelectorAll("td")[1]?.textContent?.trim() || null;
            }
        }
        return null;
    });

    product.price = await page.evaluate(() => {
        const integerPart = document
            .querySelector(".nem-price-container__price-integer")
            ?.textContent?.trim();

        const floatPart = document
            .querySelector(".nem-price-container__price-float")
            ?.textContent?.trim();

        if (!integerPart) return null;

        return floatPart ? `${integerPart}.${floatPart}` : integerPart;
    });

    product.producer = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');

        for (const script of scripts) {
            try {
                const data = JSON.parse(script.textContent);

                const items = Array.isArray(data) ? data : [data];

                for (const item of items) {
                    if (item["@type"] === "Product" && item.brand) {
                        return typeof item.brand === "string"
                            ? item.brand.trim()
                            : item.brand.name?.trim() || null;
                    }
                }
            } catch (e) {
                continue;
            }
        }

        return null;
    });
    return product;
}