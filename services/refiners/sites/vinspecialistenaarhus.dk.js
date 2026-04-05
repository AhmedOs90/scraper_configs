// services/refiners/sites/vinspecialistenaarhus.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.extras = product.extras || {};

    product.extras.size = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.pi-dimensions table tr'));

        for (const row of rows) {
            const label = row.querySelector('strong')?.textContent?.trim();
            if (label && label.includes('Flaskestørrelse')) {
                const value = row.querySelectorAll('td')[1]?.textContent;
                return value?.replace(/\s+/g, ' ').trim();
            }
        }

        return null;
    });
    return product;
}