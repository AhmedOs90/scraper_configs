// services/refiners/sites/drinknil.co.za.js
export default async function refine(rootUrl, product, page) {
    product.name = product.name
        .replace(product.producer.replace('&', 'and'), '')
        .trim();

    product.country = "South Africa";

    product.description = product.description
        .replace(/<\/?[^>]+(>|$)/g, '')
        .replace(/\s*\n\s*/g, ' ')
        .trim();

    return product;
}
