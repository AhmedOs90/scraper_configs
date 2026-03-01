// services/refiners/sites/puninwine.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Cyprus';
    product.price = product.price.replace(',', '.').trim();
    product.name = product.name.replace(' |  Sans Drinks  Australia  ', '').trim();
    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    return product;
}