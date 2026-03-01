import { extractABVFromText } from "../refiners_helpers.js";

const NON_PRODUCT_RE =
  /\b(workshop|class|event|ticket|gift\s*card|service|private\s+cocktail|wine\s+workshop)\b/i;
const ALCOHOLIC_RE =
  /\b(vermouth|liqueur|amaro|aperitif|wine|winer(?:y|ies)?|winemaker|ros[eé]|cabernet|chardonnay|merlot|pinot|sauvignon|rum|vodka|tequila|whisky)\b/i;
const NON_ALC_MARKER_RE =
  /\b(non[-\s]*alcoholic|zero[-\s]*proof|alcohol[-\s]*free|0(?:[.,]0)?\s*%?\s*abv)\b/i;
const GENERIC_SITE_COPY_RE =
  /\b(from the beloved world of split tree|ottawa-based cocktail supply store|join expert-led cocktail and wine workshops)\b/i;

function clean(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toAbsoluteUrl(value, rootUrl) {
  const raw = clean(value);
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;

  // Shopify occasionally emits malformed og:image values like "https:files/..."
  const malformed = raw.match(/^https?:\s*(files|collections)\/(.+)$/i);
  if (malformed) {
    return `${rootUrl}/cdn/shop/${malformed[1].toLowerCase()}/${malformed[2]}`;
  }

  try {
    return new URL(raw, rootUrl).href;
  } catch {
    return raw;
  }
}

function parsePrice(raw) {
  const text = clean(raw);
  if (!text) return null;

  const decimalMatches = text.match(/(\d+[.,]\d{2})/g);
  if (decimalMatches?.length) {
    const val = Number(decimalMatches[decimalMatches.length - 1].replace(",", "."));
    if (!Number.isNaN(val)) return val.toFixed(2);
  }

  const split = text.match(/(\d+)\D+(\d{2})/);
  if (split) {
    const val = Number(`${split[1]}.${split[2]}`);
    if (!Number.isNaN(val)) return val.toFixed(2);
  }

  const intMatch = text.match(/\b(\d{1,6})\b/);
  if (intMatch?.[1]) {
    const intVal = Number(intMatch[1]);
    if (!Number.isNaN(intVal)) return intVal.toFixed(2);
  }

  return null;
}

function parseAbvNumeric(raw) {
  const text = clean(raw).replace(/,/g, ".").toLowerCase();
  if (!text) return null;

  const ltPct = text.match(/<\s*(\d+(?:\.\d+)?)\s*%/);
  if (ltPct?.[1]) {
    const num = Number(ltPct[1]);
    return Number.isNaN(num) ? null : num;
  }

  const pct = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct?.[1]) {
    const num = Number(pct[1]);
    return Number.isNaN(num) ? null : num;
  }

  const alc = text.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:abv|alc(?:ohol)?(?:\/vol|\.)?)(?:\b|$)/i);
  if (alc?.[1]) {
    const num = Number(alc[1]);
    return Number.isNaN(num) ? null : num;
  }

  return null;
}

function normalizeAbv(raw) {
  const text = clean(raw).replace(/,/g, ".");
  if (!text) return null;

  const lt = text.match(/<\s*(\d+(?:\.\d+)?)/);
  if (lt) return "<0.5% ABV";

  const num = parseAbvNumeric(text);
  if (num == null) return null;
  if (num <= 0.5) return "<0.5% ABV";
  return `${num}% ABV`;
}

function normalizeEnergy(raw, context = "") {
  const text = clean(`${raw || ""} ${context || ""}`).replace(/,/g, ".");
  if (!text) return null;

  const labeled =
    text.match(/(?:energy|calories?)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(kcal|kj|cal)?/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*(kcal|kj)\b/i);
  if (!labeled) return null;

  const value = Number(labeled[1]);
  if (Number.isNaN(value)) return null;

  let unit = (labeled[2] || "").toLowerCase();
  if (!unit) unit = /kj/i.test(labeled[0]) ? "kJ" : "kcal";
  else if (unit === "kj") unit = "kJ";
  else unit = "kcal";

  const num = Number.isInteger(value) ? String(value) : String(value);
  return `${num} ${unit}`;
}

function normalizeSugar(raw, context = "") {
  const text = clean(`${raw || ""} ${context || ""}`).replace(/,/g, ".");
  if (!text) return null;

  const labeled =
    text.match(/(?:of which )?sugars?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(g|mg)\b/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*(g|mg)\s*(?:sugars?)\b/i);
  if (!labeled) return null;

  const value = Number(labeled[1]);
  if (Number.isNaN(value)) return null;

  const unit = labeled[2].toLowerCase();
  const num = Number.isInteger(value) ? String(value) : String(value);
  return `${num} ${unit}`;
}

