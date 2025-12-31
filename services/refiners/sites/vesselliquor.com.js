// services/refiners/sites/vesselliquor.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Canada';

    if (product.name?.includes(' - ')) {
        const [producer, name] = product.name.split(' - ', 2);
        product.producer = producer.trim();
        product.name = name.trim();
    }

    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    return product;
}
