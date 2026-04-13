// services/refiners/sites/thebelgianbeercompany.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "Belgium";

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const abvMatch = product.description.match(/(\d+(?:\.\d+)?)%\s*ABV/i);
    product.abv = abvMatch ? abvMatch[1] + "%" : null;

    const sizeMatches = [...product.description.matchAll(/Size of Bottle:\s*([\d.]+\s*cl)/gi)];
    const sizes = sizeMatches.map(m => m[1]);

    product.extras = product.extras || {};
    product.extras.size = sizes.length ? [...new Set(sizes)] : null;
    return product;
}