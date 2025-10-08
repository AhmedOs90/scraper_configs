// services/refiners/sites/amavine.nl.js
import { detectCategory, categories } from "../refiners_helpers.js";

export default async function refine(rootUrl, product, page) {
  const scraped = await page.evaluate(() => {
    const rows = Array.from(
      document.querySelectorAll(".woocommerce-product-attributes.shop_attributes tr")
    );
    const getTxt = (el) => (el?.textContent || "").trim();

    // Build label -> value map
    const kv = {};
    for (const tr of rows) {
      const label = getTxt(tr.querySelector("th")).toLowerCase();
      const value = getTxt(tr.querySelector("td"));
      if (label) kv[label] = value;
    }

    const hasWord = (s, word) => new RegExp(`\\b${word}\\b`, "i").test(s || "");

    // Country
    let country = null;
    for (const [label, value] of Object.entries(kv)) {
      if (/(land.*herkomst|land van herkomst|herkomst|land|country|origine)/i.test(label)) {
        country = value || null;
        break;
      }
    }

    // Producer (Merk)
    let producer = null;
    for (const [label, value] of Object.entries(kv)) {
      if (/\bmerk\b/i.test(label)) {
        producer = value || null; // copy as-is
        break;
      }
    }

    // ABV (Alcoholpercentage): copy value as-is (no parsing)
    let abv = null;
    for (const [label, value] of Object.entries(kv)) {
      if (label.includes("alcoholpercentage")) {
        abv = (value || "").trim();
        break;
      }
    }

    // Energy: copy as-is
    let energy = null;
    for (const [label, value] of Object.entries(kv)) {
      if (/(calorie|kcal)/i.test(label)) {
        energy = (value || "").trim();
        break;
      }
    }

    // Sugars: copy as-is
    let sugars = null;
    for (const [label, value] of Object.entries(kv)) {
      if (/\bsuiker|suikers\b/i.test(label)) {
        sugars = (value || "").trim();
        break;
      }
    }

    // Vegan (Ja/Nee or contains 'vegan')
    let vegan = null;
    for (const [label, value] of Object.entries(kv)) {
      if (/\bvegan\b/i.test(label)) {
        if (/^\s*(ja|yes)\s*$/i.test(value) || hasWord(value, "vegan")) {
          vegan = "vegan";
        }
        break;
      }
    }

    // Gluten-free: look for the word "gluten" (or 'glutenvrij')
    let glutenFree = null;
    for (const [label, value] of Object.entries(kv)) {
      if (hasWord(label, "gluten") || /glutenvrij/i.test(label) ||
          hasWord(value, "gluten") || /glutenvrij/i.test(value)) {
        glutenFree = "gluten free";
        break;
      }
    }

    return { country, producer, abv, energy, sugars, vegan, glutenFree };
  });

  // Assign back without clobbering existing values
  if (!product.country && scraped.country) product.country = scraped.country;
  if (!product.producer && scraped.producer) product.producer = scraped.producer; // from "Merk"
  if (!product.abv && scraped.abv) product.abv = scraped.abv;
  if (!product.energy && scraped.energy) product.energy = scraped.energy;         // as-is
  if (!product.sugars && scraped.sugars) product.sugars = scraped.sugars;         // as-is
  if (!product.vegan && scraped.vegan) product.vegan = scraped.vegan;             // "vegan"
  if (!product.gluten_free && scraped.glutenFree) product.gluten_free = scraped.glutenFree; // "gluten free"

  // Optional: category fallback
  if (!product.product_category) {
    product.product_category = detectCategory(product.name, product.description, categories);
  }

  return product;
}
