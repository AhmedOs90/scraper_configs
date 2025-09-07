// services/refiners/sites/thesobrmarket.com.js
import { extractABVFromText } from "../refiners_helpers.js";
import { detectCategory, categories } from "../refiners_helpers.js";

export default async function refine(rootUrl, product, page) {
  console.log(product.name);

  // 1) Detect category as you already do
  product.product_category = detectCategory(
    product.name,
    product.description,
    categories
  );

  // 2) Do a single evaluate to gather everything we can from the DOM
  const scraped = await page.evaluate(() => {
    // --- Helpers (scoped to browser context) ---
    const getTextLabelsFlags = () => {
      const textLabels = Array.from(
        document.querySelectorAll(".text-with-icon__label")
      ).map((el) => (el.textContent || "").trim());

      const hasVegan = textLabels.includes("Vegan");
      const hasGlutenFree = textLabels.includes("Gluten Free or Removed");
      const hasZeroAbv = textLabels.includes("Zero ABV");

      return { hasVegan, hasGlutenFree, hasZeroAbv };
    };

    const parseViewedProductItem = () => {
      const scriptTag = document.querySelector("#viewed_product");
      if (!scriptTag) return null;

      const content = scriptTag.textContent || "";

      // Get the object literal from: var item = { ... };
      const objMatch = content.match(/var\s+item\s*=\s*({[\s\S]*?});/);
      if (!objMatch) return null;

      const objLiteral = objMatch[1];
      try {
        // Evaluate ONLY the object literal (safe; no _learnq methods run)
        // eslint-disable-next-line no-new-func
        const itemObj = Function('"use strict";return (' + objLiteral + ")")();
        return itemObj && typeof itemObj === "object" ? itemObj : null;
      } catch {
        return null;
      }
    };

    const extractAbvFromCategories = (itemObj) => {
      const cats = Array.isArray(itemObj?.Categories) ? itemObj.Categories : [];
      // Find tag like "0.0% Alcohol", "5% Alcohol", "12.5% Alcohol"
      const abvTag = cats.find((c) => /(\d+(?:\.\d+)?)\s*%\s*Alcohol/i.test(String(c)));
      if (!abvTag) return null;

      const m = String(abvTag).match(/(\d+(?:\.\d+)?)\s*%/);
      return m ? `${m[1]}%` : null;
    };

    const readNutrition = () => {
      // First non-heading table line e.g., "... 45 cals ... 5 g sugar ..."
      const tableSpan = document.querySelector(
        "div.table span.table-line:not(.table-line--heading)"
      );
      if (!tableSpan) return { energy: null, sugar: null };

      const text = (tableSpan.textContent || "").trim();
      const calMatch = text.match(/(\d+\s*cals?)/i);
      const sugarMatch = text.match(/(\d+\s*g\s*sugar)/i);

      return {
        energy: calMatch ? calMatch[1] : null,
        sugar: sugarMatch ? sugarMatch[1] : null,
      };
    };

    // --- Execute helpers ---
    const flags = getTextLabelsFlags();
    const itemObj = parseViewedProductItem();
    const abvFromCategories = itemObj ? extractAbvFromCategories(itemObj) : null;

    // Prefer Brand directly from parsed object
    const producer = itemObj?.Brand ?? null;

    const { energy, sugar } = readNutrition();

    return {
      flags,
      abvFromCategories,
      producer,
      energy,
      sugar,
    };
  });

  // 3) Map flags to product
  if (scraped.flags?.hasVegan) product.vegan = "vegan";
  if (scraped.flags?.hasGlutenFree) product.gluten_free = "gluten_free";

  // 4) ABV priority:
  //    a) Hard Zero ABV label
  //    b) "X% Alcohol" from Categories in #viewed_product
  //    c) Fallback to text extraction (name/description)
  if (scraped.flags?.hasZeroAbv) {
    product.abv = "0.0%";
  } else if (scraped.abvFromCategories) {
    product.abv = scraped.abvFromCategories;
  } else {
    product.abv = extractABVFromText(product.name, product.description);
  }

  // 5) Producer (Brand) from the same object
  product.producer = scraped.producer ?? product.producer ?? null;

  // 6) Nutrition
  product.energy = scraped.energy ?? null;
  product.sugar = scraped.sugar ?? null;

  return product;
}
