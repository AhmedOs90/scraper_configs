// services/refiners/sites/inn-express.com.js
export default async function refine(rootUrl, product, page) {
    console.log("   called"  );

  const scraped = await page.evaluate(() => {
    const box = document.querySelector("#product-detail-summary-module");
    if (!box) return {};

    const rows = Array.from(box.querySelectorAll("li"));
    const out = {};
    const getTxt = (el) => (el?.textContent || "").trim();

    for (const li of rows) {
      const p = li.querySelector("p");
      const strong = li.querySelector("strong");
      const label = getTxt(strong).replace(/:$/, "").toLowerCase(); // e.g., "brand", "country", "abv", "features"
      const full = getTxt(p);

      if (!label || !full) continue;

      const value = full.replace(/^\s*[^:]+:\s*/i, "").trim(); // strip "Label: "

      if (label === "brand") {
        out.producer = value || null;
      } else if (label === "country") {
        out.country = value || null;
      } else if (label === "abv") {
        // Normalize "0%" / "0.0%" etc
        const m = value.match(/(\d+(?:\.\d+)?)\s*%/);
        out.abv = m ? `${m[1]}%` : value;
      } else if (label === "features") {
        const v = value.toLowerCase();
        if (/vegan/.test(v)) out.vegan = "vegan";
        if (/(gluten[\s-]?free|glut[ée]n\s*frei|gf\b)/i.test(v)) out.gluten_free = "gluten free";
      }
    }

    return out;
  });

  // Assign back without clobbering anything you already captured
  if (!product.producer && scraped.producer) product.producer = scraped.producer;
  if (!product.country && scraped.country) product.country = scraped.country;
  if (!product.abv && scraped.abv) product.abv = scraped.abv;
  if (!product.vegan && scraped.vegan) product.vegan = scraped.vegan;
  if (!product.gluten_free && scraped.gluten_free) product.gluten_free = scraped.gluten_free;

  return product;
}
