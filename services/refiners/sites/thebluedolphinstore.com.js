// services/refiners/sites/thebluedolphinstore.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "Spain";
    product.currency = "EUR";

    product.price = product.price
        .replace("€", "")
        .replace(",", ".")
        .trim();

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.energy = product.energy
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const abvMatch = product.description.match(
        /graduación\s*:\s*([\d.,]+)\s*%/i
    );

    if (abvMatch) {
        product.abv = abvMatch[1].replace(",", ".") + "%";
    }

    const energyMatch = product.energy.match(
        /calorías\s*:\s*([\d.,<>]+)?\s*kcal/i
    );

    if (energyMatch && energyMatch[1]) {
        product.energy = energyMatch[1].replace(",", ".") + " kcal";
    } else {
        product.energy = null;
    }

    const sugarMatch = product.energy?.match(
        /azúcares\s*:\s*([\d.,<>]+)\s*g/i
    );

    if (sugarMatch) {
        product.sugar = sugarMatch[1].replace(",", ".") + " g";
    } else {
        product.sugar = null;
    }
    return product;
}