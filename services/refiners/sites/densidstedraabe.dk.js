// services/refiners/sites/densidstedraabe.dk.js
export default async function refine(rootUrl, product, page) {
  // -----------------------------
  // 0) Producer from analytics script: "brand":"Den Sidste Dråbe"
  // -----------------------------
  const producer = await page
    .evaluate(() => {
      const s = document.querySelector("script.analytics")?.textContent || "";
      if (!s) return null;

      // Most common: "brand":"Den Sidste Dråbe"
      let m = s.match(/"brand"\s*:\s*"([^"]+)"/);
      if (m?.[1]) return m[1].trim();

      // Fallback: 'brand':'...'
      m = s.match(/['"]brand['"]\s*:\s*['"]([^'"]+)['"]/);
      if (m?.[1]) return m[1].trim();

      return null;
    })
    .catch(() => null);

  if (!product.producer && producer) product.producer = producer;

  // -----------------------------
  // 1) Extract description text
  // -----------------------------
  const txt = await page
    .evaluate(() => {
      const el = document.querySelector(".product-page--description .rte-content");
      return (el?.innerText || el?.textContent || "")
        .replace(/\u00a0|\u202f/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    })
    .catch(() => "");

  if (!txt) return product;

  const norm = txt.replace(/\u00a0|\u202f/g, " ").replace(/\s+/g, " ").trim();

  // -----------------------------
  // 2) ABV (0,0% alc. vol. / <0,5% alkohol / etc.)
  // -----------------------------
  if (!product.abv) {
    const m =
      norm.match(/([<>]?\s*\d+(?:[.,]\d+)?)\s*%\s*(?:alc\.?\s*vol\.?|alkohol|alcohol)/i) ||
      norm.match(/(?:alc\.?\s*vol\.?|alkohol|alcohol)\s*[:\-]?\s*([<>]?\s*\d+(?:[.,]\d+)?)\s*%/i) ||
      null;

    if (m?.[1]) product.abv = m[1].replace(/\s+/g, "").replace(",", ".") + "%";
  }

  // -----------------------------
  // 3) Energy (Energi 73 kj/17 kcal) OR (Brennwert 63 kJ / 15 kcal)
  // store as "73 kJ/17 kcal"
  // -----------------------------
  if (!product.energy) {
    const e =
      norm.match(/(?:energi|brennwert)\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*k?j\s*\/\s*([0-9]+(?:[.,][0-9]+)?)\s*kcal/i) ||
      norm.match(/(?:energi|brennwert)\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*k?j/i) ||
      norm.match(/(?:energi|brennwert)\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*kcal/i);

    if (e) {
      if (e[2]) {
        const kj = e[1].replace(",", ".");
        const kcal = e[2].replace(",", ".");
        product.energy = `${kj} kJ/${kcal} kcal`;
      } else {
        const val = e[1].replace(",", ".");
        const unit = /kcal/i.test(e[0]) ? "kcal" : "kJ";
        product.energy = `${val} ${unit}`;
      }
    }
  }

  // -----------------------------
  // 4) Sugar (heraf sukkerarter 3.1g / davon 2,4 g Zucker / sugars 0.1 g)
  // store as "3.1 g"
  // -----------------------------
  if (!product.sugar) {
    const s =
      norm.match(/(?:heraf\s*)?sukker(?:arter)?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*g/i) ||
      norm.match(/davon\s*([0-9]+(?:[.,][0-9]+)?)\s*g\s*zucker/i) ||
      norm.match(/\bsugars?\b.*?([0-9]+(?:[.,][0-9]+)?)\s*g/i);

    if (s?.[1]) product.sugar = `${s[1].replace(",", ".")} g`;
  }

  return product;
}
