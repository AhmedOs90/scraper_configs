// services/refiners/sites/barrelbrothers.de.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Germany';
    product.currency = 'EUR';
    product.price = product.price.replace(',', '').replace(' €', '').trim();

    const normalizeText = (value) => {
        if (!value) return value;

        return value
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    };

    product.description = normalizeText(product.description);

    product.images = await page.evaluate(() => {
        return [...document.querySelectorAll('img[src*="/storage/"]')]
            .map(img => img.src)
            .filter(Boolean);
    });

    const details = await page.evaluate(() => {
        const clean = (value) => value?.replace(/\s+/g, ' ').trim() || null;

        const normalizeWithG = (value) => {
            value = clean(value);
            if (!value) return null;
            return /\bg$/i.test(value) ? value : `${value} g`;
        };

        const specs = {};
        const dts = [...document.querySelectorAll('dl dt')];

        for (const dt of dts) {
            const key = clean(dt.textContent);
            const dd = dt.nextElementSibling;
            if (!key || !dd || dd.tagName.toLowerCase() !== 'dd') continue;

            specs[key] = clean(dd.textContent);
        }

        const text = document.body.textContent.replace(/\s+/g, ' ').trim();

        const grab = (regex) => {
            const match = text.match(regex);
            return match?.[1]?.trim() || null;
        };

        return {
            abv:
                clean(specs['Alkoholgehalt']) ||
                grab(/Alkoholgehalt\s*([\d,.]+\s*%)/i),

            size:
                clean(specs['Inhalt']) ||
                grab(/Inhalt\s*([\d,.]+\s*[Ll])/i),

            producer:
                clean(specs['Marke']) ||
                grab(/Marke\s*(.*?)(?:Kohlenhydrate|Farbstoffe|Inhalt|$)/i),

            ingredients:
                specs['Zutaten'] ||
                grab(/Wasser,\s*(.*?)\.\s*Konservierungsstoff:/i),

            preservatives:
                grab(/Konservierungsstoff:\s*(.*?)\.\s*Säurungsmittel:/i),

            acidifiers:
                grab(/Säurungsmittel:\s*(.*?)\.\s*Nährwertangaben/i),

            fat:
                normalizeWithG(specs['Fett']) ||
                grab(/Fett:\s*([\d,.]+\s*g)/i),

            carbohydrates:
                normalizeWithG(specs['Kohlenhydrate']) ||
                grab(/Kohlenhydrate:\s*([\d,.]+\s*g)/i),

            sugar:
                normalizeWithG(specs['Kohlenhydrate, davon Zucker']) ||
                grab(/Zucker:\s*([\d,.]+\s*g)/i),

            protein:
                normalizeWithG(specs['Eiweiß']) ||
                grab(/Eiweiß:\s*([\d,.]+\s*g)/i),

            sodium:
                normalizeWithG(specs['Natrium'] || specs['Salz']) ||
                grab(/Natrium:\s*([\d,.]+\s*g)/i),

            energy:
                clean(specs['Brennwert']) ||
                grab(/Brennwert:\s*([^,]+(?:,\s*[^,]+)?)/i),
        };
    });

    product.extras ||= {};
    product.extras.ingredients = details.ingredients;
    product.extras.preservatives = details.preservatives;
    product.extras.acidifiers = details.acidifiers;
    product.extras.fat = details.fat;
    product.extras.carbohydrates = details.carbohydrates;
    product.extras.protein = details.protein;
    product.extras.sodium = details.sodium;
    product.extras.size = details.size;

    product.abv = details.abv;
    product.producer = details.producer;
    product.energy = details.energy;
    product.sugar = details.sugar;
    return product;
}