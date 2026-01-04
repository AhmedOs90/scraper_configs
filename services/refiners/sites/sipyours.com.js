// services/refiners/sites/sipyours.com.js
export default async function refine(rootUrl, product, page) {
    await page.waitForSelector(
        '.product--block--description .collapsible-row--content',
        { timeout: 5000 }
    );

    const data = await page.evaluate(() => {
        const root = document.querySelector(
            '.product--block--description .collapsible-row--content'
        );

        if (!root) {
            return { description: null, sugar: null, energy: null };
        }

        const description = root.textContent.trim();

        let sugar = null;
        let energy = null;

        root.querySelectorAll('table tr').forEach(tr => {
            const cells = tr.querySelectorAll('td');
            if (cells.length !== 2) return;

            const label = cells[0].textContent.toLowerCase().trim();
            const value = cells[1].textContent.trim();

            if (label.includes('total sugars')) {
                sugar = value;
            }

            if (label.includes('calories per serving')) {
                energy = value;
            }
        });

        return { description, sugar, energy };
    });

    product.description = data.description
        ?.replace(/<[^>]+>/g, "")
        ?.replace(/\s+/g, " ")
        ?.trim() ?? null;

    product.sugar = data.sugar
        ?.replace(' (none added)', '')
        ?.replace(' (no added sugar)', '')
        ?.trim() ?? null;

    product.energy = data.energy;
    product.country = "USA";
    product.producer = "YOURS";

    return product;
}
