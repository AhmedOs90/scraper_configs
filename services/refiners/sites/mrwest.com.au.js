// services/refiners/sites/mrwest.com.au.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Australia';
    product.price = product.price.replace('$', '').trim();
    product.currency = 'AUD';

    const meta = await page.$eval('.product_meta', root => {
        const out = { producer: null, abv: null };

        for (const titleEl of root.querySelectorAll('.sku-title')) {
            const label = (titleEl.textContent || '').trim();
            const valueEl = titleEl.nextElementSibling;
            if (!valueEl || !valueEl.classList.contains('sku')) continue;

            const value = (valueEl.textContent || '').trim() || null;

            if (label === 'Producer' && out.producer == null) {
                out.producer = value;
            } else if (label === 'ABV' && out.abv == null) {
                out.abv = value;
            }
        }

        return out;
    });

    product.producer = meta.producer;
    product.abv = meta.abv;

    if (product.producer == '008081') { product.producer = null; }

    product.images = await page.$eval('.woocommerce-product-gallery__image a', el => el.getAttribute('href')).catch(() => null);
    
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    return product;
}