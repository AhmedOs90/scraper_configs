// services/refiners/sites/thesobrmarket.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Canada';
    product.name = product.name.replace(' @ The Sobr Market', '').trim();
    product.price = product.price.replace(',', '.').trim();

    const nutrition = await page.evaluate(() => {
        const containers = Array.from(document.querySelectorAll('[data-tab-content]'));

        for (const container of containers) {
            const text = container.innerText;

            if (text.includes('cals') && text.toLowerCase().includes('sugar')) {
                const energyMatch = text.match(/(\d+(?:\.\d+)?)\s*cals?\b/i);
                const sugarMatch = text.match(/(\d+(?:\.\d+)?)\s*g\s*sugar\b/i);

                return {
                    energy: energyMatch ? `${energyMatch[1]} cals` : null,
                    sugar: sugarMatch ? `${sugarMatch[1]} g sugar` : null
                };
            }
        }

        return null;
    });

    if (nutrition) {
        product.energy = nutrition.energy;
        product.sugar = nutrition.sugar;
    }

    const producer = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));

        for (const script of scripts) {
            const raw = script.textContent?.trim();
            if (!raw) continue;

            let json;
            try {
                json = JSON.parse(raw);
            } catch {
                continue;
            }

            const candidates = Array.isArray(json) ? json : [json];

            for (const item of candidates) {
                if (!item || item['@type'] !== 'Product') continue;

                const brand = item.brand;
                if (typeof brand === 'string') return brand;
                if (brand && typeof brand === 'object' && typeof brand.name === 'string') return brand.name;
            }
        }

        return null;
    });

    if (producer) {
        product.producer = producer;
    }
    return product;
}