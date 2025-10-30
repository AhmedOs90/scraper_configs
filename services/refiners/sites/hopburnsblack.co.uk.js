// services/refiners/sites/hopburnsblack.co.uk.js
export default async function refine(rootUrl, product, page) {
    product.country = "UK";
    product.description = product.description
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    product.producer = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.product-tags button'))
            .filter(b => b.textContent.startsWith('Brewery:'))
            .map(b => b.textContent.replace('Brewery:', '').trim())
            .join(' + ') || null;
    });
    return product;
}
