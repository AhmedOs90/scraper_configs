export default async function refine(rootUrl, product, page) {
  const info = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll(".product__info-line"));

    const out = {
      abv: null,
      nutritionText: null
    };

    for (const row of rows) {
      const label = row.querySelector(".product__info-line_label")?.textContent?.trim()?.toLowerCase();
      const value = row.querySelector(".product__info-line_content")?.textContent?.trim() || null;

      if (!label || !value) continue;

      if (label === "abv") out.abv = value;

      // Nutrition line label
      if (label.includes("nutrition facts per 100 ml")) {
        out.nutritionText = value;
      }
    }

    return out;
  }).catch(() => ({ abv: null, nutritionText: null }));

  // ABV (e.g. "0.5% VOL.")
  if (info.abv) product.abv = info.abv;

  // Nutrition parsing (from something like:
  // "Energy 126 kJ/23 kcal | ... | Sugars 5.0 g | ..."
  if (info.nutritionText) {
    const txt = info.nutritionText.replace(/\s+/g, " ").trim();

    // Extract energy (prefer kcal if present)
    // Matches: "23 kcal" OR "126 kJ/23 kcal"
    const kcalMatch = txt.match(/(\d+(?:[.,]\d+)?)\s*kcal/i);
    const kjMatch = txt.match(/(\d+(?:[.,]\d+)?)\s*kJ/i);

    // Store as strings like your pipeline expects (refineData/defaultRefiner can normalize later)
    if (kcalMatch) product.energy = `${kcalMatch[1].replace(",", ".")} kcal`;
    else if (kjMatch) product.energy = `${kjMatch[1].replace(",", ".")} kJ`;

    // Extract sugars (matches "Sugars 5.0 g")
    const sugarMatch = txt.match(/sugars?\s*(?:[:])?\s*(<\s*)?(\d+(?:[.,]\d+)?)\s*g/i);
    if (sugarMatch) {
      const lessThan = Boolean(sugarMatch[1]);
      const val = sugarMatch[2].replace(",", ".");
      product.sugar = `${lessThan ? "<" : ""}${val} g`;
    }

    // Optional: keep the whole nutrition string (handy for debugging/QA)
    product.energy = txt;
  }

  return product;
}
