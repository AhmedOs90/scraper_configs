// services/refiners/sites/dhwines.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.price = product.price.replace(',', '.').trim();
    product.name = product.name.replace(' - Køb online', '').trim();

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const abvMatch = product.description.match(/alkoholindhold:\s*([\d.,]+\s*%)/i);
    if (abvMatch) {
        product.abv = abvMatch[1].replace(',', '.').replace(/\s+/g, '');
    }

    const ldJson = await page.$$eval(
        'script[type="application/ld+json"]',
        nodes => nodes.map(n => n.innerText)
    );

    for (const json of ldJson) {
        try {
            const data = JSON.parse(json);

            const productData =
                data['@type'] === 'Product'
                    ? data
                    : Array.isArray(data)
                    ? data.find(x => x['@type'] === 'Product')
                    : null;

            if (productData?.brand) {
                product.producer =
                    typeof productData.brand === 'string'
                        ? productData.brand
                        : productData.brand.name;
                break;
            }
        } catch {}
    }
    return product;
}