// services/refiners/sites/ginsiders.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'France';
    product.currency = 'EUR';
    product.price = product.price
        .replace('€', '')
        .replace(',', '.')
        .trim();

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const data = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');

        for (const s of scripts) {
            try {
                const json = JSON.parse(s.textContent);

                const items = json['@graph'] ?? [json];

                for (const obj of items) {
                    const type = obj['@type'];
                    const isProduct =
                        type === 'Product' ||
                        (Array.isArray(type) && type.includes('Product'));

                    if (isProduct) {
                        return {
                            images: obj.image
                                ? Array.isArray(obj.image)
                                    ? obj.image
                                    : [obj.image]
                                : [],
                            producer: obj.brand?.name ?? null
                        };
                    }
                }
            } catch {}
        }

        return { images: [], producer: null };
    });

    product.images = data.images;
    product.producer = data.producer;

    const nutritionText = await page.evaluate(() => {
        const el = document.querySelector('#tab-description');
        return el ? el.innerText : '';
    });

    const norm = nutritionText.replace(/\s+/g, ' ').trim();

    const energyMatch = norm.match(/Calories:\s*([^,]+?kJ\s*\/\s*[^,]+?kcal)/i);
    if (energyMatch) {
        product.energy = energyMatch[1].trim();
    }

    const sugarMatch = norm.match(/of which\s*([\d.,]+)\s*g?\s*sugars/i);
    if (sugarMatch) {
        product.sugar = `${sugarMatch[1].replace(',', '.')} g`;
    }
    const extras = await page.evaluate(() => {
        const rows = document.querySelectorAll(
            '#tab-additional_information tr.woocommerce-product-attributes-item'
        );

        const result = {};

        rows.forEach((row) => {
            const label = row
                .querySelector('.woocommerce-product-attributes-item__label')
                ?.innerText.trim().toLowerCase();

            const value = row
                .querySelector('.woocommerce-product-attributes-item__value')
                ?.innerText.trim();

            if (!label || !value) return;

            if (label.includes('poids')) {
                result.weight = value;
            }

            if (label.includes('volume')) {
                result.size = value;
            }
        });

        return result;
    });

    product.extras = {
        ...(product.extras || {}),
        weight: extras.weight || null,
        size: extras.size || null
    };
    return product;
}