// services/refiners/sites/bondston.com.js
// Dynamic refiner for bondston.com
// - Fills missing fields from label/value tables and common product blocks
// - Normalizes ABV, currency, image URL
// - Avoids logo/svg as product image
// Comments in English as requested.

export default async function refiner(rootUrl, Prod, page, config) {
  const normalize = (s) =>
    String(s ?? "")
      .replace(/\s+/g, " ")
      .trim();

  const toAbsUrl = (u) => {
    const url = normalize(u);
    if (!url) return null;
    try {
      return url.startsWith("http") ? url : new URL(url, rootUrl).href;
    } catch {
      return url;
    }
  };

  const pickCurrency = (priceStr) => {
    const s = normalize(priceStr);
    if (!s) return null;
    if (s.includes("€")) return "EUR";
    if (s.includes("£")) return "GBP";
    if (s.includes("Kč") || s.toLowerCase().includes("czk")) return "CZK";
    if (s.toLowerCase().includes("eur")) return "EUR";
    if (s.toLowerCase().includes("gbp")) return "GBP";
    return null;
  };

  const parseAbvToStandard = (raw) => {
    const s = normalize(raw).replace(",", ".");
    if (!s) return null;

    // Accept patterns like: "<0.5", "0.5", "0.0 %", "ABV 0.5", etc.
    const lt = s.match(/<\s*(\d+(\.\d+)?)/);
    if (lt) {
      const v = Number(lt[1]);
      if (!Number.isNaN(v)) return "<0.5% ABV"; // your system standard for non-alcoholic
    }

    const m = s.match(/(\d+(\.\d+)?)/);
    if (!m) return null;

    const v = Number(m[1]);
    if (Number.isNaN(v)) return null;

    // Your business rule: alcohol-free is < 0.5% ABV
    if (v <= 0.5) return "<0.5% ABV";
    return `${v}% ABV`;
  };

  // Extract DOM-based values (labels / tables / common blocks)
  const dom = await page.evaluate(() => {
    const norm = (x) => String(x ?? "").replace(/\s+/g, " ").trim();

    // 1) Collect key/value pairs from tables like:
    // <tr><th>ABV %</th><td>0.5</td></tr>
    const kv = {};
    const rows = Array.from(document.querySelectorAll("tr"));
    for (const tr of rows) {
      const th = tr.querySelector("th");
      const td = tr.querySelector("td");
      if (!th || !td) continue;
      const k = norm(th.textContent).toLowerCase().replace(/:$/, "");
      const v = norm(td.textContent);
      if (k && v) kv[k] = v;
    }

    // 2) Also read definition lists if present: <dt>Label</dt><dd>Value</dd>
    const dts = Array.from(document.querySelectorAll("dt"));
    for (const dt of dts) {
      const dd = dt.nextElementSibling;
      if (!dd || dd.tagName?.toLowerCase() !== "dd") continue;
      const k = norm(dt.textContent).toLowerCase().replace(/:$/, "");
      const v = norm(dd.textContent);
      if (k && v && !kv[k]) kv[k] = v;
    }

    // 3) Price (fallback)
    const priceEl =
      document.querySelector(".product-info-price .price") ||
      document.querySelector(".price-wrapper .price") ||
      document.querySelector("span.price") ||
      document.querySelector("[itemprop='price']");

    const priceText = priceEl ? norm(priceEl.textContent) : null;

    // 4) Name (fallback)
    const h1 = document.querySelector("h1");
    const nameText = h1 ? norm(h1.textContent) : null;

    // 5) Best image (avoid logos / svg)
    const imgs = Array.from(document.querySelectorAll("img"))
      .map((img) => img.getAttribute("src") || img.getAttribute("data-src") || "")
      .filter(Boolean);

    const bestImg =
      imgs.find((u) => !u.includes("/logos/") && !u.endsWith(".svg") && !u.includes("rshop.svg")) ||
      imgs.find((u) => !u.endsWith(".svg")) ||
      null;

    // Breadcrumbs for category (optional)
    const crumbs = Array.from(document.querySelectorAll(".breadcrumbs a"))
      .map((a) => norm(a.textContent))
      .filter(Boolean);

    return { kv, priceText, nameText, bestImg, crumbs };
  });

  // Map possible label variants to our fields
  const kv = dom?.kv || {};
  const getKV = (...keys) => {
    for (const k of keys) {
      const v = kv[String(k).toLowerCase()];
      if (v) return v;
    }
    return null;
  };

  // Fill missing name
  if (!Prod.name || Prod.name === "Name not found") {
    if (dom?.nameText) Prod.name = dom.nameText;
  }

  // Clean suffix like " | Bondston"
  if (Prod.name) {
    Prod.name = normalize(Prod.name).replace(/\s*\|\s*bondston\s*$/i, "");
  }

  // Fill missing price
  if (!Prod.price) {
    const p = normalize(dom?.priceText);
    if (p) Prod.price = p;
  }

  // Currency
  if (!Prod.currency) {
    const cur = pickCurrency(Prod.price);
    if (cur) Prod.currency = cur;
  }

  // Producer (Brewery/Brand/Producer)
  if (!Prod.producer) {
    const producer =
      getKV("brewery", "brand", "producer", "výrobca", "znacka", "značka") ||
      null;
    if (producer) Prod.producer = normalize(producer);
  }

  // Country
  if (!Prod.country) {
    const country =
      getKV("country", "krajina", "krajina pôvodu", "country of origin", "origin") ||
      null;
    if (country) Prod.country = normalize(country);
  }

  // ABV
  if (!Prod.abv) {
    const abvRaw = getKV("abv", "abv %", "alcohol", "alkohol") || null;
    const abv = parseAbvToStandard(abvRaw);
    if (abv) Prod.abv = abv;
  } else {
    // Normalize whatever we already have
    const abv = parseAbvToStandard(Prod.abv);
    if (abv) Prod.abv = abv;
  }

  // Images
  if (!Prod.images || String(Prod.images).includes("/logos/") || String(Prod.images).endsWith(".svg")) {
    const img = toAbsUrl(dom?.bestImg);
    if (img) Prod.images = img;
  } else {
    // Ensure absolute
    Prod.images = toAbsUrl(Prod.images) || Prod.images;
  }

  // Category (optional improvement from breadcrumbs)
  if (!Prod.category) {
    const crumbs = Array.isArray(dom?.crumbs) ? dom.crumbs : [];
    // pick the last meaningful crumb before the product name if available
    if (crumbs.length >= 2) {
      // Usually: Home > Drinks/Wine/... > Product
      Prod.category = normalize(crumbs[crumbs.length - 2]) || null;
    }
  }

  return Prod;
}
