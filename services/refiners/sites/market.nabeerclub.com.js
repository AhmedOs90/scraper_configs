// services/refiners/sites/market.nabeerclub.com.js
export default async function refine(rootUrl, product, page) {
    
    const info = await page.evaluate(() => {
        try {
            
            const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
            for (const s of scripts) {
                let d;
                try { d = JSON.parse(s.textContent || '{}'); } catch { continue; }

                const p = Array.isArray(d?.['@graph'])
                ? d['@graph'].find(x => x?.['@type'] === 'Product')
                : (d?.['@type'] === 'Product' ? d : null);

                if (p) {
                    return {
                        name: p.name ?? null,
                        producer: (typeof p.brand === 'string' ? p.brand : p.brand?.name) ?? null,
                        description: p.description ?? null,
                    };
                }
            }
            
            return null;
        
        } catch { return null; }
    });

    if (info.name) product.name = info.name;
    if (info.producer) product.producer = info.producer;
    if (info.description) product.description = info.description;

    if (product.name) {
        let base = product.name.split('|')[0].trim();
        if (product.producer) base = base.replace(product.producer, '').trim();
        product.name = base.replace(/\s{2,}/g, ' ');
    }

    if (info.description) {
        product.description = info.description.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    }

    if (product.price) {
        product.price = product.price.substring(1).trim();
    }

    return product;
}