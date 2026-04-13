// services/refiners/sites/supervin.dk.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    product.price = product.price
        .replace(',', '.')
        .replace(' DKK', '')
        .trim();

    const energyMatch = product.description.match(/Kalorier:\s*([^;]+)/i);
    product.energy = energyMatch ? energyMatch[1].trim() : null;

    const sugarMatch = product.description.match(/sukkerarter:\s*([^;]+)/i);
    product.sugar = sugarMatch ? sugarMatch[1].trim() : null;

    const extras = await page.evaluate(() => {
        const out = {
            size: null,
            serving_temperature: null,
            plug_type: null,
            allergens: null,
        };

        const normalize = (s) =>
            s
                .trim()
                .toLowerCase()
                .replace(/:$/, '');

        const rows = Array.from(document.querySelectorAll('.product-data-section'));

        for (const row of rows) {
            const label = normalize(row.querySelector('p')?.textContent || '');
            const value = row.querySelector('.product-data-value')?.textContent?.trim() || '';

            if (!label || !value) continue;

            if (label === 'indhold') out.size = value;
            if (label === 'servering') out.serving_temperature = value;
            if (label === 'proptype') out.plug_type = value;
            if (label === 'allergener') out.allergens = value;
        }

        return out;
    });

    product.extras = {
        ...(product.extras || {}),
        ...extras,
    };

    const brand = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const s of scripts) {
            try {
                const data = JSON.parse(s.textContent);
                const node = Array.isArray(data) ? data.find(x => x && x.brand) : data;
                if (!node || !node.brand) continue;

                if (typeof node.brand === 'string') return node.brand;
                if (typeof node.brand === 'object') return node.brand.name || null;
            } catch {}
        }
        return null;
    });

    product.producer = brand;
    return product;
}