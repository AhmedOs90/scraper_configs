// services/refiners/sites/asda.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'UK';
    product.currency = 'GBP';

    product.price = product.price.replace('£', '').trim();
    product.price = product.price.replace('actual price', '').trim();
    product.price = product.price.replace('was', '').trim();

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.producer = await page.evaluate(() => {
        const el = document.querySelector('script[type="application/ld+json"]');
        if (!el) return null;
        try {
            const data = JSON.parse(el.textContent);
            return data?.brand?.name ?? null;
        } catch {
            return null;
        }
    });

    if (product.producer) {
        product.name = product.name.replace(product.producer, '').trim();
    }

    const descLower = product.description.toLowerCase();

    if (descLower.includes('vegan')) {
        product.vegan = 'Vegan';
    }

    if (descLower.includes('gluten')) {
        product.gluten_free = 'Gluten free';
    }

    const energyMatch = product.description.match(
        /energy[^0-9]*([\d.]+)\s*(kcal|kj)/i
    );
    if (energyMatch) {
        product.energy = `${energyMatch[1]} ${energyMatch[2]}`;
    }

    const sugarMatch = product.description.match(
        /sugars?[^0-9]*([\d.]+)\s*g/i
    );
    if (sugarMatch) {
        product.sugar = `${sugarMatch[1]} g`;
    }
    return product;
}