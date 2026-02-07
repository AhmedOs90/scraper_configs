// services/refiners/sites/drinkfreeco.com.js
export default async function refine(rootUrl, product, page) {
    product.country = 'Singapore';

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const details = await page.evaluate(() => {
        const spans = Array.from(
            document.querySelectorAll(
                'ul.icon-with-text.icon-with-text--vertical li.icon-with-text__item span.h4.inline-richtext'
            )
        );

        let abv = null;
        let energy = null;

        for (const span of spans) {
            const text = (span.textContent || '').trim();

            if (!abv && /^ABV\s*:/i.test(text)) {
                abv = text.replace(/^ABV\s*:\s*/i, '').trim();
            }

            if (!energy && /^Energy\s*:/i.test(text)) {
                const raw = text.replace(/^Energy\s*:\s*/i, '').trim();
                energy = raw
                    .replace(/\s*per\s*/i, ' / ')
                    .replace(/(\d)\s*(kcal)\b/i, '$1 $2')
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            if (abv && energy) break;
        }

        return { abv, energy };
    });

    if (details?.abv) product.abv = details.abv;
    if (details?.energy) product.energy = details.energy;

    return product;
}