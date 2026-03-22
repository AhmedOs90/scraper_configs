// services/refiners/sites/altinadrinks.com.js
export default async function refine(rootUrl, product, page) {
    product.price = product.price.replace('$', '').trim();
    product.currency = 'AUD';
    product.country = 'Australia';

    product.description = product.description
        ?.replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^([\s\S]*[.!]).*$/, '$1')
        .trim();

    product.producer = await page.evaluate(() => {
        const scripts = Array.from(
            document.querySelectorAll('script[type="application/ld+json"]')
        );

        for (const script of scripts) {
            try {
                const data = JSON.parse(script.textContent);
                if (data?.brand?.name) return data.brand.name;
            } catch {}
        }

        return null;
    });

    product.abv = await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('.collapsible-content__inner'))
            .find(e => /ABV/i.test(e.textContent));

        if (!el) return null;

        const text = el.textContent.replace(/\s+/g, ' ');
        const match = text.match(/(\d+(?:\.\d+)?)\s*%\s*ABV/i);

        return match ? match[1] : null;
    });

    const nutrition = await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('.collapsible-content__inner'))
            .find(e => /Nutrition/i.test(e.closest('.product-block')?.textContent));

        if (!el) return { energy: null, sugar: null };

        const text = el.textContent.replace(/\s+/g, ' ');

        const energyMatch = text.match(/Energy\s+(\d+)\s*kJ/i);
        const sugarMatch = text.match(/Sugars?\s+(<\s*[\d.]+|\d+(?:\.\d+)?)\s*g/i);

        return {
            energy: energyMatch ? energyMatch[1] : null,
            sugar: sugarMatch ? sugarMatch[1] : null
        };
    });

    product.energy = nutrition.energy;
    product.sugar = nutrition.sugar;

    product.extras = product.extras || {};

    product.extras.ingredients = await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('.product-block'))
            .find(block => /Ingredients/i.test(block.textContent));

        if (!el) return null;

        const inner = el.querySelector('.collapsible-content__inner');
        if (!inner) return null;

        return inner.textContent.replace(/\s+/g, ' ').trim();
    });

    const extras = await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('.collapsible-content__inner'))
            .find(e => /Nutrition/i.test(e.closest('.product-block')?.textContent));

        if (!el) return {};

        const text = el.textContent.replace(/\s+/g, ' ');

        const get = (regex) => {
            const m = text.match(regex);
            return m ? m[1] : null;
        };

        return {
            fat: get(/Fat,\s*Total\s*([\d.]+)\s*g/i),
            carbohydrates: get(/Carbohydrate\s*([\d.]+)\s*g/i),
            dietary_fibre: get(/Dietary Fibre\s*([\d.]+)\s*g/i),
            sodium: get(/Sodium\s*([\d.]+)\s*mg/i),
            magnesium_glycinate: get(/Magnesium glycinate\s*([\d.]+)\s*mg/i),
            l_theanine: get(/L-?theanine\s*([\d.]+)\s*mg/i),
        };
    });
    
    Object.assign(product.extras, extras);
    return product;
}