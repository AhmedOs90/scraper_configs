// services/refiners/sites/kodriget.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.price = product.price.replace(',', '.').trim();

    if (product.name.includes(",")) {
        const [producer, ...rest] = product.name.split(",");
        product.producer = producer.trim();
        product.name = rest.join(",").trim();
    }

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.extras = product.extras || {};

    const data = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('.metafield-rich_text_field p')];

        const getValue = (labelText) => {
            const label = rows.find(p => p.textContent.trim().startsWith(labelText));
            if (!label) return null;

            const valueEl = label.nextElementSibling;
            if (!valueEl) return null;

            return valueEl.textContent.trim();
        };

        return {
            size: getValue('Størrelse:'),
            abv: getValue('Alkohol %:')
        };
    });

    if (data.size) {
        product.extras.size = data.size;
    }

    if (data.abv) {
        product.abv = data.abv.replace(',', '.').trim() + '%';
    }
    return product;
}