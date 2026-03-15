// services/refiners/sites/bierothek.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'EUR';
    product.price = product.price
        ?.replace('€', '')
        .replace(',', '.')
        .trim();
    product.description = product.description
        ?.replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    product.abv = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.detail-info dl dt'));

        for (const dt of items) {
            const label = dt.textContent
                ?.replace(/\s+/g, ' ')
                .trim()
                .toLowerCase();

            if (['alkoholindhold', 'alcohol content'].includes(label)) {
                const dd = dt.nextElementSibling;

                const value = dd?.textContent
                    ?.replace(/\s+/g, ' ')
                    .trim();

                if (!value) return null;

                return value
                    .replace(/vol\.?/gi, '')
                    .trim();
            }
        }

        return null;
    });
    return product;
}