// services/refiners/sites/nakedlifespirits.com.au.js
export default async function refine(rootUrl, product, page) {
  const nutrition = await page.evaluate(() => {
    const out = { energyKcal100ml: null, sugars100ml: null };

    // helper cleaners/parsers
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const onlyLetters = (s) => norm(s).toLowerCase().replace(/[^a-z]/g, "");
    const parseNum = (s) => {
      if (!s) return null;
      const cleaned = s.replace(/&lt;|</g, "").toLowerCase(); // support "<0.1g"
      const m = cleaned.match(/(\d+(?:[.,]\d+)?)/);
      return m ? parseFloat(m[1].replace(",", ".")) : null;
    };

    const table = document.querySelector("table.table--nutritional");
    if (!table) return out;

    // find columns; prefer "Per 100ml", else fallback to "Per Serve"
    const ths = Array.from(table.querySelectorAll("thead th"));
    const per100Idx = ths.findIndex((th) =>
      (th.textContent || "").toLowerCase().includes("per 100")
    );
    const perServeIdx = ths.findIndex((th) =>
      (th.textContent || "").toLowerCase().includes("per serve")
    );
    const valueColIdx = per100Idx >= 0 ? per100Idx : (perServeIdx >= 0 ? perServeIdx : 1);

    const rows = Array.from(table.querySelectorAll("tbody tr"));
    let energyKj = null;
    let energyKcal = null;
    let sugarsG = null;

    for (const tr of rows) {
      const tds = Array.from(tr.querySelectorAll("td"));
      if (tds.length < valueColIdx + 1) continue;

      const labelRaw = norm(tds[0].textContent || "");
      const labelKey = onlyLetters(labelRaw); // e.g. "- Sugars" -> "sugars"
      const valRaw = norm(tds[valueColIdx].textContent || "");

      // ENERGY
      if (labelKey.includes("energy")) {
        // supports "12kj", "3 cal", "3 kcal"
        if (/kj\b/i.test(valRaw)) {
          const kj = parseNum(valRaw);
          if (kj != null) energyKj = kj;
        } else if (/\bkc?al\b/i.test(valRaw)) {
          const kcal = parseNum(valRaw);
          if (kcal != null) energyKcal = kcal;
        } else {
          // no unit shown; assume kcal if text says 'cal'
          if (/cal/i.test(valRaw)) {
            const kcal = parseNum(valRaw);
            if (kcal != null) energyKcal = kcal;
          } else {
            // last fallback: treat as kJ if ends with 'j' or looks like small number
            const n = parseNum(valRaw);
            if (n != null) energyKj = n;
          }
        }
        continue;
      }

      // SUGARS
      if (labelKey.includes("sugar")) {
        const g = parseNum(valRaw);
        if (g != null) sugarsG = g;
        continue;
      }
    }

    // prefer explicit kcal; else convert from kJ (kcal = kJ / 4.184)
    if (energyKcal != null) out.energyKcal100ml = `${energyKcal} kcal`;
    else if (energyKj != null) {
      const kcal = Math.round((energyKj / 4.184) * 10) / 10;
      out.energyKcal100ml = `${kcal} kcal`;
    }

    if (sugarsG != null) out.sugars100ml = `${sugarsG} g`;

    // Text fallback if table parsing failed
    if (!out.energyKcal100ml || !out.sugars100ml) {
      const body = (document.body.innerText || "").toLowerCase();
      if (!out.energyKcal100ml) {
        const mKj = body.match(/energy[^0-9]{0,15}([\d.,]+)\s*k?j/);
        const mKcal = body.match(/calories?[^0-9]{0,15}([\d.,]+)/);
        if (mKcal) out.energyKcal100ml = `${parseFloat(mKcal[1].replace(",", "."))} kcal`;
        else if (mKj) {
          const kj = parseFloat(mKj[1].replace(",", "."));
          const kcal = Math.round((kj / 4.184) * 10) / 10;
          out.energyKcal100ml = `${kcal} kcal`;
        }
      }
      if (!out.sugars100ml) {
        const mSug = body.match(/sugars?[^0-9<]{0,15}([<]?\s*[\d.,]+)\s*g/);
        if (mSug) out.sugars100ml = `${mSug[1].replace(/\s+/g, " ").replace(",", ".")} g`;
      }
    }

    return out;
  });

  if (nutrition?.energyKcal100ml) product.energy = nutrition.energyKcal100ml;
  if (nutrition?.sugars100ml) product.sugar = nutrition.sugars100ml;

  product.producer = product.producer || "Naked Life Spirits";
  product.currency = product.currency || "AUD";
  product.country = product.country || "AU";
  return product;
}
