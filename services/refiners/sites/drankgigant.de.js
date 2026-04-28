// services/refiners/sites/drankgigant.de.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Germany';
    product.name = product.name.replace(' online kopen?', '').trim();
    product.description = product.description
        ?.replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    return product;
}