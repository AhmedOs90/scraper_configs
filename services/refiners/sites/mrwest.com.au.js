// services/refiners/sites/mrwest.com.au.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Australia';
    product.price = product.price.replace('$', '').trim();
    product.currency = 'AUD';

    product.producer = await page.$eval(
        '.product_meta .sku-title:nth-of-type(1) + .sku a',
        el => el.textContent.trim()
    );
    
    product.images = await page.$eval('.woocommerce-product-gallery__image a', el => el.getAttribute('href')).catch(() => null);
    
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    return product;
}