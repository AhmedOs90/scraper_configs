// services/refiners/sites/passionspirits.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';
    product.currency = 'USD';
    product.price = product.price.replace('$', '').trim();

    product.description = product.description
        .replace('Product Description', '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const descLower = product.description.toLowerCase();

    if (descLower.includes('vegan')) {
        product.Vegan = 'Vegan';
    }

    if (descLower.includes('gluten')) {
        product.gluten_free = 'Gluten free';
    }

    product.images = await page.evaluate(() => {
        const imgs = Array.from(
            document.querySelectorAll('img[alt][src*="_next/image"]')
        );

        if (!imgs.length) return [];

        const first = imgs[0].getAttribute('src');
        return first ? [first] : [];
    });
    return product;
}