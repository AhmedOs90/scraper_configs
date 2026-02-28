// services/refiners/sites/minusmoonshine.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';

    const dashMatch = product.name.match(/^(.+?)\s*[—–-]\s*(.+)$/);
    if (dashMatch) {
        const [, producer, namePart] = dashMatch;
        product.producer ??= producer.trim();
        product.name = namePart.trim();
    }

    product.name = product.name
        .replace(/,\s*\d+.*$/i, "")
        .trim();
    return product;
}