// services/refiners/sites/delicando.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Austria';
    product.currency = 'EUR';
    product.name = product.name.replace(' - delicando', '').trim();
    product.price = product.price
        .replace(',', '.')
        .replace('€', '')
        .trim();
    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    product.images = await page.evaluate(() => {
        const a = document.querySelector('.productImage.activeImage a[data-lightbox="gallery"]');
        return a?.href ? [a.href.trim()] : [];
    });

    product.producer = await page.evaluate(() => {
        const spans = [...document.querySelectorAll('#lmivInfo .headline')];
        const brandSpan = spans.find((el) => el.textContent.includes('Brand'));
        if (!brandSpan) return null;

        const value = brandSpan.nextElementSibling;
        return value?.textContent.trim() || null;
    });

    if (!product.extras) product.extras = {};

    const nutrition = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('#naehrwerttabelle tr')];

        const getRow = (label) =>
            rows.find((row) => row.textContent.toLowerCase().includes(label));

        const clean = (row) =>
            row?.querySelector('td:last-child')?.innerText
                .replace(/\s+/g, ' ')
                .trim() || null;

        return {
            energy: clean(getRow('energy')),
            fat: clean(getRow('fat')),
            carbohydrates: clean(getRow('carbohydrates')),
            sugar: clean(getRow('sugar')),
            fibres: clean(getRow('dietary fibres')),
            protein: clean(getRow('protein')),
            salt: clean(getRow('salt')),
        };
    });

    product.extras.ingredients = await page.evaluate(() => {
        const spans = [...document.querySelectorAll('#lmivInfo .headline')];
        const ingSpan = spans.find(el => el.textContent.includes('Ingredients'));
        if (!ingSpan) return null;

        const value = ingSpan.nextElementSibling;
        return value?.textContent.replace(/\s+/g, ' ').trim() || null;
    });

    product.energy = nutrition.energy;
    product.sugar = nutrition.sugar;
    product.extras.fat = nutrition.fat;
    product.extras.carbohydrates = nutrition.carbohydrates;
    product.extras.fibres = nutrition.fibres;
    product.extras.protein = nutrition.protein;
    product.extras.salt = nutrition.salt;
    return product;
}