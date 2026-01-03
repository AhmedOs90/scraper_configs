// services/refiners/sites/threespiritdrinks.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'UK';
    product.producer = 'Three Spirit';
    return product;
}
