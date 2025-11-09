// services/refiners/sites/af-drinks.com.js
export default async function refine(rootUrl, product, page) {
    product.price = product.price.replace(/[^\d.]/g, '');
    
    const match = product.country.match(/\((\w+)/);
    product.currency = match ? match[1] : '';
    
    product.country = product.country.replace(/\s*\(.*?\)\s*/g, '').trim();

    product.producer = "AF";
    
    product.energy = await page.evaluate(() => {
        const el = document.querySelector('.af-fact--cal .af-fact__big');
        return el ? el.textContent.trim() : null;
    });

    return product;
}
