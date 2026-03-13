// services/refiners/sites/sprit-co.dk.js
export default async function refine(rootUrl, product, page) {
  const clean = (v) => String(v ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const normalizeCountry = (raw) => {
    const text = clean(raw)
      .replace(/^(country(?:\s+of\s+origin)?|origin|made\s+in|land)\s*[:-]?\s*/i, "")
      .trim();
    return text || null;
  };

  // Keep ABV exactly as listed on product pages (no normalization to ABV labels).
  const extractAbvAsIs = (raw) => {
    const text = clean(raw);
    if (!text) return null;
    if (/^\d+(?:[.,]\d+)?$/.test(text)) return text;

    const explicit = text.match(/<\s*\d+(?:[.,]\d+)?\s*%?|\d+(?:[.,]\d+)?\s*%|\d+(?:[.,]\d+)?\s*(?:abv|vol\.?)/i);
    if (explicit) return explicit[0].replace(/\s+/g, " ").trim();

    const inlineLabel = text.match(/(?:alkohol\s*%?|alkoholprocent|abv)\s*[|:]\s*([<]?\s*\d+(?:[.,]\d+)?\s*%?)/i);
    if (inlineLabel?.[1]) return inlineLabel[1].replace(/\s+/g, " ").trim();

    return null;
  };

  const toAbsolute = (urlMaybe) => {
    const value = clean(urlMaybe);
    if (!value) return null;
    try {
      return value.startsWith("http") ? value : new URL(value, rootUrl).href;
    } catch {
      return value;
    }
  };

  const scraped = await page.evaluate(() => {
    const norm = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
    const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

    const jsonLd = (() => {
      const scripts = Array.from(document.querySelectorAll("script[type='application/ld+json']"));
      for (const script of scripts) {
        try {
          const parsed = JSON.parse(script.textContent || "null");
          const queue = asArray(parsed);
          while (queue.length) {
            const node = queue.shift();
            if (!node) continue;
            if (Array.isArray(node)) {
              queue.push(...node);
              continue;
            }
            if (typeof node !== "object") continue;
            if (Array.isArray(node["@graph"])) queue.push(...node["@graph"]);

            const types = asArray(node["@type"]).map((t) => String(t || "").toLowerCase());
            if (!types.includes("product")) continue;

            const brand =
              typeof node.brand === "string"
                ? node.brand
                : (typeof node.brand?.name === "string" ? node.brand.name : null);

            const country =
              node.countryOfOrigin ||
              node.country ||
              node?.manufacturer?.address?.addressCountry ||
              node?.brand?.address?.addressCountry ||
              null;

            const offers = asArray(node.offers);
            let price = null;
            let currency = null;
            for (const offer of offers) {
              if (!offer || typeof offer !== "object") continue;
              if (offer.price != null && price == null) price = String(offer.price);
              if (offer.priceCurrency && !currency) currency = String(offer.priceCurrency);
            }

            return {
              brand: brand ? norm(brand) : null,
              country: country ? norm(country) : null,
              price: price ? norm(price) : null,
              currency: currency ? norm(currency) : null,
            };
          }
        } catch {
          // ignore invalid json-ld
        }
      }
      return { brand: null, country: null, price: null, currency: null };
    })();

    const specs = {};
    for (const row of Array.from(document.querySelectorAll("table.product-specifications tr"))) {
      const cells = Array.from(row.querySelectorAll("td")).map((td) => norm(td.textContent));
      if (cells.length < 2) continue;
      const key = cells[0]?.toLowerCase();
      const value = cells[1];
      if (!key || !value || specs[key]) continue;
      specs[key] = value;
    }

    const kv = {};
    const nodes = Array.from(
      document.querySelectorAll(
        "tr, li, .product__meta-item, .product-single__meta li, .accordion__content li, [class*='spec'] li, [class*='attribute']"
      )
    );
    for (const node of nodes) {
      const text = norm(node.textContent);
      if (!text) continue;
      const match = text.match(/^([^:|]{2,60})\s*[:|]\s*(.+)$/);
      if (!match) continue;
      const key = norm(match[1]).toLowerCase();
      const value = norm(match[2]);
      if (!key || !value || kv[key]) continue;
      kv[key] = value;
    }

    const getByLabel = (...labels) => {
      for (const label of labels) {
        const exact = kv[label.toLowerCase()];
        if (exact) return exact;
      }
      return null;
    };

    const bodyText = norm(document.body.innerText || "");

    const labeledAbv =
      specs["alkohol %"] ||
      specs["alkoholprocent"] ||
      specs["alkohol"] ||
      specs["abv"] ||
      getByLabel("alkohol %", "alkoholprocent", "alkohol", "abv", "alcohol", "alcohol %") ||
      (bodyText.match(/(?:alkohol\s*%?|alkoholprocent|abv)\s*[|:]\s*([<]?\s*\d+(?:[.,]\d+)?\s*%?)/i)?.[1] || null);

    const breadcrumb = Array.from(document.querySelectorAll(".breadcrumb a, nav.breadcrumb a"))
      .map((el) => norm(el.textContent))
      .filter(Boolean);

    return {
      abv: labeledAbv ? norm(labeledAbv) : null,
      producer: specs["mærke"] || specs["producent"] || getByLabel("brand", "mærke", "producent", "producer") || jsonLd.brand,
      country: specs["oprindelsesland"] || specs["land"] || getByLabel("land", "country", "origin", "country of origin") || jsonLd.country,
      category: breadcrumb.length >= 2 ? breadcrumb[breadcrumb.length - 2] : null,
      price: jsonLd.price,
      currency: jsonLd.currency,
    };
  });

  if (product.description) product.description = clean(product.description);
  if (product.name) product.name = clean(product.name).replace(/\s*\|\s*[^|]+$/g, "");

  const image = toAbsolute(product.images);
  if (image) product.images = image;

  if (!product.producer && scraped.producer) product.producer = clean(scraped.producer);
  if (!product.country && scraped.country) product.country = normalizeCountry(scraped.country);
  if (!product.price && scraped.price) product.price = clean(scraped.price);
  if (!product.currency && scraped.currency) product.currency = clean(scraped.currency);
  if (!product.product_category && scraped.category) product.product_category = clean(scraped.category);

  const abvFromProduct = extractAbvAsIs(product.abv);
  const abvFromScraped = extractAbvAsIs(scraped.abv);
  const abvCandidate = abvFromScraped || abvFromProduct;
  if (abvCandidate) {
    product.abv = abvCandidate;
  } else if (product.abv && !/\d/.test(String(product.abv))) {
    product.abv = null;
  }

  return product;
}
