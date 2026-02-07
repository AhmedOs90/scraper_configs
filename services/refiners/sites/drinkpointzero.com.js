// services/refiners/sites/drinkpointzero.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'USA';

    const descText = await page.evaluate(() => {
        const el = document.querySelector('.m-tab-content--description');
        return el ? el.innerText : '';
    });

    const match = descText.match(/Alcohol Content:\s*([\d.]+)%\s*ABV/i);
    if (match) {
        product.abv = match[1];
    }

    if (product.name && product.name.includes(' - ')) {
        const [producer, ...rest] = product.name.split(' - ');
        product.producer = producer.trim();
        product.name = rest.join(' - ').trim();
    }

    return product;
}