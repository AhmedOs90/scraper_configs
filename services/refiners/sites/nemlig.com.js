// services/refiners/sites/nemlig.com.js

export default async function refine(rootUrl, product, page) {
  // Mirror your original guard
  if (!product.price) return product;

  // Brand
  try {
    await page.waitForSelector("strong.product-detail__attribute-key", { timeout: 5000 });
    product.producer = await page.evaluate(() => {
      const keys = document.querySelectorAll("strong.product-detail__attribute-key");
      for (const key of keys) {
        if (key.textContent?.trim().toLowerCase().includes("brand")) {
          return key.parentElement?.querySelector("span.product-detail__attribute-value")?.textContent?.trim() || null;
        }
      }
      return null;
    });
  } catch {
    // noop
  }

  // ABV
  try {
    await page.waitForSelector(".product-detail__attribute-key", { timeout: 5000 });
    product.abv = await page.evaluate(() => {
      const keys = document.querySelectorAll(".product-detail__attribute-key");
      for (const key of keys) {
        const label = key.textContent?.trim().toLowerCase();
        if (label && label.includes("alkohol-%")) {
          const valueEl = key.parentElement?.querySelector(".product-detail__attribute-value");
          return valueEl?.textContent?.trim().replace(",", ".");
        }
      }
      return null;
    });
  } catch {
    // noop
  }

  // Nutrition
  try {
    await page.waitForSelector("table", { timeout: 5000 });
    product.energy = await page.evaluate(() => {
      const rows = document.querySelectorAll("table tr");
      for (const row of rows) {
        const label = row.querySelector("td")?.textContent?.trim();
        if (label && label.toLowerCase().includes("energi")) {
          return row.querySelectorAll("td")[1]?.textContent?.trim() || null;
        }
      }
      return null;
    });

    product.sugar = await page.evaluate(() => {
      const rows = document.querySelectorAll("table tr");
      for (const row of rows) {
        const label = row.querySelector("td")?.textContent?.trim();
        if (label && label.toLowerCase().includes("heraf sukkerarter")) {
          return row.querySelectorAll("td")[1]?.textContent?.trim() || null;
        }
      }
      return null;
    });
  } catch {
    // noop
  }

  // Fallbacks
  if (!product.abv) {
    product.abv = null; // keep null unless you want regex fallback here
  }
  product.currency = product.currency || "DKK";
  return product;
}
