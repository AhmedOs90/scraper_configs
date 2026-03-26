// services/refiners/sites/drinkdrystore.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'UAE';
    product.extras.ingredients = product.extras.ingredients
        ?.replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    return product;
}