export default async function refine(rootUrl, product, page) {
  const text = await page.$eval('.product-description.rte', el => el.innerText).catch(() => '');
const t = text.toLowerCase();

// Simple country dictionary (add more as you discover)
const COUNTRY_MAP = [
  { key: 'denmark', val: 'Denmark' },
  { key: 'france', val: 'France' },
  { key: 'italy', val: 'Italy' },
  { key: 'spain', val: 'Spain' },
  { key: 'germany', val: 'Germany' },
  { key: 'austria', val: 'Austria' },
  { key: 'portugal', val: 'Portugal' },
  { key: 'belgium', val: 'Belgium' },
  { key: 'netherlands', val: 'Netherlands' },
  { key: 'sweden', val: 'Sweden' },
  { key: 'norway', val: 'Norway' }
];

if (!product.country) {
  const hit = COUNTRY_MAP.find(c => t.includes(` in ${c.key}`) || t.includes(` from ${c.key}`) || t.includes(c.key));
  if (hit) product.country = hit.val;
}

  // const norm = (s) =>
  //   String(s || "")
  //     .replace(/\u00a0|\u202f/g, " ")
  //     .replace(/\s+/g, " ")
  //     .trim();

  // const lower = (s) => norm(s).toLowerCase();

  // const isBadProducer = (p) => {
  //   const t = lower(p);
  //   return !t || t === "my store" || t === "refine moments" || t.includes("my store");
  // };

  // // Stable site facts
  // product.currency = "DKK";
  // product.country = "Denmark";

  // // Normalize price "299,00 kr" -> "299.00"
  // if (product.price) {
  //   product.price = norm(product.price)
  //     .replace(/\s*kr\.?\s*/gi, "")
  //     .replace(",", ".")
  //     .replace(/[^0-9.]/g, "")
  //     .trim();
  // }

  // // ---------- Producer fix (JSON-LD Product.brand/vendor) ----------
  // const producerFromLd = await page.evaluate(() => {
  //   const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  //   const blobs = scripts.map(s => (s.textContent || "").trim()).filter(Boolean);

  //   const nodes = [];
  //   for (const raw of blobs) {
  //     try {
  //       const j = JSON.parse(raw);
  //       if (Array.isArray(j)) nodes.push(...j);
  //       else nodes.push(j);
  //     } catch {}
  //   }

  //   // handle @graph too
  //   const expanded = [];
  //   for (const n of nodes) {
  //     if (n && Array.isArray(n["@graph"])) expanded.push(...n["@graph"]);
  //     expanded.push(n);
  //   }

  //   const isProduct = (n) => {
  //     const t = n?.["@type"];
  //     return t === "Product" || (Array.isArray(t) && t.includes("Product"));
  //   };

  //   const p = expanded.find(isProduct);
  //   if (!p) return null;

  //   const brand =
  //     (typeof p.brand === "string" ? p.brand : p.brand?.name) || null;

  //   const manufacturer =
  //     (typeof p.manufacturer === "string"
  //       ? p.manufacturer
  //       : p.manufacturer?.name) || null;

  //   // some JSON-LD uses "vendor" or "seller"
  //   const seller =
  //     (typeof p.seller === "string" ? p.seller : p.seller?.name) || null;

  //   return brand || manufacturer || seller || null;
  // }).catch(() => null);

  // // DOM fallback (theme-dependent)
  // const producerFromDom = await page.evaluate(() => {
  //   const el =
  //     document.querySelector(".product__vendor") ||
  //     document.querySelector("[data-product-vendor]") ||
  //     document.querySelector(".product-meta__vendor") ||
  //     document.querySelector(".product-vendor");
  //   return el ? (el.textContent || "").trim() : null;
  // }).catch(() => null);

  // const chosenProducer = norm(producerFromLd || producerFromDom || "");

  // // IMPORTANT: override if current is bad OR missing
  // if (!product.producer || isBadProducer(product.producer)) {
  //   product.producer = chosenProducer || null;
  // }

  // if (product.producer && isBadProducer(product.producer)) product.producer = null;

  // // ---------- Fill ABV / energy / sugar from page text ----------
  // const textBlob = await page.evaluate(() => {
  //   const pick = (...sels) => sels.map(s => document.querySelector(s)).find(Boolean);

  //   const blocks = [];
  //   const desc =
  //     pick(".product__description", ".product-single__description", ".product-description", ".rte", "[data-product-description]") ||
  //     document.body;

  //   blocks.push(desc?.innerText || desc?.textContent || "");

  //   // include tables/accordions if present
  //   document.querySelectorAll("table, .accordion, .collapsible-content, .tabs").forEach(el => {
  //     const t = el.innerText || el.textContent || "";
  //     if (t && t.length < 20000) blocks.push(t);
  //   });

  //   return blocks.join("\n");
  // }).catch(() => "");

  // const combined = `${product.name || ""}\n${product.description || ""}\n${textBlob || ""}`;
  // const t = norm(combined);

  // const parseAbv = (s) => {
  //   const x = norm(s);
  //   if (!x) return null;

  //   const mLt = x.match(/<\s*(\d+(?:[.,]\d+)?)\s*%/);
  //   if (mLt) return `<${mLt[1].replace(",", ".")}%`;

  //   const m = x.match(/(\d+(?:[.,]\d+)?)\s*%/);
  //   if (m) return `${m[1].replace(",", ".")}%`;

  //   // keyword fallback
  //   const lx = lower(x);
  //   if (lx.includes("alkoholfri") || lx.includes("alcohol free") || lx.includes("non-alcoholic") || lx.includes("non alcoholic")) {
  //     return "<0.5%";
  //   }
  //   return null;
  // };

  // const parseEnergy = (s) => {
  //   const x = norm(s);
  //   const m = x.match(/(energy|energi|calories|kalorier)[^0-9]*([\d]+(?:[.,]\d+)?)\s*(kcal|kj)/i);
  //   if (!m) return null;
  //   return `${m[2].replace(",", ".")} ${m[3].toLowerCase() === "kj" ? "kJ" : "kcal"}`;
  // };

  // const parseSugar = (s) => {
  //   const x = norm(s);
  //   const m = x.match(/(sugar|sugars|sukker)[^0-9]*([\d]+(?:[.,]\d+)?)\s*g/i);
  //   if (!m) return null;
  //   return `${m[2].replace(",", ".")} g`;
  // };

  // if (!product.abv) product.abv = parseAbv(t);
  // if (!product.energy) product.energy = parseEnergy(t);
  // if (!product.sugar) product.sugar = parseSugar(t);

  // // vegan/gluten hints
  // const lt = lower(t);
  // if (!product.vegan && lt.includes("vegan")) product.vegan = "Vegan";
  // if (!product.gluten_free && lt.includes("gluten")) product.gluten_free = "Gluten free";

  return product;
}
