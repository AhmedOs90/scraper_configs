// services/refiners/sites/nemlig.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';
    product.name = product.name.replace(' – Leveret med nemlig.com', '').trim();

    await Promise.all([
        page.waitForSelector('.product-detail__attribute-key', { timeout: 5000 }),
        page.waitForSelector('table', { timeout: 5000 }),
        page.waitForSelector('.nem-price-container__price-integer', { timeout: 5000 }),
    ]);

    const data = await page.evaluate(() => {
        const text = (el) => el?.textContent?.trim() || null;
        const normalize = (value) => value?.replace(',', '.').trim() || null;

        const getAttributeValue = (matcher) => {
            const keys = document.querySelectorAll('.product-detail__attribute-key');

            for (const key of keys) {
                const label = text(key)?.toLowerCase();
                if (label && matcher(label)) {
                    return text(
                        key.parentElement?.querySelector('.product-detail__attribute-value')
                    );
                }
            }

            return null;
        };

        const getTableValue = (matcher) => {
            const rows = document.querySelectorAll('table tr');

            for (const row of rows) {
                const cells = row.querySelectorAll('td');
                if (cells.length < 2) continue;

                const label = text(cells[0])?.toLowerCase();
                if (label && matcher(label)) {
                    return text(cells[1]);
                }
            }

            return null;
        };

        const getIngredients = () => {
            const declaration = document.querySelector('.product-detail__declaration');
            if (!declaration) return null;

            const labels = declaration.querySelectorAll('.product-detail__declaration-label');

            for (const label of labels) {
                const labelText = text(label)?.toLowerCase();
                if (labelText && labelText.includes('ingrediensliste')) {
                    return text(label.querySelector('p'));
                }
            }

            return null;
        };

        const getPrice = () => {
            const integerPart = text(
                document.querySelector('.nem-price-container__price-integer')
            );
            const floatPart = text(
                document.querySelector('.nem-price-container__price-float')
            );

            if (!integerPart) return null;
            return floatPart ? `${integerPart}.${floatPart}` : integerPart;
        };

        const getBrandFromJsonLd = () => {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');

            for (const script of scripts) {
                try {
                    const parsed = JSON.parse(script.textContent);
                    const items = Array.isArray(parsed) ? parsed : [parsed];

                    for (const item of items) {
                        if (item?.['@type'] === 'Product' && item.brand) {
                            return typeof item.brand === 'string'
                                ? item.brand.trim()
                                : item.brand.name?.trim() || null;
                        }
                    }
                } catch {
                    continue;
                }
            }

            return null;
        };

        return {
            producer:
                getBrandFromJsonLd() ||
                getAttributeValue((label) => label.includes('brand')),
            abv: normalize(
                getAttributeValue((label) => label.includes('alkohol-%'))
            ),
            energy: getTableValue((label) => label.includes('energi')),
            sugar: getTableValue((label) => label.includes('heraf sukkerarter')),
            price: getPrice(),
            extras: {
                ingredients: getIngredients(),
                fat: getTableValue((label) => label === 'fedt'),
                carbohydrates: getTableValue((label) => label === 'kulhydrater'),
                fiber: getTableValue((label) => label === 'kostfibre'),
                protein: getTableValue((label) => label === 'protein'),
                salt: getTableValue((label) => label === 'salt'),
            },
        };
    });

    Object.assign(product, data);
    return product;
}