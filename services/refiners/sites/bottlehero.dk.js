// services/refiners/sites/bottlehero.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.price = product.price?.replace(',', '.');

    const data = await page.evaluate(() => {
        const norm = (s) => s?.replace(/\s+/g, ' ').trim();

        const getValue = (...labels) => {
            const blocks = Array.from(document.querySelectorAll('.space-y-1'));

            for (const block of blocks) {
                const children = block.querySelectorAll(':scope > div');
                if (children.length < 2) continue;

                const key = norm(children[0].textContent);
                const value = norm(children[1].textContent);

                if (labels.includes(key)) return value || null;
            }

            return null;
        };

        return {
            abv: getValue('Alc.'),
            year: getValue('Årgang', 'Year'),
            grape: getValue('Drue', 'Grape'),
            size: getValue('Størrelse', 'Size')
        };
    });

    product.abv = data.abv;
    product.extras = {
        ...product.extras,
        year: data.year,
        grape: data.grape,
        size: data.size
    };
    return product;
}