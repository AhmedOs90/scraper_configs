// services/refiners/sites/foetex.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';

    product.price = product.price
        .replace(',', '.')
        .replace('-', '00')
        .trim();

    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    product.name = product.name.replace(' | Køb på føtex.dk!', '').trim();

    const producer = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');

        for (const s of scripts) {
            try {
                const data = JSON.parse(s.textContent);
                if (data && data['@type'] === 'Product') {
                    return data.brand || null;
                }
            } catch (_) {}
        }

        return null;
    });

    product.producer = producer;

    return product;
}