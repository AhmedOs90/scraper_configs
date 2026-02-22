export default async function refine(rootUrl, product, page) {
  // 1) Producer from analytics script (brand)
  const brand = await page.evaluate(() => {
    const s = document.querySelector("script.analytics")?.textContent || "";
    if (!s) return null;

    let m = s.match(/"brand"\s*:\s*"([^"]+)"/);
    if (m?.[1]) return m[1].trim();

    m = s.match(/['"]brand['"]\s*:\s*['"]([^'"]+)['"]/);
    if (m?.[1]) return m[1].trim();

    return null;
  }).catch(() => null);

  product.producer = product.producer || brand;

  // 2) Try to open the "Nutrition Breakdown" collapsible (if closed)
  try {
    const toggleHandle = await page.$$eval("[role='button'][aria-controls]", (btns) => {
      const norm = (s) =>
        String(s || "")
          .replace(/\u00a0|\u202f/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();

      for (const btn of btns) {
        const text = norm(btn.innerText || btn.textContent);
        if (text.includes("nutrition breakdown")) {
          return {
            ariaExpanded: btn.getAttribute("aria-expanded"),
            controls: btn.getAttribute("aria-controls"),
          };
        }
      }
      return null;
    });

    if (toggleHandle?.controls && toggleHandle.ariaExpanded === "false") {
      await page.evaluate((controlsId) => {
        const btn = document.querySelector(`[role="button"][aria-controls="${controlsId}"]`);
        if (btn) btn.click();
      }, toggleHandle.controls);

      await page.waitForTimeout(250);
    }
  } catch (_) {}

  // 3) Extract nutrition text (prefer opened content)
  const nutritionText = await page.evaluate(() => {
    const norm = (s) =>
      String(s || "")
        .replace(/\u00a0|\u202f/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const btns = Array.from(document.querySelectorAll('[role="button"][aria-controls]'));
    let controlsId = null;

    for (const btn of btns) {
      const t = norm(btn.innerText || btn.textContent).toLowerCase();
      if (t.includes("nutrition breakdown")) {
        controlsId = btn.getAttribute("aria-controls");
        break;
      }
    }

    if (controlsId) {
      const panel = document.getElementById(controlsId);
      const panelText = norm(panel?.innerText || panel?.textContent || "");
      if (panelText) return panelText;
    }

    const blocks = Array.from(document.querySelectorAll(".alchemy-rte"));
    for (const el of blocks) {
      const t = norm(el.innerText || el.textContent);
      if (/Per\s*100\s*ml\s*:/i.test(t)) return t;
    }

    return norm(document.body?.innerText || "");
  }).catch(() => null);

  if (nutritionText) {
    const text = nutritionText
      .replace(/\u00a0|\u202f/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const per100Match = text.match(/Per\s*100\s*ml\s*:\s*(.*?)(?=Per\s*\d+\s*ml|$)/i);
    const per100 = (per100Match?.[1] || "").trim();

    if (per100) {
      const energyFull =
        per100.match(/Energy\s*([0-9]+(?:[.,][0-9]+)?)\s*kcal\s*\/\s*([0-9]+(?:[.,][0-9]+)?)\s*kJ/i) ||
        per100.match(/Energy\s*([0-9]+(?:[.,][0-9]+)?)\s*kJ\s*\/\s*([0-9]+(?:[.,][0-9]+)?)\s*kcal/i);

      if (energyFull && !product.energy) {
        const a = energyFull[1].replace(",", ".");
        const b = energyFull[2].replace(",", ".");
        if (/kcal\s*\/\s*\d/i.test(energyFull[0])) product.energy = `${a} kcal/${b} kJ`;
        else product.energy = `${a} kJ/${b} kcal`;
      } else if (!product.energy) {
        const kcalOnly = per100.match(/Energy\s*([0-9]+(?:[.,][0-9]+)?)\s*kcal/i);
        const kjOnly = per100.match(/Energy\s*([0-9]+(?:[.,][0-9]+)?)\s*kJ/i);
        if (kcalOnly?.[1]) product.energy = `${kcalOnly[1].replace(",", ".")} kcal`;
        else if (kjOnly?.[1]) product.energy = `${kjOnly[1].replace(",", ".")} kJ`;
      }

      const sugarMatch =
        per100.match(/of\s*which\s*sugars\s*([0-9]+(?:[.,][0-9]+)?)\s*g/i) ||
        per100.match(/\bsugars\s*([0-9]+(?:[.,][0-9]+)?)\s*g/i);

      if (sugarMatch?.[1] && !product.sugar) {
        product.sugar = `${sugarMatch[1].replace(",", ".")} g`;
      }
    }
  }

  // ✅ 4) Vegan + Gluten-free from description block
  const flags = await page.evaluate(() => {
    const el =
      document.querySelector(".product__description.rte") ||
      document.querySelector(".product__description") ||
      document.querySelector(".rte");

    const txt = (el?.innerText || el?.textContent || "")
      .replace(/\u00a0|\u202f/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    return {
      hasVegan: /\bvegan\b/.test(txt),
      hasGlutenFree: /\bgluten\s*-\s*free\b/.test(txt) || /\bgluten\s*free\b/.test(txt) || /\bglutenfree\b/.test(txt),
    };
  }).catch(() => ({ hasVegan: false, hasGlutenFree: false }));

  if (!product.vegan && flags.hasVegan) product.vegan = "vegan";
  if (!product.gluten_free && flags.hasGlutenFree) product.gluten_free = "glutenfree";

  return product;
}