// services/refiners/sites/kolonnenull.com.js
export default async function refine(rootUrl, product, page) {
  // 1) Flags + nutrition from the page
  const out = await page
    .evaluate(() => {
      const norm = (s) =>
        String(s || "")
          .replace(/\u00a0|\u202f/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      // --- A) Vegan / Glutenfrei from the rich text area
      const rich =
        document.querySelector(".product-area__rich-text-block") ||
        document.querySelector(".product-area__rich-text-block .metafield-rich_text_field") ||
        document.querySelector(".product-detail__gap-sm.rte");

      const richText = norm(rich?.innerText || rich?.textContent || "").toLowerCase();

      const hasVegan = /\bvegan\b/.test(richText);
      const hasGlutenFree =
        /\bglutenfrei\b/.test(richText) ||
        /\bgluten\s*-\s*free\b/.test(richText) ||
        /\bgluten\s*free\b/.test(richText) ||
        /\bglutenfree\b/.test(richText);

      // --- B) Nutrition row (table): find "Nährwertangaben" -> parse its value cell
      let nutritionLine = "";

      const rows = Array.from(
        document.querySelectorAll(".product-detail-accordion table tr, table tr")
      );

      for (const row of rows) {
        const cells = row.querySelectorAll("td,th");
        if (cells.length < 2) continue;

        const label = norm(cells[0]?.innerText || cells[0]?.textContent || "").toLowerCase();
        if (label.includes("nährwertangaben") || label.includes("naehrwertangaben")) {
          nutritionLine = norm(cells[1]?.innerText || cells[1]?.textContent || "");
          break;
        }
      }

      // Fallback: if not found, scan accordion content for "Pro 100 ml:"
      if (!nutritionLine) {
        const acc = document.querySelector(".product-detail-accordion");
        const accText = norm(acc?.innerText || acc?.textContent || "");
        const m = accText.match(/Pro\s*100\s*ml\s*:\s*[^.]+/i);
        if (m) nutritionLine = norm(m[0]);
      }

      return { hasVegan, hasGlutenFree, nutritionLine };
    })
    .catch(() => ({ hasVegan: false, hasGlutenFree: false, nutritionLine: "" }));

  // 2) Apply vegan/gluten flags (only set if empty)
  if (!product.vegan && out.hasVegan) product.vegan = "vegan";
  if (!product.gluten_free && out.hasGlutenFree) product.gluten_free = "glutenfree";

  // 3) Parse nutrition line for energy + sugar
  // Example:
  // "Pro 100 ml: Brennwert 63 kJ / 15 kcal, Kohlenhydrate 2,5 g (davon 2,4 g Zucker)"
  const line = String(out.nutritionLine || "").replace(/\s+/g, " ").trim();
  if (line) {
    // Energy: capture kJ and kcal (either order)
    const kjKcal =
      line.match(/Brennwert\s*([0-9]+(?:[.,][0-9]+)?)\s*kJ\s*\/\s*([0-9]+(?:[.,][0-9]+)?)\s*kcal/i) ||
      line.match(/Brennwert\s*([0-9]+(?:[.,][0-9]+)?)\s*kcal\s*\/\s*([0-9]+(?:[.,][0-9]+)?)\s*kJ/i);

    if (!product.energy && kjKcal) {
      // Normalize decimals "," -> "."
      const a = kjKcal[1].replace(",", ".");
      const b = kjKcal[2].replace(",", ".");
      // If the match was kJ/kcal, store kcal/kJ (more common for you elsewhere)
      if (/kJ\s*\/\s*\d/i.test(kjKcal[0])) product.energy = `${b} kcal/${a} kJ`;
      else product.energy = `${a} kcal/${b} kJ`;
    }

    // Sugar: "(davon 2,4 g Zucker)" or "Zucker 2,4 g"
    const sugarMatch =
      line.match(/\(.*?davon\s*([0-9]+(?:[.,][0-9]+)?)\s*g\s*Zucker.*?\)/i) ||
      line.match(/\bZucker\s*([0-9]+(?:[.,][0-9]+)?)\s*g/i);

    if (!product.sugar && sugarMatch?.[1]) {
      product.sugar = `${sugarMatch[1].replace(",", ".")} g`;
    }
  }
  product.producer = "Kolonnenull";

  return product;
}
