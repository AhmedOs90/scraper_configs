// services/refiners/sites/drinkdesoi.com.js
import { extractABVFromText } from "../refiners_helpers.js";

export default async function refine(rootUrl, product, page) {
  const clean = (v) => String(v ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const pageUrl = page.url();

  // Dynamic guard: rely on product signals, not only URL shape.
  const pageSignals = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll("script[type='application/ld+json']"));
    const hasProductJsonLd = scripts.some((script) => {
      const text = script.textContent || "";
      return /"@type"\s*:\s*"Product"/i.test(text) || /"@type"\s*:\s*\[\s*"Product"/i.test(text);
    });
    const hasAddToCart = Boolean(
      document.querySelector(
        "form[action*='/cart/add'], button[name='add'], [data-product-form], [data-product-form-submit]"
      )
    );
    const hasProductTitle = Boolean(document.querySelector("h1, [itemprop='name'], .product__title"));

    return { hasProductJsonLd, hasAddToCart, hasProductTitle };
  });

  if (!/\/products\//i.test(pageUrl) && !pageSignals.hasProductJsonLd && !pageSignals.hasAddToCart) {
    product.name = "Name not found";
    product.price = null;
    product.images = null;
    return product;
  }

  const normalizeAbv = (raw) => {
    const text = clean(raw).replace(/,/g, ".");
    if (!text) return null;

    const lt = text.match(/<\s*(\d+(?:\.\d+)?)/);
    if (lt) return "<0.5% ABV";

    const match = text.match(/(\d+(?:\.\d+)?)\s*%?/);
    if (!match) return null;

    const value = Number(match[1]);
    if (Number.isNaN(value)) return null;
    if (value <= 0.5) return "<0.5% ABV";
    return String(value) + "% ABV";
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

    const jsonLdBrand = (() => {
      const scripts = Array.from(document.querySelectorAll("script[type='application/ld+json']"));
      for (const script of scripts) {
        try {
          const parsed = JSON.parse(script.textContent || "null");
          const list = Array.isArray(parsed) ? parsed : [parsed];
          for (const obj of list) {
            if (!obj) continue;
            const productNode = Array.isArray(obj["@graph"])
              ? obj["@graph"].find((n) => n?.["@type"] === "Product")
              : (obj?.["@type"] === "Product" ? obj : null);
            if (!productNode) continue;
            const b = productNode.brand;
            if (typeof b === "string") return norm(b);
            if (b && typeof b.name === "string") return norm(b.name);
          }
        } catch {
          // ignore malformed scripts
        }
      }
      return null;
    })();

    const kv = {};
    const rows = Array.from(document.querySelectorAll("tr, li, .product__meta-item, .product-facts__row"));
    for (const row of rows) {
      const text = norm(row.textContent);
      if (!text || !text.includes(":")) continue;
      const idx = text.indexOf(":");
      const key = norm(text.slice(0, idx)).toLowerCase();
      const value = norm(text.slice(idx + 1));
      if (!key || !value || kv[key]) continue;
      kv[key] = value;
    }

    const getByLabel = (...labels) => {
      for (const label of labels) {
        const found = kv[label.toLowerCase()];
        if (found) return found;
      }
      return null;
    };

    const bodyText = norm(document.body.innerText || "");

    const energy = getByLabel("energy", "calories", "kcal");
    const sugar = getByLabel("sugar", "sugars", "of which sugars", "carbohydrates");
    const abv = getByLabel("abv", "alcohol", "alcohol content", "alcohol by volume");
    const producer = getByLabel("brand", "producer", "brewery", "maker") || jsonLdBrand;

    const breadcrumb = Array.from(document.querySelectorAll(".breadcrumb a, nav.breadcrumb a"))
      .map((el) => norm(el.textContent))
      .filter(Boolean);

    const category = breadcrumb.length >= 2 ? breadcrumb[breadcrumb.length - 2] : null;

    const vegan = /(^|\b)vegan(\b|$)/i.test(bodyText);
    const gluten = /gluten[-\s]*free/i.test(bodyText);

    return { energy, sugar, abv, producer, category, vegan, gluten };
  });

  if (product.description) {
    product.description = clean(product.description);
  }

  if (product.name) {
    product.name = clean(product.name).replace(/\s*\|\s*[^|]+$/g, "");
  }

  if (!product.images || String(product.images).endsWith(".svg")) {
    product.images = toAbsolute(product.images);
  } else {
    product.images = toAbsolute(product.images) || product.images;
  }

  if (!product.producer && scraped.producer) product.producer = clean(scraped.producer);
  if (!product.energy && scraped.energy) product.energy = clean(scraped.energy);
  if (!product.sugar && scraped.sugar) product.sugar = clean(scraped.sugar);

  if (!product.vegan && scraped.vegan) product.vegan = "Vegan";
  if (!product.gluten_free && scraped.gluten) product.gluten_free = "Gluten free";

  if (!product.product_category && scraped.category) {
    product.product_category = clean(scraped.category);
  }

  const abvCandidate =
    normalizeAbv(product.abv) ||
    normalizeAbv(scraped.abv) ||
    normalizeAbv(extractABVFromText(product.name || "", product.description || ""));

  if (abvCandidate) product.abv = abvCandidate;

  return product;
}
