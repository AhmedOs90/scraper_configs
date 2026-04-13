// services/refiners/sites/tesco.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "UK";
    product.currency = "GBP";
    product.description = product.description
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const data = await page.evaluate(() => {
        const clean = (s) => s?.replace(/\s+/g, " ").trim() ?? null;

        const el = document.querySelector('script[type="application/ld+json"]');
        let jsonData = {};

        if (el) {
            try {
                const json = JSON.parse(el.textContent);
                const productNode = Array.isArray(json["@graph"])
                    ? json["@graph"].find(x => x["@type"] === "Product")
                    : json;

                jsonData = {
                    price: productNode?.offers?.price ?? null,
                    producer: productNode?.brand?.name?.trim() ?? null
                };
            } catch {}
        }

        const ingredients = clean(
            [...document.querySelectorAll("h3")]
                .find(h => clean(h.textContent) === "Ingredients")
                ?.nextElementSibling?.textContent
        );

        const rows = [...document.querySelectorAll("table.product__info-table tbody tr")];
        const map = {};

        for (const row of rows) {
            const cells = row.querySelectorAll("th, td");
            const key = clean(cells[0]?.textContent)?.toLowerCase();
            const value = clean(cells[1]?.textContent);
            if (key) map[key] = value;
        }

        const getValueByHeader = (title) => {
            const el = [...document.querySelectorAll("h3")]
                .find(h => clean(h.textContent) === title);
            return clean(el?.nextElementSibling?.textContent);
        };

        const size = getValueByHeader("Net Contents");
        const abvRaw = getValueByHeader("ABV");

        return {
            ...jsonData,
            ingredients,
            energy: map["energy value"] ?? null,
            carbohydrates: map["carbohydrates"] ?? null,
            sugar: map["- of which sugars"] ?? null,
            b9: map["folic acid (b9)"] ?? null,
            b12: map["vitamin b12"] ?? null,
            polyphenols: map["polyphenols"] ?? null,
            size,
            abv: abvRaw?.replace(/[^0-9.]/g, "") ?? null
        };
    });

    if (data.price) {
        product.price = String(data.price);
    } else if (product.price) {
        product.price = product.price.replace("£", "").trim();
    }

    if (data.producer) {
        product.producer = data.producer;
    }

    product.energy = data.energy;
    product.sugar = data.sugar;
    product.abv = data.abv;

    product.extras ??= {};
    product.extras.ingredients = data.ingredients;
    product.extras.carbohydrates = data.carbohydrates;
    product.extras.b9 = data.b9;
    product.extras.b12 = data.b12;
    product.extras.polyphenols = data.polyphenols;
    product.extras.size = data.size;
    return product;
}