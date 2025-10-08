// services/refiners/sites/thechiller.co.nz.js
import { detectCategory, categories } from "../refiners_helpers.js";

/**
 * The Chiller (Shopify) refiner
 * - ABV from:
 *    1) Nutritional table: ".product-block-nutritional-information ul li" -> label "Alcohol Content" => value like "0.5%"
 *    2) Icon row: ".product-block-icon-row .feature-icon-list li .block" containing "ABV" => e.g., "0.5% ABV"
 * - Energy & Sugars:
 *    Nutritional table shows "Calorie (kcal)" and "Sugars" as "Per Serve/100ml" -> e.g., "38/31" or "1.5g/1.2g"
 *    We pick the second number (per 100ml).
 * - Low sugar flag:
 *    Icon row text "Low Sugar" => product.low_sugar = true
 */
export default async function refine(rootUrl, product, page) {
  // --- ABV from Nutritional Information ---
  const abvFromNutrition = await page.evaluate(() => {
    const wrap = document.querySelector(".product-block.product-block-nutritional-information ul");
    if (!wrap) return null;

    // find <li> with label "Alcohol Content"
    const items = Array.from(wrap.querySelectorAll("li"));
    for (const li of items) {
      const label = li.querySelector("span");
      const value = li.querySelector("span:last-child");
      const labelText = label?.textContent?.trim().toLowerCase() ?? "";
      if (labelText.includes("alcohol content") || labelText === "alcohol") {
        const raw = value?.textContent?.trim() ?? "";
        // Expect "0.5%" or text variants like "<0.5%" or "less than 0.5%"
        // Extract first percentage
        const m = raw.match(/(\d+(?:[.,]\d+)?)\s*%/);
        if (m) {
          const pct = m[1].replace(",", ".");
          return `${pct}%`;
        }
        // fallback: textual hints
        if (/less\s*than/i.test(raw) || /<\s*0\.?5\s*%/i.test(raw)) return "0.5%";
      }
    }
    return null;
  });

  // --- ABV fallback from Icon Row "0.5% ABV" ---
  const abvFromIcon = await page.evaluate(() => {
    const icons = Array.from(document.querySelectorAll(".product-block.product-block-icon-row .feature-icon-list li .block"));
    for (const el of icons) {
      const t = el.textContent?.trim() ?? "";
      // e.g., "0.5% ABV" or "ABV 0.5%"
      const m = t.match(/(\d+(?:[.,]\d+)?)\s*%\s*ABV|ABV\s*(\d+(?:[.,]\d+)?)\s*%/i);
      if (m) {
        const num = (m[1] || m[2]).replace(",", ".");
        return `${num}%`;
      }
    }
    return null;
  });

  // Prefer nutrition ABV, else icon ABV, else keep existing value
  product.abv = abvFromNutrition || abvFromIcon || product.abv || null;

  // --- Energy (kcal) & Sugars (g) per 100ml from Nutritional block ---
  // The block shows "Per Serve/100ml" values like "38/31" or "1.5g/1.2g"
  // We pull the second number (per 100ml).
  const { energyPer100ml, sugarsPer100ml } = await page.evaluate(() => {
    const wrap = document.querySelector(".product-block.product-block-nutritional-information ul");
    let energy = null, sugars = null;

    if (wrap) {
      const rows = Array.from(wrap.querySelectorAll("li"));
      const findVal = (labelNeedle) => {
        for (const li of rows) {
          const spans = li.querySelectorAll("span");
          if (spans.length < 2) continue;
          const label = spans[0].textContent?.trim().toLowerCase() ?? "";
          const raw = spans[1].textContent?.trim() ?? "";
          if (label.includes(labelNeedle)) {
            // Example formats:
            // "38/31"  -> pick "31"
            // "1.5g/1.2g" -> strip units, pick 1.2
            const parts = raw.split("/").map(s => s.trim());
            if (parts.length >= 2) {
              // take the second piece (per 100ml)
              const per100 = parts[1].replace(/[^0-9.,]/g, "").replace(",", ".");
              return per100 || null;
            }
            // single value fallback
            const single = raw.replace(/[^0-9.,]/g, "").replace(",", ".");
            return single || null;
          }
        }
        return null;
      };

      energy = findVal("calorie");   // matches "Calorie (kcal)"
      sugars = findVal("sugar");     // matches "Sugars"
    }

    return { energyPer100ml: energy, sugarsPer100ml: sugars };
  });

  // Keep your existing fields; if you store strings elsewhere, keep as string.
  // Otherwise you can Number() them. Here we store as string to be consistent.
  product.energy = product.energy ?? (energyPer100ml ? `${energyPer100ml} kcal/100ml` : null);
  product.sugar = product.sugar ?? (sugarsPer100ml ? `${sugarsPer100ml} g/100ml` : null);

  // --- Low sugar flag from icon row label ---
  const lowSugar = await page.evaluate(() => {
    const tag = Array.from(document.querySelectorAll(".product-block.product-block-icon-row .feature-icon-list li .block"))
      .some(el => /\blow\s*sugar\b/i.test(el.textContent ?? ""));
    return tag || null;
  });
  if (lowSugar) product.low_sugar = true;

  // --- Vegan / Gluten Free from icon row labels ---
  const flags = await page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll(
        ".product-block.product-block-icon-row .feature-icon-list li .block"
      )
    );
    const labels = nodes.map(n => (n.textContent || "").trim().toLowerCase());

    const hasVegan =
      labels.some(t => /(^|\b)vegan(\b|$)/i.test(t)) ||
      labels.some(t => /vegan\s*friendly/i.test(t));

    const hasGlutenFree = labels.some(t => /\bgluten\b/i.test(t));


    return { hasVegan, hasGlutenFree };
  });

  // Set EXACT strings if present
  if (flags?.hasVegan) {
    product.vegan = "vegan";
  }
  if (flags?.hasGlutenFree) {
    product.gluten_free = "gluten free";
  }
  
  // Vendor (Shopify Analytics global)
const vendor = await page.evaluate(() => {
  try {
    return (
      window?.ShopifyAnalytics?.meta?.product?.vendor ??
      null
    );
  } catch {
    return null;
  }
});

// Prefer not to overwrite if already present
if (vendor) {
  product.vendor = product.vendor || vendor;
  // optional: keep your cross-site "producer" field in sync
  if (!product.producer) product.producer = vendor;
}

  // Category fallback using your helper
  if (!product.product_category) {
    product.product_category = detectCategory(product.name, product.description, categories);
  }

  return product;
}
