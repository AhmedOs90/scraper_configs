// services/refiners/sites/ginsiders.com.js
export default async function refine(rootUrl, product, page) {
  // Helper to normalize text: trim, lowercase, remove diacritics
  const norm = (s) =>
    (s || "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}+/gu, "");

  const data = await page
    .evaluate(() => {
      const getTxt = (el) =>
        (el?.textContent || "")
          .replace(/\s+/g, " ")
          .trim();

      const rows = Array.from(
        document.querySelectorAll(
          ".woocommerce-product-attributes tr, .shop_attributes tr"
        )
      );

      const out = { abvRaw: null, brandRaw: null };

      for (const tr of rows) {
        const th = tr.querySelector("th, .woocommerce-product-attributes-item__label");
        const td = tr.querySelector("td, .woocommerce-product-attributes-item__value");
        const label = getTxt(th);
        const value = getTxt(td);

        if (!label || !value) continue;

        out.pairs ??= [];
        out.pairs.push([label, value]);

        // capture likely ABV rows (French)
        // e.g., "Degrée Alcool", "Degré d'alcool", "Degre alcool", "Taux d'alcool"
        // also tolerate generic "Alcool"
        const l = label.toLowerCase();
        if (
          /degre|degre\s*d.?alcool|taux\s*d.?alcool|alcool/.test(l)
        ) {
          out.abvRaw = value;
        }

        // capture Marque → producer
        if (/marque/i.test(label)) {
          out.brandRaw = value;
        }
      }

      return out;
    })
    .catch(() => null);

  // --- ABV normalize ---
  if (data?.abvRaw && !product.abv) {
    let v = data.abvRaw.trim();

    // Common “Sans alcool” forms
    if (/sans\s*alcool/i.test(v)) {
      product.abv = "0%";
    } else {
      // Extract number + % (tolerate comma)
      // e.g., "0%", "0,5 %", "0.5% vol"
      const m = v.match(/(\d+(?:[.,]\d+)?)\s*%/);
      if (m && m[1]) {
        const num = m[1].replace(",", ".");
        // Keep one decimal at most (optional)
        const n = Number.parseFloat(num);
        if (Number.isFinite(n)) {
          product.abv = `${n % 1 === 0 ? n.toFixed(0) : n}%`;
        } else {
          product.abv = `${num}%`;
        }
      } else {
        // If value is literally "0" or "0,0" without a percent sign
        const n0 = v.match(/^\s*(0+(?:[.,]0+)?)\s*$/);
        if (n0) product.abv = "0%";
      }
    }
  }

  // --- Producer from "Marque" if present ---
  if (data?.brandRaw && !product.producer) {
    // Many Woo stores wrap it in <p> — keep text only
    product.producer = data.brandRaw.replace(/^\s*by\s+/i, "").trim();
  }

  return product;
}
