// services/refiners/sites/mrwest.com.au.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Australia';
    product.price = product.price.replace('$', '').trim();
    product.currency = 'AUD';
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.images = await page.$eval(
        '.woocommerce-product-gallery__image a',
        el => el.getAttribute('href')
    ).catch(() => null);

    const meta = await page.$eval('.product_meta', root => {
        const out = { producer: null, abv: null, format: null };

        for (const titleEl of root.querySelectorAll('.sku-title')) {
            const label = (titleEl.textContent || '').trim();
            const valueEl = titleEl.nextElementSibling;
            if (!valueEl || !valueEl.classList.contains('sku')) continue;

            const value = (valueEl.textContent || '').trim() || null;

            if (label === 'Producer' && out.producer == null) {
                out.producer = value;
            } else if (label === 'ABV' && out.abv == null) {
                out.abv = value;
            } else if (label === 'Format' && out.format == null) {
                out.format = value;
            }
        }

        return out;
    });

    product.abv = meta.abv;
    if (meta.producer == '008081') {
        product.producer = null;
    }
    else {
        product.producer = meta.producer;
    }

    product.extras = product.extras || {};
    product.extras.size = meta.format
        ? meta.format.replace(/\s*(Bottle|Can)$/i, '')
        : null;
    return product;
}