// services/refiners/sites/dhwines.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.price = product.price.replace(',', '.').trim();
    product.name = product.name.replace(' - Køb online', '').trim();

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const abvMatch = product.description.match(/alkoholindhold:\s*([\d.,]+\s*%)/i);
    if (abvMatch) {
        product.abv = abvMatch[1].replace(',', '.').replace(/\s+/g, '');
    }
    return product;
}