// services/refiners/sites/mondaydistillery.com.js
export default async function refine(rootUrl, product, page) {
    product.producer = 'Monday Distillery';
    product.currency = 'AUD';
    product.country = 'Australia';

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.price = `${product.price} / 24 Bottles`;

    return product;
}