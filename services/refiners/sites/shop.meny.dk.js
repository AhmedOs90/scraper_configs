// services/refiners/sites/shop.meny.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';
    
    product.name = product.name.replace(' | MENY Vin', '').trim();

    product.price = product.price
        .replace(',', '.')
        .replace(' kr.', '')
        .trim();
    
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .replace(' Læs mere', '')
        .trim();
    
    product.producer = product.producer
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim(); 
    
    return product;
}
