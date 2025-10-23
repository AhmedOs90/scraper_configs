// services/refiners/sites/draydrinks.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';
    return product;
}
