// services/refiners/sites/vesselliquor.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Canada';
    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (product.name?.includes(' - ')) {
        const [producer, name] = product.name.split(' - ', 2);
        product.producer = producer.trim();
        product.name = name.trim();
    }

    const liquid = await page.evaluate(() => {
        const el = document.querySelector('.product-info__liquid');
        return el ? el.textContent : '';
    });

    const sizeMatch = liquid.match(/Size:\s*([^\n]+)/i);
    const grapeMatch = liquid.match(/Grape:\s*([^\n]+)/i);

    product.extras ??= {};
    if (sizeMatch) product.extras.size = sizeMatch[1].trim();
    if (grapeMatch) product.extras.grape = grapeMatch[1].trim();
    return product;
}