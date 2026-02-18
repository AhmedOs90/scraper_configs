// services/refiners/sites/alkoholfrishop.dk.js
export default async function refine(rootUrl, product, page) {
  const data = await page
    .evaluate(() => {
      const norm = (s) =>
        String(s || "")
          .replace(/\u00a0|\u202f/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      const lower = (s) => norm(s).toLowerCase();

      // -----------------------------
      // 1) From attributes TABLE
      // -----------------------------
      const out = {
        brand: null,
        calories100: null, // e.g. "17 kCal / 71 kJ"
        sugar100: null,    // e.g. "2.4 g"
        country: null,
        abv: null,
        vegan: null,       // true/false/null
        glutenFree: null,  // true/false/null
      };

      const table = document.querySelector(".product-attributes-table table");
      if (table) {
        const rows = Array.from(table.querySelectorAll("tr"));
        for (const tr of rows) {
          const tds = tr.querySelectorAll("td");
          if (tds.length < 2) continue;

          const label = lower(tds[0].innerText || tds[0].textContent);

          // Brand:
          if (label === "brand:" || label === "brand") {
            const a = tds[1].querySelector("a");
            const val = norm(a?.innerText || tds[1].innerText || tds[1].textContent);
            if (val) out.brand = val;
          }

          // Calories / 100ml:
          if (label.includes("calories") && label.includes("100ml")) {
            const val = norm(tds[1].innerText || tds[1].textContent);
            out.calories100 = val ? val.replace(/\bKj\b/g, "kJ") : null;
          }

          // Sugar / 100ml: (or Sugars / 100ml)
          if (!out.sugar100 && label.includes("sugar") && label.includes("100ml")) {
            const val = norm(tds[1].innerText || tds[1].textContent);
            // Try to normalize to "X g" (but keep fallback if pattern doesn't match)
            const m = val.match(/([0-9]+(?:[.,][0-9]+)?)\s*(mg|g)\b/i);
            out.sugar100 = m
              ? `${m[1].replace(",", ".")} ${m[2].toLowerCase()}`
              : (val || null);
          }
        }
      }

      // -----------------------------
      // 2) From attributes LIST (order-independent)
      // -----------------------------
      const list = document.querySelector(".product-attributes-list .list-att-product");
      if (list) {
        const lis = Array.from(list.querySelectorAll("li"));

        for (const li of lis) {
          const liText = lower(li.innerText || li.textContent);

          // Vegan / Gluten-free flags
          if (liText.includes("vegan")) out.vegan = true;
          if (liText.includes("gluten")) out.glutenFree = true;

          // Detect country + ABV from the LI that contains Alcohol Content
          if (liText.includes("alcohol content")) {
            // Country = the <p> line that has check icon and is not "Alcohol Content"/"Serving Temperature"
            const checkPs = Array.from(li.querySelectorAll("p")).filter((p) =>
              p.querySelector("i.fas.fa-check")
            );

            for (const p of checkPs) {
              const t = norm(p.innerText || p.textContent);
              const tl = t.toLowerCase();
              if (!t) continue;
              if (tl.includes("alcohol content")) continue;
              if (tl.includes("serving temperature")) continue;

              out.country = out.country || t.replace(/^✔\s*/g, "").trim();
              break;
            }

            // ABV = p.circle that looks like "0,5 %" or "0.0 %"
            const circles = Array.from(li.querySelectorAll("p.circle"));
            const abvNode = circles.find((p) => /%/.test(p.innerText || p.textContent));
            if (abvNode) {
              let abv = norm(abvNode.innerText || abvNode.textContent);
              abv = abv.replace(",", ".").replace(/\s+/g, "");
              out.abv = abv;
            }
          }
        }

        // If vegan/glutenFree not explicitly found, mark as false
        if (out.vegan === null) out.vegan = false;
        if (out.glutenFree === null) out.glutenFree = false;
      }

      // -----------------------------
      // 3) Fallback sugar from Nutrition tab panel (id has dots)
      // -----------------------------
      if (!out.sugar100) {
        const panel = document.getElementById("nutrition.facts.tab");
        const txt = norm(panel?.innerText || panel?.textContent || "");
        if (txt) {
          // Examples handled:
          // "of which sugars 2.4 g"
          // "Sugars: 3,1 g"
          // "Sugar 0.1g"
          const m =
            txt.match(/of\s*which\s*sugars?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(mg|g)\b/i) ||
            txt.match(/\bsugars?\b\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(mg|g)\b/i);

          if (m?.[1] && m?.[2]) {
            out.sugar100 = `${m[1].replace(",", ".")} ${m[2].toLowerCase()}`;
          }
        }
      }

      return out;
    })
    .catch(() => null);

  if (!data) return product;

  // 1) Producer
  if (data.brand) product.producer = product.producer || data.brand;

  // 2) Energy / calories per 100ml (store in product.energy like your pipeline)
  if (data.calories100) product.energy = product.energy || data.calories100;

  // ✅ 2.5) Sugar per 100ml
  if (data.sugar100) product.sugar = product.sugar || data.sugar100;

  // 3) Country + ABV
  if (data.country) product.country = product.country || data.country;
  if (data.abv) product.abv = product.abv || data.abv;

  // 4) Vegan / Gluten-free (store YES/NO)
  if (!product.vegan) product.vegan = data.vegan ? "YES" : "NO";
  if (!product.gluten_free) product.gluten_free = data.glutenFree ? "YES" : "NO";

  return product;
}
