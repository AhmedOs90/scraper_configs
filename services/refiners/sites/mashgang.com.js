// services/refiners/sites/mashgang.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'UK';
    product.producer = 'Mash Gang';
    product.name = product.name
        .replace('Mash Gang - ', '')
        .replace(' - Mash Gang', '')
        .replace('- Alcohol-Free Beer ', '')
        .trim();
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    return product;
}