// services/refiners/sites/mashgang.com.js
export default async function refine(rootUrl, product, page) {
  // 1) Get producer from JSON-LD (Shopify commonly provides it)
  const brand = await page
    .evaluate(() => {
      const els = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const el of els) {
        try {
          const data = JSON.parse(el.textContent);

          const candidates = Array.isArray(data)
            ? data
            : data && data['@graph']
              ? data['@graph']
              : [data];

          const prod = candidates.find((x) => {
            const t = x?.['@type'];
            return t === 'Product' || (Array.isArray(t) && t.includes('Product'));
          });

          if (!prod) continue;

          const b = prod.brand;
          if (!b) return null;
          if (typeof b === 'string') return b.trim();
          if (typeof b?.name === 'string') return b.name.trim();

          return null;
        } catch (_) {}
      }
      return null;
    })
    .catch(() => null);

  // producer fallback
  product.producer = product.producer || brand || "Mash Gang";

  // 2) Extract calories + sugar from the description area text
  const nutrition = await page
    .evaluate(() => {
      const pickText = (sel) => {
        const el = document.querySelector(sel);
        return (el?.innerText || el?.textContent || "").trim();
      };

      // Prefer description containers where your <span><ul> lives
      let txt =
        pickText(".product__description") ||
        pickText(".product-description") ||
        pickText(".rte") ||
        pickText("[data-product-description]") ||
        pickText("main");

      const lower = txt.toLowerCase();

      // Calories pattern:
      // "Naturally low in calories (only 31 per can)"
      let calories = null;
      const m = txt.match(/calories\s*\(only\s*(\d+)\s*per\s*can\)/i);
      if (m) calories = m[1];

      // Sugar pattern:
      // "No added sugar."
      let sugar = null;
      if (lower.includes("no added sugar")) sugar = "0";

      return { calories, sugar, txt: lower };
    })
    .catch(() => ({ calories: null, sugar: null, txt: "" }));

  if (!product.energy && nutrition.calories) product.energy = nutrition.calories; // "31"
  if (!product.sugar && nutrition.sugar) product.sugar = nutrition.sugar;        // "0"

  // 3) Vegan / Gluten-free => YES / NO (based on page text)
  // If you prefer "UNKNOWN" when not mentioned, tell me and I’ll switch it.
  if (!product.vegan) {
    product.vegan = nutrition.txt.includes("vegan") ? "YES" : "NO";
  }

  if (!product.gluten_free) {
    const hasGF =
      nutrition.txt.includes("gluten-free") ||
      nutrition.txt.includes("gluten free") ||
      nutrition.txt.includes("glutenvrij");
    product.gluten_free = hasGF ? "YES" : "NO";
  }

  // 4) Country (Mash Gang is UK; optionally detect US storefront by URL)
  const url = page.url?.() || "";
  product.country = product.country || (url.toLowerCase().includes("/en-us") ? "US" : "UK");

  // 5) Clean description like your other refiners
  if (product.description) {
    product.description = product.description
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  return product;
}
