// services/refiners/sites/threshers.co.uk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'UK';
    product.currency = 'GBP';

    if (product.price) {
        product.price = product.price.replace('£', '').trim();
    }

    if (product.description) {
        product.description = product.description
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    return product;
}