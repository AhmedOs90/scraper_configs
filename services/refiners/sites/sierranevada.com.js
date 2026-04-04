// services/refiners/sites/sierranevada.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "USA";
    product.currency = "USD";
    product.producer = "Sierra Nevada Brewing Co.";
    product.price = product.price.replace("$", "").trim();

    product.description = await page.evaluate(() => {
        const nodes = document.querySelectorAll(".styles_productDescription__W7aFv .styles_productDescription__prMDV");
        if (nodes.length < 2) return "";

        const full = nodes[1];

        return full.textContent
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim();
    });

    const stats = await page.evaluate(() => {
        const getVal = (label) => {
            const el = [...document.querySelectorAll(".stat")].find((s) =>
                s.querySelector(".stat-title")?.innerText.trim().toLowerCase() === label
            );
            return el ? el.querySelector("p")?.innerText.trim() : null;
        };

        return {
            abv: getVal("alcohol by volume (abv)"),
            carbs: getVal("carbs"),
            calories: getVal("calories")
        };
    });

    product.abv = stats.abv;
    product.sugar = stats.carbs;
    product.energy = stats.calories;

    const extras = await page.evaluate(() => {
        const getGridVal = (label) => {
            const blocks = [...document.querySelectorAll("#brewStats .styles_detailsGrid__RaI0l .styles_textWrapper__KRK8u")];
            const hit = blocks.find((b) => {
                const ps = b.querySelectorAll("p");
                return ps[0]?.innerText.trim().toLowerCase() === label;
            });
            return hit?.querySelectorAll("p")[1]?.innerText.trim() || null;
        };

        const getListVal = (label) => {
            const blocks = [...document.querySelectorAll("#brewStats .styles_detailsList__KWKY7 .styles_textWrapper__KRK8u")];
            const hit = blocks.find((b) => {
                const ps = b.querySelectorAll("p");
                return ps[0]?.innerText.trim().toLowerCase() === label;
            });
            return hit?.querySelectorAll("p")[1]?.innerText.trim() || null;
        };

        return {
            style: getGridVal("style"),
            ibu: getGridVal("ibu"),
            hops: getListVal("hops"),
            yeast: getListVal("yeast")
        };
    });

    product.extras ??= {};
    product.extras.style = extras.style;
    product.extras.ibu = extras.ibu;
    product.extras.hops = extras.hops;
    product.extras.yeast = extras.yeast;
    return product;
}