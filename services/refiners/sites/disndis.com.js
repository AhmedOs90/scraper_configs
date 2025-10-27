// services/refiners/sites/disndis.com.js
export default async function refine(rootUrl, product, page) {
  const scraped = await page.evaluate(() => {
    const cols = Array.from(document.querySelectorAll(".info-col"));
    const getTxt = (sel) => (sel?.textContent || "").trim();
    const data = {};

    for (const col of cols) {
      const label = getTxt(col.querySelector("b")).toLowerCase();
      const value = getTxt(col.querySelector("p"));

      if (!label || !value) continue;

      if (label.includes("alcohol")) data.abv = value;
      if (label.includes("winery") || label.includes("brand")) data.producer = value;
      if (label.includes("country")) data.country = value;
      if (label.includes("region") && !data.region) data.region = value;
    }

    return data;
  });

  // Assign back
  if (!product.abv && scraped.abv) product.abv = scraped.abv;
  if (!product.producer && scraped.producer) product.producer = scraped.producer;
  if (!product.country && scraped.country) product.country = scraped.country;
  if (!product.region && scraped.region) product.region = scraped.region;

  // Normalize ABV (keep “0%” or “0.0%” clean)
  if (product.abv) {
    const m = product.abv.match(/(\d+(?:\.\d+)?)\s*%/);
    product.abv = m ? `${m[1]}%` : product.abv.trim();
  }

  return product;
}
