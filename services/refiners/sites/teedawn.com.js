// services/refiners/sites/teedawn.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.producer = 'Teedawn';

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.abv =
        (product.description.match(/alkoholprocent\s*:\s*(\d+(?:[.,]\d+)?\s*%)/i)?.[1] ??
        product.description.match(/(?!100%)(\d+(?:[.,]\d+)?\s*)%\s*(?:weizen|pilsner\/lager|pilsner|lager|ipa|stout|porter|ale|wheat|weissbier|vienna|radler\/shandy)/i)
            ?.[0]
            ?.match(/\d+(?:[.,]\d+)?\s*%/)?.[0]);
    return product;
}