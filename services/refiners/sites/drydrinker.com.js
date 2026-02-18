// services/refiners/sites/drydrinker.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'UK';
    product.abv = product.abv?.replace(' ABV', '').trim();

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.sugar = await page.evaluate(() => {
        const sugarEl = document.evaluate(
            "//tr[td[contains(translate(text(),'SUGARS','sugars'),'sugars')]]/td[2]",
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;

        return sugarEl ? sugarEl.textContent.trim() : null;
    });

    product.energy = await page.evaluate(() => {
        const energyEl = document.evaluate(
            "//tr[td[contains(translate(text(),'ENERGY','energy'),'energy')]]/td[2]",
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;

        return energyEl ? energyEl.textContent.trim() : null;
    });

    product.producer = await page.evaluate(() => {
        const scripts = Array.from(
            document.querySelectorAll('script[type="application/ld+json"]')
        );

        for (const s of scripts) {
            try {
                const json = JSON.parse(s.textContent);

                if (json["@type"] === "Product" && json.brand?.name) {
                    return json.brand.name.trim();
                }
            } catch {
                continue;
            }
        }

        return null;
    });
    return product;
}