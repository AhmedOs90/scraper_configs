// services/refiners/sites/boozefree.co.uk.js
export default async function refine(rootUrl, product, page) {
    product.country = "UK";

    const details = await page.$$eval(".product__text", els =>
        els.map(e => e.textContent.trim())
    );

    const abvLine = details.find(t =>
        t.toLowerCase().includes("alcohol by volume")
    );
    const energyLine = details.find(t =>
        t.toLowerCase().includes("kcals")
    );
    const sugarLine = details.find(t =>
        t.toLowerCase().includes("sugar")
    );

    if (abvLine) {
        product.abv = abvLine.split("-")[1].trim();
    }

    if (energyLine) {
        const val = energyLine.split(":")[1].trim();
        product.energy = `${val} / 100ml`;
    }

    if (sugarLine) {
        const val = sugarLine.split(":")[1].trim();
        product.sugar = `${val} / 100ml`;
    }

    if (details.some(t => t.toLowerCase().includes("vegan"))) {
        product.vegan = "Vegan";
    }

    if (details.some(t => t.toLowerCase().includes("gluten"))) {
        product.gluten_free = "Gluten free";
    }

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    return product;
}