// services/refiners/sites/thechiller.co.nz.js
export default async function refine(rootUrl, product, page) {
    product.country = "New Zealand";
    product.name = product.name.replace(" | The Chiller", "").trim();
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const nutrition = await page.evaluate(() => {
        const out = {
            energy: null,
            sugar: null,
            abv: null,
            carbohydrates: null,
            fat: null,
            salt: null,
        };

        document
            .querySelectorAll(
                ".product-block-nutritional-information li div.flex"
            )
            .forEach((row) => {
                const label = row.querySelector("span:first-child")?.textContent.trim();
                const value = row.querySelector("span:last-child")?.textContent.trim();

                if (!label || !value) return;

                if (label.includes("Calorie")) out.energy = value;
                if (label.includes("Sugars")) out.sugar = value;
                if (label.includes("Alcohol Content")) out.abv = value;
                if (label.includes("Total Carbohydrate")) out.carbohydrates = value;
                if (label.includes("Total Fat")) out.fat = value;
                if (label.includes("Total Salt")) out.salt = value;
            });

        return out;
    });

    product.producer = await page.evaluate(() => {
        const scripts = Array.from(
            document.querySelectorAll('script[type="application/ld+json"]')
        );

        for (const script of scripts) {
            const text = script.textContent?.trim();
            if (!text) continue;

            try {
                const data = JSON.parse(text);
                const nodes = Array.isArray(data) ? data : [data];

                const productNode = nodes.find(
                    (n) =>
                        n &&
                        (n["@type"] === "Product" ||
                            (Array.isArray(n["@type"]) &&
                                n["@type"].includes("Product")))
                );

                if (!productNode) continue;

                return productNode.brand?.name ?? productNode.brand ?? null;
            } catch {
                continue;
            }
        }

        return null;
    });

    product.energy = nutrition.energy;
    product.sugar = nutrition.sugar;
    product.abv = nutrition.abv;

    product.extras = {
        carbohydrates: nutrition.carbohydrates,
        fat: nutrition.fat,
        salt: nutrition.salt,
        ingredients: await page.evaluate(() => {
            const el = document.querySelector(
                ".product-block-collapsible-tab .rte li"
            );
            return el?.textContent.replace(/^"+|"+$/g, "").trim() || null;
        }),
    };
    return product;
}