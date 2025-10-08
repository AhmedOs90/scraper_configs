// services/refiners/sites/joinclubsoda.com.js
import { detectCategory, categories } from "../refiners_helpers.js";

export default async function refine(rootUrl, product, page) {
  // 1) Elementor tab content (primary source)
  // 1) Elementor tab content (primary source)
const tab = await page.evaluate(() => {
  const container = (() => {
  // 1) Prefer the tab whose text is "Essential information"
  const titleByText = Array.from(
    document.querySelectorAll(".elementor-tabs .elementor-tab-title[aria-controls]")
  ).find(el => /essential information/i.test(el.textContent || ""));
  if (titleByText) {
    const id = titleByText.getAttribute("aria-controls");
    const panel = id && document.getElementById(id);
    if (panel) return panel;
  }

  // 2) Fallback: currently active tab title
  const activeTitle = document.querySelector(
    ".elementor-tabs .elementor-tab-title[aria-selected='true'][aria-controls]"
  );
  if (activeTitle) {
    const id = activeTitle.getAttribute("aria-controls");
    const panel = id && document.getElementById(id);
    if (panel) return panel;
  }

  // 3) Last resort: a visible/active panel
  const visible = Array.from(
    document.querySelectorAll(".elementor-tabs-content-wrapper .elementor-tab-content")
  ).find(p => p.classList.contains("elementor-active") ||
              p.style.display === "block" ||
              !p.hasAttribute("hidden"));
  return visible || null;
})();
if (!container) return null;


  const lines = Array.from(container.querySelectorAll("p"))
    .map(p => (p.textContent || "").trim())
    .filter(Boolean);
    console.log("   Lines:", lines  );

  // Helper: if line starts with any label, return text after first colon — AS-IS.
  const getAfterColonForLabels = (labels) => {
    const rx = new RegExp("^\\s*(?:" + labels.join("|") + ")\\s*:\\s*(.+)$", "i");
    const hit = lines.find(l => rx.test(l));
    return hit ? hit.replace(rx, "$1").trim() : null;
  };

  const abvRaw    = getAfterColonForLabels(["ABV"]);
  const energyRaw = getAfterColonForLabels(["Energy", "Calories", "Kcal"]);
  const sugarRaw  = getAfterColonForLabels(["Sugar", "Sugars"]);
  const allergies = getAfterColonForLabels(["Allergies"]);

  // Only boolean flags from Allergies; still no value parsing.
  const hasWord = (s, w) => new RegExp(`\\b${w}\\b`, "i").test(s || "");
  const veganFlag  = allergies && hasWord(allergies, "vegan") ? "vegan" : null;
  const glutenFlag = allergies && hasWord(allergies, "gluten") ? "gluten free" : null;

  return {
    abv: abvRaw,          // e.g., "0.0%"
    energy: energyRaw,    // e.g., "42kcal/100ml" (as-is)
    sugar: sugarRaw,      // e.g., "9g/100ml" (as-is)
    vegan: veganFlag,     // "vegan" or null
    glutenFree: glutenFlag
  };
});


  // 2) Tags fallback (if tab didn’t provide values)
  const tagsFallback = await page.evaluate(() => {
    const tagEls = Array.from(
      document.querySelectorAll(".elementor-post-info__terms-list a, a[href*='/product-tag/']")
    );
    const tags = tagEls.map(a => (a.textContent || "").trim()).filter(Boolean);

    const abvTag = tags.find(t => t.includes("%"));
    const hasVegan = tags.some(t => /\bvegan\b/i.test(t));
    const hasGluten = tags.some(t => /\bgluten\b/i.test(t));

    return {
      abv: abvTag || null,
      vegan: hasVegan ? "vegan" : null,
      glutenFree: hasGluten ? "gluten free" : null
    };
  });

  // 3) Brand from Categories (drinks-brands)
  const brandInfo = await page.evaluate(() => {
    const a = document.querySelector(
      ".elementor-post-info__terms-list a[href*='/product-category/drinks-brands/']"
    );
    return a ? (a.textContent || "").trim() : null;
  });

  // 4) Assign without clobbering existing values
  if (tab) {
    if (!product.abv && tab.abv) product.abv = tab.abv;
    if (!product.energy && tab.energy) product.energy = tab.energy;       // as-is
    if (!product.sugar && tab.sugar) product.sugar = tab.sugar;       // as-is
    if (!product.vegan && tab.vegan) product.vegan = tab.vegan;           // "vegan"
    if (!product.gluten_free && tab.glutenFree) product.gluten_free = tab.glutenFree; // "gluten free"
  }

  // Tags fallback if any are still missing
  if (!product.abv && tagsFallback.abv) product.abv = tagsFallback.abv;
  if (!product.vegan && tagsFallback.vegan) product.vegan = tagsFallback.vegan;
  if (!product.gluten_free && tagsFallback.glutenFree) product.gluten_free = tagsFallback.glutenFree;

  // Brand/prod
  if (brandInfo && !product.producer) product.producer = brandInfo;

  // Optional: category fallback
  if (!product.product_category) {
    product.product_category = detectCategory(product.name, product.description, categories);
  }

  return product;
}
