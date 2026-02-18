// services/refiners/sites/gourmetsaft.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';
    product.name = product.name.replace(' - Gourmetsaft', '').trim();

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    
    product.price = product.price
        .replace(/[^\d,.,]/g, '')
        .replace(/,+/g, ',')
        .replace(/\.(?=.*\.)/g, '')
        .replace(',', '.')
        .replace(/\.$/, '')
        .trim();
    return product;
}