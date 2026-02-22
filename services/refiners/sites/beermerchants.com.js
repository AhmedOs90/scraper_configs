// services/refiners/sites/beermerchants.com.js
// Refiner for beermerchants.com
// - Extracts key fields from Magento "additional-attributes" table (data-th labels).
// - Normalizes ABV, price, currency and description.
// - Keeps everything CSV-safe (single strings, no arrays).

function normText(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s.length ? s : null;
}

function stripHtml(v) {
  const s = normText(v);
  if (!s) return null;
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizePrice(raw) {
  const s0 = normText(raw);
  if (!s0) return null;

  // Remove currency symbols and non-numeric text.
  // Handles formats like: "£3.95", "3,95", "1.234,56"
  let s = s0
    .replace(/[£€$]/g, "")
    .replace(/\b[A-Z]{3}\b/gi, "")
    .replace(/[^\d.,\-]/g, "")
    .trim();

  // European thousands/decimal normalization
  if (/\d+\.\d{3}/.test(s) && s.includes(",")) {
    // e.g. "1.234,56" -> "1234.56"
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",") && !s.includes(".")) {
    // e.g. "3,95" -> "3.95"
    s = s.replace(",", ".");
  } else if (s.includes(",") && s.includes(".")) {
    // if both exist, assume comma is thousands separator
    s = s.replace(/,/g, "");
  }

  const num = parseFloat(s);
  return Number.isFinite(num) ? String(num) : null;
}

function inferCurrencyFromText(text) {
  const s = String(text || "");
  if (s.includes("£")) return "GBP";
  if (s.includes("€")) return "EUR";
  if (s.includes("$")) return "USD";
  return null;
}

function normalizeAbv(raw) {
  const s0 = normText(raw);
  if (!s0) return null;

  // Supports: "0.5", "0.5%", "<0.5", "<0.5% ABV", etc.
  const s = s0.replace(",", ".").toLowerCase();

  // "<0.5"
  const mLt = s.match(/<\s*(\d+(?:\.\d+)?)/);
  if (mLt) return `<${mLt[1]}% ABV`;

  // "0.5" or "0.5%"
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  return `${m[1]}% ABV`;
}

async function readAdditionalAttributes(page) {
  // Pull values by data-th so it's resilient to row order.
  return page.evaluate(() => {
    const pick = (labelContains) => {
      const tds = Array.from(
        document.querySelectorAll("table.additional-attributes td[data-th], table.data.table.additional-attributes td[data-th]")
      );

      const hit = tds.find((td) => {
        const key = (td.getAttribute("data-th") || "").toLowerCase();
        return key.includes(labelContains.toLowerCase());
      });

      return hit ? (hit.textContent || "").trim() : null;
    };

    return {
      name: pick("product name") || pick("name"),
      abv: pick("abv"),
      brewery: pick("brewery") || pick("producer") || pick("brand"),
      style: pick("style") || pick("category"),
      country: pick("country"),
      size: pick("size")
    };
  }).catch(() => ({
    name: null, abv: null, brewery: null, style: null, country: null, size: null
  }));
}

export default async function refine(rootUrl, product, page) {
  // 1) Table-based extraction (strong signal on this site)
  const attrs = await readAdditionalAttributes(page);

  // Prefer table "Product Name" if available (it is usually the cleanest)
  product.name = normText(product.name) || normText(attrs.name) || product.name;

  // Producer = Brewery field (table)
  product.producer = normText(product.producer) || normText(attrs.brewery) || product.producer;

  // Category = Style field (table)
  product.category = normText(product.category) || normText(attrs.style) || product.category;

  // Country (table)
  product.country = normText(product.country) || normText(attrs.country) || product.country;

  // 2) Normalize ABV to a consistent format
  product.abv = normalizeAbv(product.abv) || normalizeAbv(attrs.abv) || product.abv;

  // 3) Normalize price & currency (dynamic)
  const rawPrice = product.price;
  const inferredCurrency = inferCurrencyFromText(rawPrice) || inferCurrencyFromText(product.currency);

  product.price = normalizePrice(product.price) || product.price;
  product.currency = normText(product.currency) || inferredCurrency || product.currency;

  // 4) Clean description (HTML -> text)
  if (product.description) {
    product.description = stripHtml(product.description);
  }

  // 5) Ensure images is always a single string (CSV-safe)
  if (Array.isArray(product.images)) {
    product.images = product.images.filter(Boolean).join("|");
  } else if (product.images) {
    product.images = String(product.images).trim();
  }

  return product;
}
