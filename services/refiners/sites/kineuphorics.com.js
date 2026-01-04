// services/refiners/sites/kineuphorics.com.js
export default async function refine(rootUrl, product, page) {
    product.producer = 'Kin Euphorics';
    product.country = 'USA';
    return product;
}