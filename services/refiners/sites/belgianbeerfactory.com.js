// services/refiners/sites/belgianbeerfactory.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Belgium';
    product.currency = 'EUR';

    product.name = product.name
        .replace(' - Buy beer online', '')
        .replace(' - Buy your beer online', '')
        .replace('  - ', ' - ')
        .trim();

    product.price = product.price
        .replace('€', '')
        .replace(',', '.')
        .trim();
    
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const abvMatch = product.description.match(/Alcohol\s*:\s*([\d.,]+%)/i);
    if (abvMatch) product.abv = abvMatch[1];

    const producerMatch = product.description.match(
        /Brewery\s*:\s*(.+?)(?=Volume\s*:|Alcohol(?:\s*Content\s*\(ABV\))?\s*:|Fermentation\s*:|Colour\s*:|More about\b|$)/i
    );
    if (producerMatch) product.producer = producerMatch[1].trim();

   return product;
}