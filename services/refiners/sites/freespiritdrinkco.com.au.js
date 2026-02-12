// services/refiners/sites/freespiritdrinkco.com.au.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Australia';
    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    return product;
}