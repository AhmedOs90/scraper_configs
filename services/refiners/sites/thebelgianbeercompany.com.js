// services/refiners/sites/thebelgianbeercompany.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "Belgium";

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const abvMatch = product.description.match(/(\d+(?:\.\d+)?)%\s*ABV/i);
    product.abv = abvMatch ? abvMatch[1] + "%" : null;
    return product;
}