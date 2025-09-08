// services/refiners/sites/vinello.eu.js

export default async function refine(rootUrl, product, page) {

    if (product.abv) {
        product.abv = product.abv
        .toString()
        .replace(',', '.')
        .replace(/[^\d.]/g, '')
        .trim() + '%';
    }

    const attr23 = await page.$eval(
        ".product--properties-row #attribute-23",
        el => el.textContent.trim().toLowerCase()
    ).catch(() => null);

    if (attr23) {
        product.vegan = attr23.includes("vegan") ? "Vegan" : null;
        product.glutenFree = attr23.includes("gluten") ? "Gluten free" : null;
    }

    if (product.price && product.currency) {
        product.currency = product.currency.replace(product.price, "").replace("*", "");
    }


    if (product.name && product.producer) {
        const name = product.name.trim();
        const producer = product.producer.trim();

        const lower_name = name.toLowerCase();
        const lower_producer = producer.toLowerCase();

        let cleaned = name;
        const dashIdx = name.lastIndexOf(' - ');
        if (dashIdx !== -1) {

            const tail = name.slice(dashIdx + 3).trim();
            if (tail && lower_producer.includes(tail.toLowerCase())) {
                cleaned = name.slice(0, dashIdx).trim();
            } else {

                const tokens = producer.split(/\s+/);
                for (let k = tokens.length; k >= 1; k--) {
                    const suffix = tokens.slice(tokens.length - k).join(' ');
                    if (lower_name.endsWith(' - ' + suffix.toLowerCase())) {
                    cleaned = name.slice(0, name.length - (' - ' + suffix).length).trim();
                    break;
                    }
                }

            }

        }

        product.name = cleaned;
    }

    return product;
}
