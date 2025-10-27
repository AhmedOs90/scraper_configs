export default async function refine(rootUrl, product, page) {
  const scraped = await page.evaluate(() => {
    const out = {};

    // --- 1. Product attributes (ABV, Country)
    const rows = Array.from(document.querySelectorAll(".product-attributes li"));
    for (const row of rows) {
      const label = (row.querySelector("strong")?.textContent || "").trim();
      const value = (row.querySelector(".right, .tag, span.tag, a.tag")?.textContent || "").trim();

      if (/Alkoholgehalt/i.test(label)) out.abv = value;
      if (/Herkunftsland/i.test(label)) out.country = value;
      if (/Energie|kcal|kJ/i.test(label)) out.energy = value;
    }

    // --- 2. Nutrition info (Energy, Sugars)
    const nutritionItems = Array.from(document.querySelectorAll(".desc ul li"));
    for (const li of nutritionItems) {
      const text = (li.textContent || "").trim();

      // Energy (kj/kcal)
      if (/Energie/i.test(text)) {
        out.energy = text.replace(/.*Energie[^:]*:\s*/i, "").trim(); // e.g. "136kJ / 32kcal"
      }

      // Sugars / carbohydrates
      if (/Kohlenhydrate/i.test(text)) {
        out.sugars = text.replace(/.*Kohlenhydrate[^:]*:\s*/i, "").trim(); // e.g. "6,8g"
      }
    }

    // --- 3. Parse price/currency/brand/category from gtag script
    const scripts = Array.from(document.querySelectorAll("script"));
    for (const script of scripts) {
      const text = script.textContent || "";
      if (text.includes("gtag") && text.includes("view_item")) {
        try {
          const match = text.match(/gtag\s*\(\s*["']event["']\s*,\s*["']view_item["']\s*,\s*(\{[\s\S]*?\})\s*\);/);
          if (match) {
            const dataStr = match[1]
              .replace(/(\w+):/g, '"$1":')
              .replace(/'/g, '"');
            const parsed = JSON.parse(dataStr);

            if (parsed.currency) out.currency = parsed.currency;
            if (parsed.value) out.price = parsed.value;

            if (parsed.items && parsed.items.length) {
              const item = parsed.items[0];
              if (item.item_brand) out.producer = item.item_brand;
              if (item.item_category) out.category = item.item_category;
            }
          }
        } catch (e) {
          console.warn("Error parsing gtag script:", e);
        }
      }
    }

    return out;
  });

  // --- Merge scraped values
  if (!product.abv && scraped.abv) product.abv = scraped.abv;
  if (!product.country && scraped.country) product.country = scraped.country;
  if (!product.energy && scraped.energy) product.energy = scraped.energy;
  if (!product.sugar && scraped.sugar) product.sugar = scraped.sugars;
  if (!product.price && scraped.price) product.price = scraped.price;
  if (!product.currency && scraped.currency) product.currency = scraped.currency;
  if (!product.producer && scraped.producer) product.producer = scraped.producer;
  if (!product.category && scraped.category) product.category = scraped.category;

  return product;
}
