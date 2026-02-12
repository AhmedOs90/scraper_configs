// services/refiners/sites/worldofnix.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "Netherlands";
    product.name = product.name.replace(" | World of NIX", "").trim();
    product.price = product.price.replace(",", ".").trim();

    product.producer = await page.evaluate(() => {
        const scriptTag = document.querySelector("#viewed_product");
        if (!scriptTag) return null;
        const content = scriptTag.textContent || "";
        const match = content.match(/Brand:\s*"([^"]+)"/);
        return match ? match[1] : null;
    });

    const safeEval = (fn) => page.evaluate(fn).catch(() => null);

    await page
        .waitForFunction(() => {
            const blocks = document.querySelectorAll("rte-formatter");
            for (const b of blocks) {
                const t = (b.innerText || b.textContent || "").replace(/\s+/g, " ").trim();
                if (/(Energy\s*:|Alcohol-free percentage\s*:|Of\s*which\s*sugars?\s*:|Sugars?\s*:)/i.test(t)) return true;
            }
            return false;
        }, { timeout: 15000 })
        .catch(() => {});

    product.energy = await safeEval(() => {
        const norm = (s) => (s || "").replace(/\s+/g, " ").trim();

        const patterns = [
            /Energy\s*:?\s*([\d.,]+\s*kJ\s*\/\s*[\d.,]+\s*kcal)\b/i,
            /Energy\s*:?\s*([\d.,]+\s*kJ)\b/i
        ];

        for (const block of document.querySelectorAll("rte-formatter")) {
            const text = norm(block.innerText || block.textContent);
            if (!text) continue;

            for (const re of patterns) {
                const m = text.match(re);
                if (m) return m[1].trim();
            }
        }
        return null;
    });

    product.sugar = await safeEval(() => {
        const norm = (s) => (s || "").replace(/\s+/g, " ").trim();

        const patterns = [
            /Of\s*which\s*sugars?\s*:?\s*([\d.,]+\s*g)\b/i,
            /Sugars?\s*:?\s*([\d.,]+\s*g)\b/i
        ];

        for (const block of document.querySelectorAll("rte-formatter")) {
            const text = norm(block.innerText || block.textContent);
            if (!text) continue;

            for (const re of patterns) {
                const m = text.match(re);
                if (m) return m[1].trim();
            }
        }
        return null;
    });

    product.abv = await safeEval(() => {
        const norm = (s) => (s || "").replace(/\s+/g, " ").trim();

        const patterns = [
            /Alcohol-free percentage\s*:?\s*([\d.,]+\s*%)\b/i,
            /Alcohol\s*(?:by\s*volume|percentage)\s*:?\s*([\d.,]+\s*%)\b/i,
            /\bABV\s*:?\s*([\d.,]+\s*%)\b/i
        ];

        for (const block of document.querySelectorAll("rte-formatter")) {
            const text = norm(block.innerText || block.textContent);
            if (!text) continue;

            for (const re of patterns) {
                const m = text.match(re);
                if (m) return m[1].trim();
            }
        }
        return null;
    });
    return product;
}