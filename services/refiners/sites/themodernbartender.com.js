// services/refiners/sites/themodernbartender.com.js
export default async function refine(rootUrl, product, page) {
    product.price = product.price.replace('C$', '').trim();
    product.currency = 'CAD';
    product.country = 'Canada';
    product.description = product.description
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    return product;
}