// services/refiners/sites/kolonnenull.com.js
export default async function refine(rootUrl, product, page) {
  // 1) Try to read the nutrition row directly from the table (most reliable)
  let nutritionRowText = "";

  try {
    nutritionRowText = await page.$$eval("figure.table table tr", (rows) => {
      const getText = (el) => (el ? (el.innerText || el.textContent || "") : "");

      for (const tr of rows) {
        const tds = tr.querySelectorAll("td");
        if (tds.length < 2) continue;

        const left = getText(tds[0]);
        if (left && left.toLowerCase().includes("nährwertangaben")) {
          return getText(tds[1]);
        }
      }
      return "";
    });
  } catch (_) {
    // ignore, we'll fallback
  }

  // 2) Fallback to whatever you already stored in product.description
  const text = nutritionRowText || product.description || "";

  // ---- ENERGY (raw) ----
  // Example: "Pro 100 ml: Brennwert 250 kJ / 60 kcal, ..."
  if (!product.energy && text) {
    const m1 = text.match(/Brennwert[^,]*/i); // raw chunk up to the first comma
    const m2 = text.match(/Energy[^,]*/i);    // fallback if EN appears
    if (m1) product.energy = m1[0];
    else if (m2) product.energy = m2[0];
  }

  // ---- SUGAR (raw) ----
  // Example: "... (davon 9,3 g Zucker)"
  if (!product.sugar && text) {
    const m1 = text.match(/\(davon[^)]*Zucker[^)]*\)/i);         // keep parentheses if present
    const m2 = text.match(/davon[^,]*Zucker/i);                  // fallback
    const m3 = text.match(/[\d.,]+\s*g\s*Zucker/i);              // fallback
    const m4 = text.match(/Zucker[^,)]*/i);                      // last resort

    if (m1) product.sugar = m1[0];
    else if (m2) product.sugar = m2[0];
    else if (m3) product.sugar = m3[0];
    else if (m4) product.sugar = m4[0];
  }

  return product;
}
