// services/refiners/sites/worldofnix.com.js

export default async function refine(rootUrl, product, page) {
  // Brand from #viewed_product
  product.producer = await page.evaluate(() => {
    const scriptTag = document.querySelector("#viewed_product");
    if (!scriptTag) return null;
    const content = scriptTag.textContent || "";
    const match = content.match(/Brand:\s*"([^"]+)"/);
    return match ? match[1] : null;
  });

  // Energy
  product.energy = await page.evaluate(() => {
    const items = document.querySelectorAll("li.details-list__item");
    for (let item of items) {
      const title = item.querySelector(".details-list__title")?.textContent?.trim().toLowerCase();
      const value = item.querySelector(".details-list__content")?.textContent?.trim();
      if (title && title.includes("energy")) return value || null;
    }
    return null;
  }).catch(() => null);

  // Sugars
  product.sugar = await page.evaluate(() => {
    const items = document.querySelectorAll("li.details-list__item");
    for (let item of items) {
      const title = item.querySelector(".details-list__title")?.textContent?.trim().toLowerCase();
      const value = item.querySelector(".details-list__content")?.textContent?.trim();
      if (title && title.includes("sugar")) return value || null;
    }
    return null;
  }).catch(() => null);

  return product;
}
