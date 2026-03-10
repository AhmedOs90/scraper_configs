// services/refiners/sites/bevco.dk.js
import { extractABVFromText } from "../refiners_helpers.js";

export default async function refine(rootUrl, product, page) {
  const clean = (v) => String(v ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const extractAbvAsIs = (raw) => {
    const text = clean(raw);
    if (!text) return null;
    const match = text.match(/<\s*\d+(?:[.,]\d+)?\s*%?|\d+(?:[.,]\d+)?\s*%/);
    return match ? match[0].replace(/\s+/g, "") : null;
  };

  const normalizeCountry = (raw) => {
    const text = clean(raw)
      .replace(/^(country(?:\s+of\s+origin)?|origin|made\s+in)\s*[:-]?\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();
    return text || null;
  };

  const normalizePrice = (raw) => {
    const text = clean(raw).replace(/,/g, ".");
    if (!text) return null;
    const match = text.match(/(\d+(?:\.\d+)?)/);
    return match ? match[1] : null;
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

    const jsonLd = (() => {
      const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);
      const isProductNode = (node) => {
        const t = node?.["@type"];
        const types = Array.isArray(t) ? t : [t];
        return types.some((type) => String(type || "").toLowerCase() === "product");
      };

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
            if (!isProductNode(node)) continue;

            const brandValue =
              typeof node.brand === "string"
                ? node.brand
                : (typeof node.brand?.name === "string" ? node.brand.name : null);

            const countryValue =
              node.countryOfOrigin ||
              node.country ||
              node?.productionPlace?.name ||
              node?.origin?.name ||
              node?.manufacturer?.address?.addressCountry ||
              node?.brand?.address?.addressCountry ||
              null;

            const offers = asArray(node.offers);
            let priceValue = null;
            let currencyValue = null;

            for (const offer of offers) {
              if (!offer || typeof offer !== "object") continue;
              const priceSpecs = asArray(offer.priceSpecification);

              if (offer.price != null && priceValue == null) priceValue = String(offer.price);
              if (offer.priceCurrency && !currencyValue) currencyValue = String(offer.priceCurrency);

              for (const spec of priceSpecs) {
                if (!spec || typeof spec !== "object") continue;
                if (spec.price != null && priceValue == null) priceValue = String(spec.price);
                if (spec.priceCurrency && !currencyValue) currencyValue = String(spec.priceCurrency);
              }
            }

            return {
              brand: brandValue ? norm(brandValue) : null,
              country: countryValue ? norm(countryValue) : null,
              price: priceValue != null ? norm(priceValue) : null,
              currency: currencyValue ? norm(currencyValue) : null,
            };
          }
        } catch {
          // ignore malformed scripts
        }
      }
      return { brand: null, country: null, price: null, currency: null };
    })();

    const nuxtProduct = (() => {
      const data = window.__NUXT__?.data;
      if (!data || typeof data !== "object") {
        return { country: null, producer: null, description: null, energy: null, sugar: null, abv: null, category: null };
      }

      for (const value of Object.values(data)) {
        if (!value || typeof value !== "object") continue;
        if (!value.properties || !value.filterableProperties) continue;

        const properties = value.properties || {};
        const filterable = value.filterableProperties || {};

        const country =
          properties?.country?.options?.[0]?.name ||
          (Array.isArray(filterable?.Land) ? filterable.Land[0] : filterable?.Land) ||
          (Array.isArray(filterable?.Country) ? filterable.Country[0] : filterable?.Country) ||
          null;

        const producer =
          properties?.supplier?.options?.[0]?.name ||
          properties?.brand?.options?.[0]?.name ||
          value?.manufacturer?.name ||
          null;

        const description = value?.description || value?.strippedDescription || null;
        const energy = value?.customFields?.products_nutrition_energy || null;
        const sugar = value?.customFields?.products_nutrition_sugar || null;
        const abv =
          properties?.alcohol?.options?.[0]?.name ||
          (Array.isArray(filterable?.Alkohol) ? filterable.Alkohol[0] : filterable?.Alkohol) ||
          (Array.isArray(filterable?.Alcohol) ? filterable.Alcohol[0] : filterable?.Alcohol) ||
          null;
        const category =
          properties?.category?.options?.[0]?.name ||
          (Array.isArray(filterable?.Kategori) ? filterable.Kategori[0] : filterable?.Kategori) ||
          null;

        return {
          country: country ? norm(country) : null,
          producer: producer ? norm(producer) : null,
          description: description ? norm(description) : null,
          energy: energy ? norm(energy) : null,
          sugar: sugar ? norm(sugar) : null,
          abv: abv ? norm(abv) : null,
          category: category ? norm(category) : null,
        };
      }

      return { country: null, producer: null, description: null, energy: null, sugar: null, abv: null, category: null };
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

    const chipAbv = (() => {
      const chips = Array.from(
        document.querySelectorAll(
          "div.inline-block.border-solid.border-1.mr-2.border-gray-400.rounded-2xl.px-4.py-1.text-sm"
        )
      )
        .map((el) => norm(el.textContent))
        .filter(Boolean);
      return chips.find((v) => /\d+(?:[.,]\d+)?\s*%/.test(v)) || null;
    })();

    const bodyText = norm(document.body.innerText || "");

    const energy = getByLabel("energy", "calories", "kcal") || nuxtProduct.energy;
    const sugar = getByLabel("sugar", "sugars", "of which sugars", "carbohydrates") || nuxtProduct.sugar;
    const abv = chipAbv || getByLabel("abv", "alcohol", "alcohol content", "alcohol by volume") || nuxtProduct.abv;
    const producer = getByLabel("brand", "producer", "brewery", "maker") || jsonLd.brand || nuxtProduct.producer;
    const country = getByLabel("country of origin", "origin", "made in", "country") || jsonLd.country || nuxtProduct.country;
    const price = jsonLd.price;
    const currency = jsonLd.currency;

    const breadcrumb = Array.from(document.querySelectorAll(".breadcrumb a, nav.breadcrumb a"))
      .map((el) => norm(el.textContent))
      .filter(Boolean);

    const category = (breadcrumb.length >= 2 ? breadcrumb[breadcrumb.length - 2] : null) || nuxtProduct.category;

    const vegan = /(vegan|vegansk)/i.test(bodyText);
    const gluten = /(gluten[-\s]*free|glutenfri)/i.test(bodyText);

    return {
      energy,
      sugar,
      abv,
      producer,
      country,
      category,
      vegan,
      gluten,
      price,
      currency,
      description: nuxtProduct.description,
    };
  });

  if (product.description) {
    product.description = clean(product.description);
  } else if (scraped.description) {
    product.description = clean(scraped.description);
  }

  if (/^no description available$/i.test(product.description || "") && scraped.description) {
    product.description = clean(scraped.description);
  }

  if (product.name) {
    product.name = clean(product.name)
      .replace(/\s*\|\s*[^|]+$/g, "")
      .replace(/^\s*(?:køb|kob)\s+/i, "");
  }

  if (!product.images || String(product.images).endsWith(".svg")) {
    product.images = toAbsolute(product.images);
  } else {
    product.images = toAbsolute(product.images) || product.images;
  }

  if (!product.producer && scraped.producer) product.producer = clean(scraped.producer);
  if (!product.energy && scraped.energy) product.energy = clean(scraped.energy);
  if (!product.sugar && scraped.sugar) product.sugar = clean(scraped.sugar);
  if (!product.price && scraped.price != null) product.price = clean(scraped.price);
  if (!product.currency && scraped.currency) product.currency = clean(scraped.currency);

  const normalizedPrice = normalizePrice(product.price);
  if (normalizedPrice) product.price = normalizedPrice;

  if (product.country) {
    product.country = normalizeCountry(product.country) || product.country;
  }
  if (!product.country && scraped.country) product.country = normalizeCountry(scraped.country);

  if (!product.country && product.producer) {
    const producerCountryMap = {
      "Royal Unibrew A/S": "Danmark",
    };
    product.country = producerCountryMap[product.producer] || null;
  }

  if (!product.vegan && scraped.vegan) product.vegan = "Vegan";
  if (!product.gluten_free && scraped.gluten) product.gluten_free = "Gluten free";

  if (!product.product_category && scraped.category) {
    product.product_category = clean(scraped.category);
  }

  const abvCandidate =
    extractAbvAsIs(product.abv) ||
    extractAbvAsIs(scraped.abv) ||
    extractAbvAsIs(extractABVFromText(product.name || "", product.description || ""));

  if (abvCandidate) product.abv = abvCandidate;

  return product;
}
