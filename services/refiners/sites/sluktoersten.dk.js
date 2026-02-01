// services/refiners/sites/sluktoersten.dk.js

export default async function refine(rootUrl, Prod, page, config) {
  if (!rootUrl.includes("sluktoersten.dk")) return Prod;
  if (!Prod) return Prod;

  const normalize = (numStr) => {
    if (!numStr) return null;
    const n = parseFloat(String(numStr).replace(",", "."));
    if (Number.isNaN(n)) return null;
    return `${n.toFixed(1)}%`;
  };

  const extractAbvFromText = (text) => {
    if (!text) return null;
    const t = String(text).replace(/\s+/g, " ").trim().toLowerCase();

    // Match "<0,5% Alkohol" or "< 0.5 %" or "0,5% alkohol"
    // Captures the number part.
    let m = t.match(/<\s*(\d+(?:[.,]\d+)?)\s*%/);
    if (m) return normalize(m[1]);

    m = t.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:alkohol|abv|alc\.?\s*vol)?/);
    if (m) return normalize(m[1]);

    // Keyword fallback (if no explicit number)
    // If you're only crawling alcohol-free categories, you can safely default.
    if (t.includes("alkoholfri") || t.includes("alcohol free") || t.includes("alcohol-free")) {
      // Choose ONE rule:
      // return "0.0%";  // strict "alcohol free"
      return "0.5%";     // common EU "alkoholfri" threshold fallback
    }

    return null;
  };

  try {
    // If already extracted, keep it
    if (Prod.abv) return Prod;

    // Pull the exact tab content you showed
    const descriptionTabText = await page.evaluate(() => {
      const el = document.querySelector(
        ".woocommerce-Tabs-panel--description#tab-description, #tab-description"
      );
      return el ? (el.innerText || el.textContent || "") : "";
    });

    let abv = extractAbvFromText(descriptionTabText);

    // Fallback: check product title (sometimes includes "0,5%")
    if (!abv) {
      abv = extractAbvFromText(Prod.name);
    }

    // Fallback: check meta/description text you already have
    if (!abv) {
      abv = extractAbvFromText(Prod.description);
    }

    // Final fallback if you're on alcohol-free pages
    if (!abv && config?.filters?.nonAlcoholicOnly) {
      abv = "0.5%"; // or "0.0%" if your rule says so
    }

    if (abv) Prod.abv = abv;
  } catch (e) {
    // silent fail like your other refiners
  }

  return Prod;
}
