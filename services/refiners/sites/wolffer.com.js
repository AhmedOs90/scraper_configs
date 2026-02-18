// services/refiners/sites/wolffer.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "USA";
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    product.abv = await page.evaluate(() => {
        const li = [...document.querySelectorAll(".accordion__content li")]
            .find(el => el.textContent.includes("Alcohol by Volume"));
        if (!li) return null;

        const match = li.textContent.match(/([\d.]+)/);
        return match ? `${match[1]}%` : null;
    });

    product.producer = await page.evaluate(() => {
        const el = document.querySelector('script[type="application/ld+json"]');
        if (!el) return null;

        try {
            const data = JSON.parse(el.textContent);
            return data?.brand?.name || null;
        } catch {
            return null;
        }
    });
    return product;
}