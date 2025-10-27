// services/refiners/sites/drinkfreeco.com.js
export default async function refine(rootUrl, product, page) {
  const scraped = await page.evaluate(() => {
    const items = Array.from(
      document.querySelectorAll(".icon-with-text.icon-with-text--vertical .icon-with-text__item .inline-richtext")
    );

    const out = { abv: null, country: null, energy: null };

    for (const el of items) {
      const t = (el.textContent || "").trim();

      // ABV: "ABV: 0.0%"
      if (/^\s*abv\s*:/i.test(t)) {
        const m = t.match(/(\d+(?:\.\d+)?)\s*%/);
        out.abv = m ? `${m[1]}%` : t.replace(/^\s*abv\s*:\s*/i, "").trim();
        continue;
      }

      // Energy: "Energy: 20kcal per 100ml" (keep as-is, or extract number if you want)
      if (/^\s*energy\s*:/i.test(t)) {
        out.energy = t.replace(/^\s*energy\s*:\s*/i, "").trim(); // e.g. "20kcal per 100ml"
        continue;
      }

      // Country: typically just a country name, no colon (e.g., "Australia")
      // Guard: ignore obviously non-country keys that use colon
      if (!t.includes(":") && !out.country) {
        out.country = t;
      }
    }

    return out;
  });

  if (!product.abv && scraped.abv) product.abv = scraped.abv;
  if (!product.country && scraped.country) product.country = scraped.country;
  if (!product.energy && scraped.energy) product.energy = scraped.energy;

  return product;
}
