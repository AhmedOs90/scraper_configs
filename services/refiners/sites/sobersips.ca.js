// services/refiners/sites/sobersips.ca.js
export default async function refine(rootUrl, product, page) {
    product.country = "Canada";

    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const abvRe =
        /(?:\b(?:abv|alc\/vol|alc\.?\s*vol|alcohol\s*by\s*vol(?:ume)?)\b\s*[:\-]?\s*(<\s*)?(\d+(?:[.,]\d+)?)\s*%)|(?:(<\s*)?(\d+(?:[.,]\d+)?)\s*%\s*\b(?:abv|alc\/vol|alc\.?\s*vol)\b)/i;

    const energyRe =
        /\bcalories?\b\s*[:\-]?\s*(\d{1,5})\b|\b(?:only|with\s+only)\s*(\d{1,5})\s*calories?\b|\b(\d{1,5})\s*calories?\b/i;

    const sugarRe =
        /\bsugars?\b\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*g\b|\bsugars?\b\s*[:\-]?\s*(\d+(?:[.,]\d+)?)g\b|\bless\s+than\s*(\d+(?:[.,]\d+)?)\s*g\b\s*(?:of\s*)?\bsugars?\b/i;

    const carbsRe =
        /\bcarbohydrates?\b\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*g\b|\bcarbs?\b\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*g\b/i;

    const normNum = (s) => s.replace(",", ".").trim();

    const mAbv = product.description.match(abvRe);
    if (mAbv) {
        const lt = mAbv[1] || mAbv[3] ? "<" : "";
        const val = mAbv[2] || mAbv[4];
        product.abv = `${lt}${normNum(val)}%`;
    } else {
        product.abv = null;
    }

    const mEnergy = product.description.match(energyRe);
    const cal = mEnergy ? (mEnergy[1] || mEnergy[2] || mEnergy[3]) : null;
    product.energy = cal ? cal : null;

    const mSugar = product.description.match(sugarRe);
    const sug = mSugar ? (mSugar[1] || mSugar[2] || mSugar[3]) : null;
    product.sugar = sug ? sug : null;

    const mCarbs = product.description.match(carbsRe);
    const carbs = mCarbs ? (mCarbs[1] || mCarbs[2]) : null;
    product.extras = product.extras || {};
    product.extras.carbohydrates = carbs ? normNum(carbs) : null;

    if (/vegan/i.test(product.description)) {
        product.vegan = "Vegan";
    }

    if (/gluten/i.test(product.description)) {
        product.gluten_free = "Gluten free";
    }
    return product;
}