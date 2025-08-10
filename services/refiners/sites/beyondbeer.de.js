// services/refiners/sites/beyondbeer.de.js

export default async function refine(rootUrl, product, page) {
  product.abv = await page.evaluate(() => {
    const rows = document.querySelectorAll("table.product-detail-properties-table tr.properties-row");
    for (let row of rows) {
      const label = row.querySelector("th.properties-label")?.textContent?.trim().toLowerCase();
      const value = row.querySelector("td.properties-value")?.textContent?.trim();
      if (label && label.includes("alkoholgehalt")) return value || null;
    }
    return null;
  }).catch(() => null);

  return product;
}
