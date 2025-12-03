// services/refiners/sites/collectiveartscreativity.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Canada';
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    
    return product;
}
