// services/refiners/sites/puninwine.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Cyprus';
    
    product.abv = await page.evaluate(() => {
        const el = [...document.querySelectorAll('.constitutions__item')]
            .find(i => i.querySelector('.constitutions__name')?.textContent.trim() === 'Alcohol:');
        return el?.querySelector('.constitutions__value')?.textContent.trim() || null;
    });

    product.description = await page.evaluate(() => {
        const el = document.querySelector('.descriptions');
        return el ? el.innerText.replace(/\s+/g, ' ').trim() : null;
    });
    return product;
}