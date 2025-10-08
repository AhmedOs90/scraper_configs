// services/refiners/sites/boozefree.co.uk.js
import { detectCategory, categories } from "../refiners_helpers.js";

export default async function refine(rootUrl, product, page) {
  const scraped = await page.evaluate(() => {
    const pickPer100 = (raw) => {
      if (!raw) return null;
      const text = raw.trim();
      const parts = text.split("/").map(s => s.trim());
      const clean = (s) => s.replace(/[^0-9.,]/g, "").replace(",", ".");
      if (parts.length >= 2) return clean(parts[1]) || null; // prefer per 100 ml
      return clean(text) || null;
    };

    const texts = [
      ...Array.from(document.querySelectorAll(".product__text"), el => (el.textContent || "").trim()),
      (document.querySelector(".product__description.rte")?.innerText || "").trim(),
      (document.body?.innerText || "").trim(),
    ].filter(Boolean).join("\n");

    // ABV patterns:
    // - "Alcohol by Volume - 0.0%" / "Alcohol by Volume: 0.0%"
    // - "ABV 0.5%" / "0.5% ABV"
    const abv =
      (texts.match(/alcohol\s*by\s*volume[^0-9%]*?(\d+(?:[.,]\d+)?)\s*%/i)?.[1] ||
       texts.match(/(?:^|\b)abv\b[^0-9%]*?(\d+(?:[.,]\d+)?)\s*%/i)?.[1] ||
       texts.match(/(\d+(?:[.,]\d+)?)\s*%\s*abv\b/i)?.[1])?.replace(",", ".")
      ? `${(texts.match(/alcohol\s*by\s*volume[^0-9%]*?(\d+(?:[.,]\d+)?)\s*%/i)?.[1] ||
            texts.match(/(?:^|\b)abv\b[^0-9%]*?(\d+(?:[.,]\d+)?)\s*%/i)?.[1] ||
            texts.match(/(\d+(?:[.,]\d+)?)\s*%\s*abv\b/i)?.[1]).replace(",", ".")}%`
      : null;

    // Energy per 100 ml:
    // - "Kcals per 100ml: 21 kcals" / "Calories per 100ml: 21"
    // - plain "21 kcal" fallback
    let energyPer100 =
      texts.match(/k?cal(?:ories)?\s*per\s*100\s*ml[^0-9]*?(\d+(?:[.,]\d+)?)/i)?.[1] ||
      texts.match(/per\s*100\s*ml[^0-9]*?(\d+(?:[.,]\d+)?)\s*k?cal/i)?.[1] ||
      texts.match(/(\d+(?:[.,]\d+)?)\s*k?cal\b/i)?.[1] ||
      null;
    if (energyPer100) energyPer100 = energyPer100.replace(",", ".");

    // Sugars per 100 ml:
    // - "Sugar per 100ml: 2.4 grams" / "Sugars per 100ml: 2.4 g"
    // - Dutch fallback "Suiker per 100ml"
    let sugarsPer100 =
      texts.match(/sugars?\s*per\s*100\s*ml[^0-9]*?(\d+(?:[.,]\d+)?)/i)?.[1] ||
      texts.match(/suiker\s*per\s*100\s*ml[^0-9]*?(\d+(?:[.,]\d+)?)/i)?.[1] ||
      texts.match(/sugars?[^0-9/]*?(\d+(?:[.,]\d+)?)\s*g\b/i)?.[1] ||
      null;
    if (sugarsPer100) sugarsPer100 = sugarsPer100.replace(",", ".");

    // Bonus: if a structured nutrition list exists with A/B style
    const rows = Array.from(document.querySelectorAll(".product-block.product-block-nutritional-information ul li"));
    if (rows.length) {
      for (const li of rows) {
        const spans = li.querySelectorAll("span");
        const label = (spans[0]?.textContent || "").trim().toLowerCase();
        const value = (spans[1]?.textContent || "").trim();
        if (!label || !value) continue;
        if (!energyPer100 && /\bcalorie\b|\bcalories\b|\bkcal\b/.test(label)) {
          const v = pickPer100(value);
          if (v) energyPer100 = v;
        }
        if (!sugarsPer100 && /\bsugar\b|\bsugars\b|\bsuiker\b/.test(label)) {
          const v = pickPer100(value);
          if (v) sugarsPer100 = v;
        }
        if (!abv && /\babv\b|\balcohol\b|\balcohol content\b/.test(label)) {
          const m = value.match(/(\d+(?:[.,]\d+)?)\s*%/);
          if (m) abv = `${m[1].replace(",", ".")}%`;
        }
      }
    }

    return { abv, energyPer100, sugarsPer100 };
  });

  if (!product.abv && scraped.abv) product.abv = scraped.abv;
  if (!product.energy && scraped.energyPer100) product.energy = `${scraped.energyPer100} kcal/100ml`;
  if (!product.sugar && scraped.sugarsPer100) product.sugar = `${scraped.sugarsPer100} g/100ml`;

  // optional: keep your category fallback
  if (!product.product_category) {
    product.product_category = detectCategory(product.name, product.description, categories);
  }

  product.producer = await page.evaluate(() => {
    const scriptTag = document.querySelector("#viewed_product");
    if (!scriptTag) return null;
    const content = scriptTag.textContent || "";
    const match = content.match(/Brand:\s*"([^"]+)"/);
    return match ? match[1] : null;
  });

  const flags = await page.evaluate(() => {
  // Collect plain text flags
  const lineTexts = Array.from(document.querySelectorAll(".product__text"), el =>
    (el.textContent || "").trim().toLowerCase()
  ).filter(Boolean);

  // Word-boundary gluten (matches "gluten", "gluten-free", etc., but key is the word "gluten" exists)
  const hasVeganText = lineTexts.some(t => /\bvegan\b/i.test(t) || /vegan\s*and\s*vegetarian/i.test(t));
  const hasGlutenText = lineTexts.some(t => /\bgluten\b/i.test(t));

  // Fallback via icon-row labels if present (same approach as before)
  const iconLabels = Array.from(
    document.querySelectorAll(".product-block.product-block-icon-row .feature-icon-list li .block"),
    n => (n.textContent || "").trim().toLowerCase()
  );

  const hasVeganIcon = iconLabels.some(t => /\bvegan\b/.test(t) || /vegan\s*friendly/.test(t));
  // Only look for the word "gluten"
  const hasGlutenIcon = iconLabels.some(t => /\bgluten\b/.test(t));

  return {
    hasVegan: hasVeganText || hasVeganIcon,
    hasGluten: hasGlutenText || hasGlutenIcon
  };
});

// Set exact strings, without overwriting existing values
if (flags?.hasVegan && !product.vegan) {
  product.vegan = "vegan";
}
if (flags?.hasGluten && !product.gluten_free) {
  product.gluten_free = "gluten free";
}
  return product;
}
