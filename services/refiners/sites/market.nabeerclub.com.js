// services/refiners/sites/market.nabeerclub.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';
    product.currency = 'USD';
    product.price = product.price.replace('$', '').trim();
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    product.name = product.name
        .replace(' | Single Can', '')
        .replace(' | NA Beer Market', '')
        .trim();
    return product;
}