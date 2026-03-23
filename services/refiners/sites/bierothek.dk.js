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

    const details = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.detail-info dl dt'));

        const getValue = (labels) => {
            for (const dt of items) {
                const label = dt.textContent
                    ?.replace(/\s+/g, ' ')
                    .trim()
                    .toLowerCase();

                if (labels.includes(label)) {
                    const dd = dt.nextElementSibling;
                    const value = dd?.textContent
                        ?.replace(/\s+/g, ' ')
                        .trim();

                    return value || null;
                }
            }

            return null;
        };

        return {
            abv: getValue(['alkoholindhold', 'alcohol content'])
                ?.replace(/vol\.?/gi, '')
                .trim() || null,
            size: getValue(['indhold']),
            weight: getValue(['vægt']),
            bitterness: getValue(['bitter sammenhold']),
            wort_strength: getValue(['original urt']),
        };
    });

    product.abv = details.abv;
    product.extras = {
        ...product.extras,
        size: details.size,
        weight: details.weight,
        bitterness: details.bitterness,
        wort_strength: details.wort_strength,
    };
    return product;
}