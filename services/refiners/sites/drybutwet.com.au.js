// services/refiners/sites/drybutwet.com.au.js
export default async function refine(rootUrl, product, page) {
    product.name = product.name.replace(" | Dry But Wet", "").trim();
    product.currency = "AUD";
    
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const text = product.description;

    const priceMatch = text.match(/Price\s+\$?([0-9.]+)/i);
    if (priceMatch) {
        product.price = priceMatch[1];
        
    }

    const sugarMatch = text.match(/Sugar per 100ml\s+([0-9.]+\s?[a-zA-Z]+)/i);
    if (sugarMatch) {
        product.sugar = sugarMatch[1].replace(/\s+/g, "");
    }

    const energyMatch = text.match(/Cals per 100ml\s+([0-9.]+\s?[a-zA-Z]+)/i);
    if (energyMatch) {
        product.energy = energyMatch[1].trim();
    }

    return product;
}