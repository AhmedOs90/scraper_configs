// services/refiners/sites/decantalo.co.uk.js
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

    product.abv = await page.evaluate(() => {
        const label = [...document.querySelectorAll('.metafield-rich_text_field p')]
            .find(p => p.textContent.trim() === 'Alcohol %:');

        if (!label) return null;

        const valueEl = label.nextElementSibling;
        if (!valueEl) return null;

        return valueEl.textContent.trim() + '%';
    });

    return product;
}