// services/refiners/sites/vinspecialistenaalborg.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';
    product.price = product.price
        .replace(',', '.')
        .replace(' DKK', '')
        .trim
    product.name = product.name.replace(' - Alkoholfri - Vinspecialisten Aalborg', '').trim();
    product.description = product.description.replace(' […]', '').trim();


    const match = product.name.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (match) {
        product.abv = `${match[1].replace(',', '.')}%`;
    } else {
        product.abv = null;
    }
    return product;
}