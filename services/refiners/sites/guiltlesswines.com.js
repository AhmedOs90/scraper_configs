export default async function refine(rootUrl, product, page) {
    const desc = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.description = desc;

    let energy = null;
    {
        const kcal = desc.match(/(\d+(?:\.\d+)?)\s*kcal/i);
        const kj   = desc.match(/(\d+(?:\.\d+)?)\s*kJ/i);
        const kcal2 = desc.match(/(\d+(?:\.\d+)?)\s*KCAL/i);

        if (kcal) energy = parseFloat(kcal[1]);
        else if (kcal2) energy = parseFloat(kcal2[1]);
        else if (kj) energy = parseFloat(kj[1]);
    }
    product.energy = energy;

    let sugar = null;
    {
        const r1 = desc.match(/of which sugars[:\s]*([\d.]+)\s*g/i);
        const r2 = desc.match(/sugars[:\s]*([\d.]+)\s*g/i);
        const r3 = desc.match(/([\d.]+)\s*g\s*sugar/i);

        if (r1) sugar = parseFloat(r1[1]);
        else if (r2) sugar = parseFloat(r2[1]);
        else if (r3) sugar = parseFloat(r3[1]);
    }
    product.sugar = sugar;

    if (/vegan/i.test(desc)) {
        product.vegan = "Vegan";
    }

    if (/gluten/i.test(desc)) {
        product.gluten_free = "Gluten free";
    }

    if (/100%\s*alcohol\s*free/i.test(desc)) {
        product.abv = "0%";
    }

    product.country = "UK";
    return product;
}
