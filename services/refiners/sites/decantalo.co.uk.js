// services/refiners/sites/decantalo.co.uk.js
export default async function refine(rootUrl, product, page) {
  // Try to read the JSON-LD Product data
  const ldProduct = await page.evaluate(() => {
    const scripts = Array.from(
      document.querySelectorAll("script[type='application/ld+json']")
    );

    const nodes = [];

    for (const s of scripts) {
      const text = s.textContent || s.innerText || "";
      if (!text.trim()) continue;

      try {
        const json = JSON.parse(text);

        if (Array.isArray(json)) {
          nodes.push(...json);
        } else {
          nodes.push(json);
        }
      } catch (e) {
        // Some sites put invalid JSON in there – just ignore and continue
        continue;
      }
    }

    if (!nodes.length) return null;

    const isProductType = (node) => {
      if (!node || !node["@type"]) return false;
      if (typeof node["@type"] === "string") return node["@type"] === "Product";
      if (Array.isArray(node["@type"])) return node["@type"].includes("Product");
      return false;
    };

    const products = nodes.filter(isProductType);
    if (!products.length) return null;

    // Prefer the first Product that has an Offer with price
    const hasPrice = (p) => {
      if (!p.offers) return false;
      if (Array.isArray(p.offers)) {
        return p.offers.some((o) => o && (o.price || o.priceCurrency));
      }
      return Boolean(p.offers.price || p.offers.priceCurrency);
    };

    let chosen = products.find(hasPrice) || products[0];

    return chosen || null;
  });

  if (!ldProduct) {
    // Nothing to refine from JSON-LD, just return what we already have
    return product;
  }

  // Pull data from the chosen Product node
  try {
    // ---- PRICE & CURRENCY ----
    if (ldProduct.offers) {
      const offer = Array.isArray(ldProduct.offers)
        ? ldProduct.offers[0]
        : ldProduct.offers;

      if (offer) {
        if (!product.price && offer.price) {
          product.price = String(offer.price);
        }

        if (!product.currency && offer.priceCurrency) {
          product.currency = String(offer.priceCurrency);
        }
      }
    }

    // ---- PRODUCER / BRAND ----
    if (!product.producer) {
      if (ldProduct.manufacturer && ldProduct.manufacturer.name) {
        product.producer =
          Array.isArray(ldProduct.manufacturer.name)
            ? ldProduct.manufacturer.name[0]
            : ldProduct.manufacturer.name;
      } else if (ldProduct.brand && ldProduct.brand.name) {
        product.producer =
          Array.isArray(ldProduct.brand.name)
            ? ldProduct.brand.name[0]
            : ldProduct.brand.name;
      }
    }

    // Optional: hydrate name/description if you want
    // if (!product.name && ldProduct.name) product.name = ldProduct.name;
    // if (!product.description && ldProduct.description) product.description = ldProduct.description;
  } catch (e) {
    console.error("decantalo.co.uk refiner error:", e.message);
  }

  // ---- ABV FROM "DETAILS" BLOCK ----
  try {
    // Only bother if we don't have ABV yet
    if (!product.abv) {
      const alcoholText = await page.evaluate(() => {
        const items = Array.from(
          document.querySelectorAll(".product-features__item")
        );

        for (const item of items) {
          const nameEl = item.querySelector(".product-features__item__name");
          const valueEl = item.querySelector(".product-features__item__value");
          if (!nameEl || !valueEl) continue;

          const label = (nameEl.textContent || "").trim().toLowerCase();
          if (label === "alcohol") {
            return (valueEl.textContent || "").trim();
          }
        }
        return null;
      });

      if (alcoholText) {
        const lower = alcoholText.toLowerCase();

        // Case 1: "Alcohol free"
        if (lower.includes("alcohol free")) {
          product.abv = "<0.5%";
        } else {
          // Case 2: explicit numeric like "0.5 %", "10%", etc.
          const m = alcoholText.match(/(\d+(?:[\.,]\d+)?)\s*%/);
          if (m) {
            const num = m[1].replace(",", ".");
            product.abv = `${num}%`;
          }
        }
      }
    }
  } catch (e) {
    console.error("decantalo.co.uk ABV extraction error:", e.message);
  }

  // ---- VEGAN FROM FEATURE STICKERS ----
  try {
    if (!product.vegan) {
      const badges = await page.evaluate(() => {
        return Array.from(
          document.querySelectorAll(".phrase_feature_value")
        ).map((el) => (el.textContent || "").trim().toLowerCase());
      });

      if (badges && badges.some((t) => t.includes("vegan"))) {
        // Adjust to whatever convention you use in Lake:
        // "yes", true, "1", etc.
        product.vegan = "yes";
      }
    }
  } catch (e) {
    console.error("decantalo.co.uk vegan extraction error:", e.message);
  }

  return product;
}
