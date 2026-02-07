// services/refiners/sites/blackmarket.co.nz.js
export default async function refine(rootUrl, product, page) {
    product.country = 'New Zealand';
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.description = product.description
        .replace('Description ', '');
        
    return product;
}