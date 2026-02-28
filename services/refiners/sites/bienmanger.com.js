function clean(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePrice(raw) {
  const text = clean(raw);
  if (!text) return null;

  const matches = text.match(/(\d+[.,]\d{1,2}|\d+)/g);
  if (!matches || !matches.length) return null;

  const candidate = matches[matches.length - 1].replace(",", ".");
  const parsed = Number(candidate);
  if (Number.isNaN(parsed)) return null;

  return parsed.toFixed(2);
}

function normalizeAbv(raw, context = "") {
  const source = `${clean(raw)} ${clean(context)}`.toLowerCase();
  if (!source) return null;

  if (/sans\s*alcool|non[-\s]?alcoholic|0\s*%/.test(source)) {
    return "<0.5% ABV";
  }

  const match = source.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!match) return null;

  const value = Number(match[1].replace(",", "."));
  if (Number.isNaN(value)) return null;
  if (value <= 0.5) return "<0.5% ABV";

  const normalized = Number.isInteger(value) ? String(value) : String(value);
  return `${normalized}% ABV`;
}

function normalizeEnergy(raw) {
  const text = clean(raw);
  if (!text) return null;
  if (text.length > 55) return null;
  if (!/\d/.test(text)) return null;
  if (!/(kcal|kj|calorie)/i.test(text)) return null;

  return text
    .replace(/,/g, ".")
    .replace(/\bcalories?\b/gi, "kcal")
    .replace(/\bkj\b/gi, "kJ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSugar(raw) {
  const text = clean(raw);
  if (!text) return null;
  if (text.length > 45) return null;
  if (!/\d/.test(text)) return null;
  if (!/(?:^|[^a-z])(?:mg|g)(?:$|[^a-z])/i.test(text)) return null;

  return text.replace(/,/g, ".").replace(/\s+/g, " ").trim();
}

function normalizeGlutenFree(raw, context = "") {
  const source = `${clean(raw)} ${clean(context)}`.toLowerCase();
  if (!source) return null;

  if (/\b(contient|contains?|avec)\s+gluten\b/.test(source)) return null;
  if (/\b(sans\s+gluten|gluten[\s-]?free|without\s+gluten|free\s+from\s+gluten)\b/.test(source)) {
    return "Gluten Free";
  }

  return null;
}

function normalizeVegan(raw, context = "") {
  const source = `${clean(raw)} ${clean(context)}`.toLowerCase();
  if (!source) return null;

  if (/\b(non[\s-]?vegan|not\s+vegan|pas\s+vegan|pas\s+vegetalien)\b/.test(source)) return null;
  if (/\b(vegan|vegane|vegetalien|vegetalienne)\b/.test(source)) return "Vegan";

  return null;
}

export default async function refine(rootUrl, product, page) {
  const scraped = await page.evaluate(() => {
    const norm = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

    const decodeEntities = (value) => {
      if (!value) return "";
      const textarea = document.createElement("textarea");
      textarea.innerHTML = String(value);
      return textarea.value;
    };

    const isProductType = (typeValue) => {
      if (!typeValue) return false;
      if (Array.isArray(typeValue)) return typeValue.some((v) => String(v).toLowerCase() === "product");
      return String(typeValue).toLowerCase() === "product";
    };

    const flattenJsonLd = (node, bucket) => {
      if (!node) return;
      if (Array.isArray(node)) {
        for (const item of node) flattenJsonLd(item, bucket);
        return;
      }
      if (typeof node !== "object") return;
      bucket.push(node);
      if (node["@graph"]) flattenJsonLd(node["@graph"], bucket);
    };

    const parseJsonLdProduct = () => {
      const scripts = Array.from(document.querySelectorAll("script[type='application/ld+json']"));
      for (const script of scripts) {
        const raw = script.textContent || "";
        if (!raw.trim()) continue;
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          continue;
        }
        const nodes = [];
        flattenJsonLd(parsed, nodes);
        const found = nodes.find((node) => isProductType(node?.["@type"]));
        if (found) return found;
      }
      return null;
    };

    const productJson = parseJsonLdProduct();

    const toOffers = (offers) => {
      if (!offers) return [];
      if (Array.isArray(offers)) return offers;
      if (typeof offers === "object") return [offers];
      return [];
    };

    const offers = toOffers(productJson?.offers);
    const selectedOffer =
      offers.find((offer) => String(offer?.availability || "").toLowerCase().includes("instock")) ||
      offers.find((offer) => offer && offer.price != null) ||
      null;

    const jsonBrand = productJson?.brand;
    const producer =
      (jsonBrand && typeof jsonBrand === "object" ? jsonBrand.name : jsonBrand) ||
      document.querySelector("h2.subTitle a")?.textContent ||
      null;

    const descFromDom = document.querySelector("#desc")?.textContent || null;
    const description = productJson?.description || descFromDom;

    const imageRaw = productJson?.image;
    let image = null;
    if (typeof imageRaw === "string") {
      image = imageRaw;
    } else if (Array.isArray(imageRaw)) {
      for (const item of imageRaw) {
        if (typeof item === "string" && item.trim()) {
          image = item;
          break;
        }
        if (item && typeof item === "object") {
          const url = item.url || item["@id"];
          if (url) {
            image = url;
            break;
          }
        }
      }
    } else if (imageRaw && typeof imageRaw === "object") {
      image = imageRaw.url || imageRaw["@id"] || null;
    }

    if (!image) {
      image =
        document.querySelector("#imageProduct img[xoriginal]")?.getAttribute("xoriginal") ||
        document.querySelector("#imageProduct img[src^='http']")?.getAttribute("src") ||
        document.querySelector("meta[property='og:image']")?.content ||
        null;
    }

    const textForAbv = [
      productJson?.name,
      productJson?.description,
      descFromDom,
      document.querySelector("h1")?.textContent,
      document.body?.innerText,
    ]
      .filter(Boolean)
      .map(decodeEntities)
      .join(" ");

    return {
      price: selectedOffer?.price != null ? String(selectedOffer.price) : null,
      currency: selectedOffer?.priceCurrency || null,
      producer: producer ? norm(decodeEntities(producer)) : null,
      description: description ? norm(decodeEntities(description)) : null,
      images: image ? norm(image) : null,
      abvSource: textForAbv,
    };
  });

  const setIfPresent = (key, value) => {
    const normalized = clean(value);
    if (normalized) product[key] = normalized;
  };

  // Keep existing values if extraction fallback is empty.
  if (scraped?.price) {
    const normalized = normalizePrice(scraped.price);
    if (normalized) product.price = normalized;
  } else if (product.price) {
    const normalized = normalizePrice(product.price);
    if (normalized) product.price = normalized;
  }

  if (scraped?.currency) {
    setIfPresent("currency", scraped.currency.toUpperCase());
  } else if (!clean(product.currency)) {
    product.currency = "EUR";
  }

  setIfPresent("producer", scraped?.producer);
  setIfPresent("description", scraped?.description);
  setIfPresent("images", scraped?.images);

  const normalizedAbv = normalizeAbv(product.abv, scraped?.abvSource || "");
  if (normalizedAbv) product.abv = normalizedAbv;

  product.energy = normalizeEnergy(product.energy);
  product.sugar = normalizeSugar(product.sugar);
  product.gluten_free = normalizeGlutenFree(product.gluten_free, product.description || "");
  product.vegan = normalizeVegan(product.vegan, product.description || "");

  // Final whitespace cleanup for fields commonly polluted by HTML/text artifacts.
  ["name", "producer", "description", "country", "category", "images"].forEach((key) => {
    if (product[key] != null) {
      product[key] = clean(product[key]);
    }
  });

  return product;
}