function normalizeGlutenFree(raw, context = "") {
  const source = clean(`${raw || ""} ${context || ""}`).toLowerCase();
  if (!source) return null;

  if (/\b(contains?|with)\s+gluten\b/.test(source)) return null;
  if (/\b(gluten[-\s]*free|sans\s+gluten|without\s+gluten|no\s+gluten)\b/.test(source)) {
    return "Gluten free";
  }

  return null;
}

function normalizeVegan(raw, context = "") {
  const source = clean(`${raw || ""} ${context || ""}`).toLowerCase();
  if (!source) return null;

  if (/\b(non[-\s]*vegan|not\s+vegan|contains?\s+animal)\b/.test(source)) return null;
  if (/\b(vegan|plant[-\s]*based|vegan[-\s]*friendly)\b/.test(source)) return "Vegan";

  return null;
}

export default async function refine(rootUrl, product, page) {
  const currentUrl = page.url();

  const scraped = await page.evaluate(() => {
    const norm = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

    const metaProduct = window.meta?.product || null;
    const currentVariantId = (() => {
      try {
        return String(new URL(window.location.href).searchParams.get("variant") || "");
      } catch {
        return "";
      }
    })();

    const pickVariant = (variants) => {
      if (!Array.isArray(variants) || variants.length === 0) return null;
      if (currentVariantId) {
        const byId = variants.find((v) => String(v?.id) === currentVariantId);
        if (byId) return byId;
      }
      const available = variants.find((v) => v?.available === true);
      if (available) return available;
      return variants[0] || null;
    };

    const selectedVariant = pickVariant(metaProduct?.variants);
    const scriptPriceCents =
      typeof selectedVariant?.price === "number"
        ? Math.round(selectedVariant.price)
        : null;

    const breadcrumb = Array.from(document.querySelectorAll(".breadcrumb a, nav.breadcrumb a"))
      .map((el) => norm(el.textContent))
      .filter(Boolean);

    let jsonLdBrand = null;
    let jsonLdImage = null;
    let jsonLdDescription = null;
    let jsonLdAbv = null;

    const scripts = Array.from(document.querySelectorAll("script[type='application/ld+json']"));
    for (const script of scripts) {
      try {
        const parsed = JSON.parse(script.textContent || "null");
        const nodes = Array.isArray(parsed) ? parsed : [parsed];
        for (const node of nodes) {
          if (!node) continue;
          const productNode = Array.isArray(node?.["@graph"])
            ? node["@graph"].find((x) => x?.["@type"] === "Product")
            : node?.["@type"] === "Product"
              ? node
              : null;
          if (!productNode) continue;

          const brand = productNode.brand;
          if (!jsonLdBrand) {
            if (typeof brand === "string") jsonLdBrand = norm(brand);
            else if (brand?.name) jsonLdBrand = norm(brand.name);
          }

          if (!jsonLdImage) {
            if (typeof productNode.image === "string") jsonLdImage = productNode.image;
            else if (Array.isArray(productNode.image) && productNode.image[0]) {
              jsonLdImage = String(productNode.image[0]);
            } else if (productNode.image?.url) {
              jsonLdImage = String(productNode.image.url);
            }
          }

          if (!jsonLdDescription && productNode.description) {
            jsonLdDescription = norm(productNode.description);
          }
        }
      } catch {
        // ignore malformed ld+json payloads
      }
    }

    const firstText = (selectors) => {
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (!el) continue;
        const val = norm(el.textContent);
        if (val) return val;
      }
      return null;
    };

    const firstContent = (selectors) => {
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (!el) continue;
        const val = norm(el.getAttribute("content") || "");
        if (val) return val;
      }
      return null;
    };

    const bodyText = norm(document.body?.innerText || "");
    const scriptVendor = norm(metaProduct?.vendor || "");
    const scriptImage = metaProduct?.featured_image || metaProduct?.images?.[0] || null;
    const scriptDescription = norm(metaProduct?.description || metaProduct?.content || "");
    const detailText =
      firstText(["[data-aid='product-description']", ".product__description", ".rte", "[itemprop='description']"]) ||
      scriptDescription ||
      jsonLdDescription ||
      "";

    const explicitAbv =
      detailText ||
      bodyText;
    const abvMatch = explicitAbv.match(/(?:^|\s)(<\s*)?(\d+(?:[.,]\d+)?)\s*%\s*(?:abv)?/i);
    if (abvMatch?.[2]) {
      jsonLdAbv = `${abvMatch[1] ? "<" : ""}${abvMatch[2]}%`;
    }

    return {
      breadcrumb,
      bodyText,
      scriptVendor,
      scriptPriceCents,
      scriptImage,
      scriptDescription,
      detailText,
      jsonLdBrand,
      jsonLdImage,
      jsonLdDescription,
      jsonLdAbv,
      ogImage: firstContent([
        "meta[property='og:image:secure_url']",
        "meta[property='og:image']",
        "meta[name='twitter:image']",
      ]),
      currency: firstContent([
        "meta[property='product:price:currency']",
        "meta[property='og:price:currency']",
        "meta[itemprop='priceCurrency']",
      ]),
      ogTitle: firstContent([
        "meta[property='og:title']",
        "meta[name='twitter:title']",
      ]),
      docTitle: norm(document.title || ""),
    };
  });

  const normalizeName = (value) =>
    clean(value).replace(/\s*[|–—-]\s*Split Tree Cocktail Co\.?$/i, "");

  if (product.name && clean(product.name).toLowerCase() !== "name not found") {
    product.name = normalizeName(product.name);
  } else {
    const fallbackName = clean(scraped.ogTitle) || normalizeName(scraped.docTitle);
    if (fallbackName) {
      product.name = normalizeName(fallbackName);
    }
  }

  if (product.description) {
    product.description = clean(product.description);
  } else if (scraped.jsonLdDescription) {
    product.description = clean(scraped.jsonLdDescription);
  } else if (scraped.scriptDescription) {
    product.description = clean(scraped.scriptDescription);
  }

  const priceFromText = parsePrice(product.price);
  const priceFromCents =
    typeof scraped.scriptPriceCents === "number"
      ? (scraped.scriptPriceCents / 100).toFixed(2)
      : null;
  product.price = priceFromText || priceFromCents || product.price;

  if (!product.currency) {
    product.currency = clean(scraped.currency) || "CAD";
  }

  const imageCandidate =
    product.images ||
    scraped.scriptImage ||
    scraped.jsonLdImage ||
    scraped.ogImage;
  const absImage = toAbsoluteUrl(imageCandidate, rootUrl);
  if (absImage) product.images = absImage;

  if (!product.producer) {
    product.producer = clean(scraped.jsonLdBrand || scraped.scriptVendor);
  }

  if (!product.product_category) {
    const crumbs = Array.isArray(scraped.breadcrumb) ? scraped.breadcrumb : [];
    const crumb = crumbs.length >= 2 ? crumbs[crumbs.length - 2] : crumbs[crumbs.length - 1];
    if (crumb) product.product_category = clean(crumb);
    else if (product.category) product.product_category = clean(product.category);
  }

  const extractedAbv = extractABVFromText(
    product.name || "",
    `${product.description || ""} ${scraped.bodyText || ""}`
  );
  const normalizedAbv =
    normalizeAbv(product.abv) ||
    normalizeAbv(scraped.jsonLdAbv) ||
    normalizeAbv(extractedAbv);
  if (normalizedAbv) product.abv = normalizedAbv;

  const nutritionContext = `${product.description || ""} ${scraped.detailText || ""}`;
  product.energy = normalizeEnergy(product.energy, nutritionContext);
  product.sugar = normalizeSugar(product.sugar, nutritionContext);
  product.gluten_free = normalizeGlutenFree(product.gluten_free, nutritionContext);
  product.vegan = normalizeVegan(product.vegan, nutritionContext);

  const descriptionForClassification =
    product.description && !GENERIC_SITE_COPY_RE.test(product.description)
      ? product.description
      : "";
  const classificationText = clean(`${product.name || ""} ${descriptionForClassification}`);
  const lowerText = classificationText.toLowerCase();
  const urlText = String(product.url || currentUrl || "").toLowerCase();

  if (/\/collections?\//i.test(urlText) && !/\/products\//i.test(urlText)) {
    product.name = "Name not found";
    return product;
  }

  const isNonProduct =
    NON_PRODUCT_RE.test(lowerText) ||
    NON_PRODUCT_RE.test(urlText);
  const hasNonAlcMarker = NON_ALC_MARKER_RE.test(lowerText);
  const looksAlcoholic = ALCOHOLIC_RE.test(lowerText);
  const abvNumeric = parseAbvNumeric(product.abv || scraped.jsonLdAbv || extractedAbv);

  if (
    isNonProduct ||
    (abvNumeric != null && abvNumeric > 0.5) ||
    (looksAlcoholic && !hasNonAlcMarker)
  ) {
    product.name = "Name not found";
  }

  return product;
}
