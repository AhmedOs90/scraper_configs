// services/refiners/sites/sipyours.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "USA";
    product.producer = "YOURS";
    product.extras ??= {};

    await page.waitForSelector(
        '.product--block--description .collapsible-row--content',
        { timeout: 5000 }
    );

    const data = await page.evaluate(() => {
        const root = document.querySelector(
            '.product--block--description .collapsible-row--content'
        );

        if (!root) {
            return {
                description: null,
                sugar: null,
                energy: null,
                size: null,
                carbohydrates: null,
                ingredients: null,
                servingSize: null,
            };
        }

        const description = root.textContent.trim();

        let sugar = null;
        let energy = null;
        let size = null;
        let carbohydrates = null;
        let ingredients = null;
        let servingSize = null;

        root.querySelectorAll('table tr').forEach(tr => {
            const cells = tr.querySelectorAll('td');
            if (cells.length !== 2) return;

            const label = cells[0].textContent.toLowerCase().trim();
            const value = cells[1].textContent.trim();

            if (label.includes('size')) {
                size = value;
            }

            if (label.includes('serving size')) {
                servingSize = value;
            }

            if (label.includes('total sugars')) {
                sugar = value;
            }

            if (label.includes('calories per serving')) {
                energy = value;
            }

            if (label.includes('carbohydrates per serving')) {
                carbohydrates = value;
            }

            if (label.includes('ingredients')) {
                ingredients = value;
            }
        });

        return {
            description,
            sugar,
            energy,
            size,
            carbohydrates,
            ingredients,
            servingSize,
        };
    });

    product.description = data.description
        ?.replace(/\s+/g, " ")
        ?.trim() ?? null;

    product.sugar = data.sugar
        ?.replace(' (none added)', '')
        ?.replace(' (no added sugar)', '')
        ?.trim() ?? null;

    product.energy = data.energy ?? null;

    product.extras.size = data.size ?? null;

    product.extras.carbohydrates =
        data.carbohydrates && data.servingSize
            ? `${data.carbohydrates} / ${data.servingSize}`
            : null;

    product.extras.ingredients = data.ingredients ?? null;
    return product;
}