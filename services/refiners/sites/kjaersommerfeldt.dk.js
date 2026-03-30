// services/refiners/sites/kjaersommerfeldt.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';

    product.price = product.price
        .replace(',', '.')
        .replace(/[^0-9.]/g, '')
        .replace(/\.$/, '')
        .trim();

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    await page.waitForSelector('.product-image__container', { timeout: 15000 });
    await page.waitForSelector('.specification-model__container', { timeout: 15000 });

    const jsonLd = await page.$$eval(
        'script[type="application/ld+json"]',
        scripts => {
            for (const s of scripts) {
                try {
                    const data = JSON.parse(s.textContent);
                    if (data['@type'] === 'Product') return data;
                } catch (e) {}
            }
            return null;
        }
    );

    if (jsonLd) {
        product.name = jsonLd.name?.trim();
        product.producer = jsonLd.brand?.name?.trim();
    }

    const specs = await page.$$eval(
        '.specification-model__container',
        nodes => {
            const data = {};

            for (const n of nodes) {
                const key = n.querySelector('.specification-model__headline')?.textContent?.trim();
                const value = n.querySelector('.specification-model__item')?.textContent?.trim();

                if (key && value) {
                    data[key] = value;
                }
            }

            return data;
        }
    );

    product.extras = {
        vinification: specs['Vinifikation'] || null,
        size: specs['Størrelse'] || null,
        closure: specs['Lukning'] || null
    };
    return product;
}