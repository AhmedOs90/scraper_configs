// services/refiners/sites/nakedlifespirits.com.au.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Australia';
    product.name = product.name
        .replace('Naked Life Non-Alcoholic Cocktail ', '')
        .trim();
    product.producer = 'Naked Life';
    product.price = product.price
        .replace('$', '')
        .trim();
    product.currency = 'AUD';
    return product;
}