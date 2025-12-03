// services/refiners/sites/moju-zero.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "Netherlands";
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    product.name = product.name
        .replace(' — MoJu-Zero', '')
        .trim();
    return product;
}