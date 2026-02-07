// services/refiners/sites/disndis.com.js
export default async function refine(rootUrl, product, page) {
    product.name = product.name
        .replace(' - Dis&Dis - Dis&Dis', '')
        .replace(' | Dis&Dis - Dis&Dis', '')
        .replace(' - Dis&Dis Wine Store - Dis&Dis', '')
        .trim();

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();    
    
    product.country = 'Romania';

    const scraped = await page.evaluate(() => {
        const cols = Array.from(document.querySelectorAll(".info-col"));
        const getTxt = (el) => (el?.textContent || "").trim();
        const data = {};

        for (const col of cols) {
            const label = getTxt(col.querySelector("b")).toLowerCase();
            const value = getTxt(col.querySelector("p"));

            if (!label || !value) continue;

            if (label.includes("alcohol")) data.abv = value;
            if (label.includes("winery") || label.includes("brand")) data.producer = value;
        }

        return data;
    });

    if (!product.abv && scraped.abv) product.abv = scraped.abv;
    if (!product.producer && scraped.producer) product.producer = scraped.producer;

    if (product.abv) {
        const m = product.abv.match(/(\d+(?:\.\d+)?)\s*%/);
        product.abv = m ? `${m[1]}%` : product.abv.trim();
    }

    return product;
}