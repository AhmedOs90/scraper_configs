// services/refiners/sites/audreyclairecork.com.js
export default async function refine(rootUrl, product, page) {
  const normalize = (s) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");
  const clean = (s) =>
    typeof s === "string" ? s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : s;

  const detectZeroAbvSignals = (txt) => {
    if (!txt) return false;
    const t = txt.toLowerCase();
    return (
      /100%\s*alcohol[-\s]?free/.test(t) ||
      /\b0(\.0+)?\s*%\s*abv\b/.test(t) ||
      /\bzero\s*alcohol\b/.test(t) ||
      (/\balcohol[-\s]?free\b/.test(t) && /100%/.test(t))
    );
  };

  const abvNonAlcoholicRule = (textBlob, imageBlob) => {
    const combined = normalize(`${textBlob || ""} ${imageBlob || ""}`);
    return detectZeroAbvSignals(combined) ? "0%" : "0.5%";
  };

  const parseCurrencyFromToken = (token) => {
    const t = (token || "").toUpperCase().trim();
    const map = {
      "€": "EUR",
      EUR: "EUR",
      "$": "USD",
      USD: "USD",
      "£": "GBP",
      GBP: "GBP",
      DKK: "DKK",
      SEK: "SEK",
      NOK: "NOK",
      CHF: "CHF",
      PLN: "PLN",
      CZK: "CZK",
      HUF: "HUF",
      CAD: "CAD",
      AUD: "AUD"
    };
    return map[t] || null;
  };

  const splitPriceAndCurrency = (priceRaw, currencyRaw) => {
    const out = { price: null, currency: currencyRaw || null };
    if (!priceRaw) return out;

    const raw = normalize(String(priceRaw));
    const symbolMatch = raw.match(/(€|\$|£)/);
    const codeMatch = raw.match(/\b(EUR|USD|GBP|DKK|SEK|NOK|CHF|PLN|CZK|HUF|CAD|AUD)\b/i);

    const detectedCurrency =
      (symbolMatch && parseCurrencyFromToken(symbolMatch[1])) ||
      (codeMatch && parseCurrencyFromToken(codeMatch[1])) ||
      null;

    let num = raw
      .replace(/\b(EUR|USD|GBP|DKK|SEK|NOK|CHF|PLN|CZK|HUF|CAD|AUD)\b/gi, "")
      .replace(/[€$£]/g, "")
      .trim();

    if (num.includes(",") && !num.includes(".")) num = num.replace(",", ".");
    else num = num.replace(/,/g, "");

    const m = num.match(/(\d+(?:\.\d+)?)/);
    out.price = m ? m[1] : null;
    out.currency = out.currency || detectedCurrency;
    return out;
  };

  // blobs
  product.description = clean(product.description);

  const tabsText = await page
    .evaluate(() => document.querySelector(".tabsPages")?.innerText || "")
    .catch(() => "");

  const imageHints = await page
    .evaluate(() => {
      const hints = [];
      const og = document.querySelector("meta[property='og:image']")?.content;
      if (og) hints.push(og);

      const imgs = Array.from(
        document.querySelectorAll(
          ".product-image img, .product-gallery img, img.wp-post-image, img[itemprop='image'], .gallery img, img"
        )
      )
        .slice(0, 8)
        .map((img) => {
          const alt = img.getAttribute("alt") || "";
          const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
          const file = (src.split("/").pop() || "").split("?")[0];
          return `${alt} ${src} ${file}`.trim();
        })
        .filter(Boolean);

      hints.push(...imgs);
      return hints.join(" | ");
    })
    .catch(() => "");

  const textBlob = normalize([product.description || "", tabsText || ""].join(" "));
  const imgBlob = normalize(imageHints || "");

  // ABV rule (0% if 100% alcohol free, else 0.5% for this collection)
  product.abv = abvNonAlcoholicRule(textBlob, imgBlob);

  // Price: split currency
  const split = splitPriceAndCurrency(product.price, product.currency);
  product.price = split.price ?? product.price ?? null;
  product.currency = split.currency ?? product.currency ?? null;

  // ✅ remove producer entirely
  product.producer = null;

  // Vegan / Gluten / Energy / Sugar (best effort)
  const lower = (textBlob || "").toLowerCase();

  if (!product.vegan) {
    if (/\bnot\s+vegan\b|\bnon[-\s]?vegan\b/.test(lower)) product.vegan = "No";
    else if (/\bvegan\b/.test(lower)) product.vegan = "Yes";
  }

  if (!product.gluten_free) {
    if (/\bcontains?\s+gluten\b/.test(lower)) product.gluten_free = "No";
    else if (/\bgluten[-\s]?free\b/.test(lower)) product.gluten_free = "Yes";
  }

  if (!product.energy) {
    const labeled = textBlob.match(/\benergy\b[^0-9]{0,20}(\d+(?:\.\d+)?)\s*(kcal|kJ)\b/i);
    const kcal = textBlob.match(/(\d+(?:\.\d+)?)\s*(kcal)\b/i);
    const kj = textBlob.match(/(\d+(?:\.\d+)?)\s*(kJ)\b/i);
    product.energy =
      (labeled && `${labeled[1]} ${labeled[2]}`) ||
      (kcal && `${kcal[1]} ${kcal[2]}`) ||
      (kj && `${kj[1]} ${kj[2]}`) ||
      null;
  }

  if (!product.sugar) {
    const per100 = textBlob.match(/\b(sugar|sugars)\b[^0-9]{0,30}(\d+(?:\.\d+)?)\s*g\s*\/\s*100\s*ml\b/i);
    const labeled = textBlob.match(/\b(sugar|sugars)\b[^0-9]{0,20}(\d+(?:\.\d+)?)\s*g\b/i);

    if (per100) product.sugar = `${per100[2]} g/100ml`;
    else if (labeled) product.sugar = `${labeled[2]} g`;
    else if (/\bno added sugar\b|\bzero sugar\b|\bsugar[-\s]?free\b/i.test(textBlob)) product.sugar = "0";
    else product.sugar = null;
  }

  return product;
}
