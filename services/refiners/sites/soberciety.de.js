export default async function refine(rootUrl, product, page) {
    product.price = product.price.replace(',', '.').trim();

    if (product.country) {
        product.country = product.country.replace(/\s*\([^)]*\)/g, '').trim();
    }

    if (product.description) {
        product.description = product.description
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    const data = await page.evaluate(() => {
        const result = { abv: null, energy: null, sugar: null };
        const table = document.querySelector('.nutrition-table');
        if (!table) return result;

        const rows = Array.from(table.querySelectorAll('tr'));
        for (const row of rows) {
            const tds = row.querySelectorAll('td');
            if (tds.length < 2) continue;

            const rawLabel = tds[0].textContent || '';
            const rawValue = tds[1].textContent || '';

            const label = rawLabel
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .replace(/\u00a0/g, ' ')
                .trim();

            const value = rawValue
                .replace(/\s+/g, ' ')
                .replace(/\u00a0/g, ' ')
                .trim();

            if (!label || !value) continue;

            if (/calorific|energy/i.test(label)) {
                const match = value.match(/([\d.,]+)\s*kcal/i);
                result.energy = match ? `${parseFloat(match[1])} kcal` : value;
            }

            if (/sugar/i.test(label) || /of which sugar/i.test(label)) {
                result.sugar = value;
            }

            if (/alcohol|abv/i.test(label)) {
                result.abv = value;
            }
        }

        return result;
    });

    product.abv = data.abv;
    product.energy = data.energy;
    product.sugar = data.sugar;

    // Fallback 1
    if (!product.abv) {
        product.abv = await page.evaluate(() => {
            const el = document.querySelector('.icon-list .has-icon p');
            if (!el) return null;
            const text = el.innerText || '';
            const match = text.match(/<\s*([\d.,]+)%/);
            return match ? `${match[1]}%` : null;
        });
    }

    // Fallback 2
    if (!product.abv) {
        product.abv = await page.evaluate(() => {
            const el = document.querySelector('.accordion-details__content');
            if (!el) return null;
            const text = el.textContent || '';
            const match = text.match(/alcohol\s*content[:\s]*[≤<~]?\s*([\d.,]+)\s*%/i);
            return match ? `${match[1].replace(',', '.')}%` : null;
        });
    }

    const vendor = await page.evaluate(() => {
        try {
            const script = document.querySelector('script#viewed_product[data-cmp-info="6"]');
            if (!script) return null;
            const text = script.textContent || '';

            // Try Brand first
            let match = text.match(/Brand:\s*"([^"]+)"/);
            if (match) return match[1].trim();

            // Fallback to Categories array second element
            match = text.match(/Categories":\s*\[\s*"[^"]*",\s*"([^"]+)"\s*\]/);
            return match ? match[1].trim() : null;
        } catch {
            return null;
        }
    });

    if (vendor) product.producer = vendor;

    return product;
}