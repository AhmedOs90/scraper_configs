// services/refiners/sites/liquorland.com.au.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Australia';
    product.price = product.price.replace('$', '').trim();
    product.currency = 'AUD';
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    product.abv = await page.evaluate(() => {
        const items = [...document.querySelectorAll('.product-properties li')];
        const li = items.find(x =>
            x.querySelector('.key')?.textContent.trim() === 'Alcohol Content'
        );
        return li?.querySelector('.val')?.textContent.trim() || null;
    });
    return product;
}