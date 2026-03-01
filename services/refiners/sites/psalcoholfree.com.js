// services/refiners/sites/psalcoholfree.com.js
import { extractABVFromText } from "../refiners_helpers.js";

const PRICE_RE = /(\d+)(?:[^\d]+(\d{2}))?/;

function clean(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toAbsUrl(value, rootUrl) {
  const s = clean(value);
  if (!s) return null;
  try {
    if (s.startsWith("http")) return s;
    if (s.startsWith("//")) return `https:${s}`;
    return new URL(s, rootUrl).href;
  } catch {
    return s;
  }
}

function normalizeAbv(raw) {
  const s = clean(raw)
    .replace(/,/g, ".")
    .replace(/&(amp;)?lt;|\\u003c|\\u0026lt;|＜/gi, "<")
    // Normalize leading-dot decimal like ".5%" to "0.5%"
    .replace(/(^|[^0-9])\.(\d+)/g, "$10.$2");
  if (!s) return null;

  const lt = s.match(/<\s*(\d*(?:\.\d+)?)/);
  if (lt?.[1]) {
    const value = Number(lt[1]);
    if (!Number.isNaN(value) && value <= 0.5) return "<0.5% ABV";
    if (!Number.isNaN(value)) return `${value}% ABV`;
  }

  const m =
    s.match(/(\d*(?:\.\d+)?)\s*%/i) ||
    s.match(/(\d*(?:\.\d+)?)\s*abv/i);
  if (!m) return null;

  const value = Number(m[1]);
  if (Number.isNaN(value)) return null;
  if (value <= 0.5) return "<0.5% ABV";
  return `${value}% ABV`;
}

function parsePrice(raw) {
  const s = clean(raw);
  if (!s) return null;

  const decimal = s.match(/(\d+[.,]\d{2})/g);
  if (decimal?.length) {
    const last = decimal[decimal.length - 1].replace(",", ".");
    const num = Number(last);
    if (!Number.isNaN(num)) return num.toFixed(2);
  }

  const split = s.match(/(\d+)\D+(\d{2})/);
  if (split) {
    const num = Number(`${split[1]}.${split[2]}`);
    if (!Number.isNaN(num)) return num.toFixed(2);
  }

  const m = s.match(PRICE_RE);
  if (m) {
    const asInt = Number(m[1]);
    if (!Number.isNaN(asInt)) {
      if (asInt >= 100 && asInt <= 999999) {
        return (asInt / 100).toFixed(2);
      }
      return asInt.toFixed(2);
    }
  }

  return null;
}

function extractOriginCountry(...sources) {
  for (const source of sources) {
    const text = clean(source);
    if (!text) continue;

    const originMatch = text.match(/\bOrigin\s*:\s*([A-Za-z][A-Za-z .,'()-]{1,80})/i);
    const plainCountryCandidate = /^[A-Za-z][A-Za-z .,'()-]{1,40}$/.test(text) ? text : null;
    const rawCandidate = originMatch?.[1] || plainCountryCandidate;
    if (!rawCandidate) continue;

    let candidate = clean(rawCandidate)
      .replace(/\b(Alcohol|Size|Notes?|Ingredients?|Food Pairing)\b.*$/i, "")
      .replace(/^[,.;\s]+|[,.;\s]+$/g, "")
      .trim();

    if (!candidate) continue;
    if (candidate.length > 60) continue;
    if (/[0-9]/.test(candidate)) continue;
    if (/^(origin|contains sulfites?)$/i.test(candidate)) continue;
    if (/^no description available$/i.test(candidate)) continue;

    candidate = candidate.replace(/^(from|made in)\s+/i, "").trim();
    if (candidate) return candidate;
  }

  return null;
}

function inferCategory(name, description, existingCategory = "") {
  const cat = `${existingCategory || ""}`.toLowerCase();
  const nm = `${name || ""}`.toLowerCase();
  const desc = `${description || ""}`.toLowerCase();
  const text = `${cat} ${nm} ${desc}`;

  if (/wine/.test(cat)) return "Wines";
  if (/ready[-\s]*to[-\s]*drink|\brtd\b|cocktail|mocktail/.test(cat)) return "Cocktails";
  if (/spirit/.test(cat)) return "Spirits";

  if (/spritz|martini|mule|negroni|margarita|tonic|mocktail|cocktail/.test(nm)) return "Cocktails";
  if (/wine|chardonnay|cabernet|merlot|rose|rosé|sauvignon|moscato|brut|prosecco|riesling|pinot|grigio|champagne|premium\s+red/.test(nm)) return "Wines";
  if (/gin|vodka|rum|whisky|whiskey|tequila|spirit|vermouth|bourbon|aperitivo/.test(nm)) return "Spirits";

  if (/wine|chardonnay|cabernet|merlot|rose|rosé|sauvignon|moscato|brut|prosecco|riesling|pinot|grigio|champagne|premium\s+red/.test(desc)) return "Wines";
  if (/gin|vodka|rum|whisky|whiskey|tequila|spirit|vermouth|bourbon|aperitivo/.test(desc)) return "Spirits";
  if (/spritz|martini|mule|negroni|margarita|tonic|mocktail|cocktail|ready[-\s]*to[-\s]*drink|\brtd\b/.test(desc)) return "Cocktails";

  if (/wine|chardonnay|cabernet|merlot|rose|rosé|sauvignon|moscato|brut|prosecco|riesling|pinot|grigio|champagne|premium\s+red/.test(text)) return "Wines";
  if (/spritz|martini|mule|negroni|margarita|tonic|mocktail|cocktail|ready[-\s]*to[-\s]*drink|\brtd\b/.test(text)) return "Cocktails";
  if (/gin|vodka|rum|whisky|whiskey|tequila|spirit|vermouth|bourbon|aperitivo/.test(text)) return "Spirits";

  // Keep psalcoholfree mapped to the 3 expected categories.
  return "Spirits";
}

export default async function refine(rootUrl, product, page) {
  const scraped = await page.evaluate(() => {
    const norm = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
    const toId = (value) => {
      if (value == null) return null;
      const v = String(value).trim();
      return v || null;
    };

    const pageUrl = window.location.href;
    const pageHost = (() => {
      try {
        return new URL(pageUrl).hostname.toLowerCase();
      } catch {
        return "";
      }
    })();
    const isAmazon = /(^|\.)amazon\./i.test(pageHost);

    const text = document.body?.innerText || "";
    const variantInUrl = (() => {
      try {
        return toId(new URL(window.location.href).searchParams.get("variant"));
      } catch {
        return null;
      }
    })();

    const firstText = (selectors) => {
      for (const selector of selectors) {
        const node = document.querySelector(selector);
        if (!node) continue;
        const value = norm(node.textContent);
        if (value) return value;
      }
      return null;
    };

    const priceText = firstText([
      "[data-product-price]",
      "main [data-product-price]",
      ".product__price",
      "main .price-item--regular",
      ".price .money",
    ]);

    const descriptionText = firstText([
      "[itemprop='description']",
      ".product-single__description",
      ".product__description",
      ".description",
    ]);
    const descriptionEl = document.querySelector(
      "[itemprop='description'], .product-single__description, .product__description, .description"
    );
    const descriptionHtml = descriptionEl?.innerHTML || "";
    const descriptionBlockText = norm(descriptionEl?.textContent || "");

    let originText = null;
    const originFromHtml = descriptionHtml.match(/Origin\s*:\s*(?:<\/[^>]+>\s*)*([^<\n\r]+)/i);
    if (originFromHtml?.[1]) {
      originText = norm(originFromHtml[1]);
    }
    if (!originText) {
      const originFromDescriptionText = descriptionBlockText.match(/Origin\s*:\s*([^\n\r]+)/i);
      if (originFromDescriptionText?.[1]) {
        originText = norm(originFromDescriptionText[1]);
      }
    }

    const vendorText = firstText([
      ".product__vendor",
      "[itemprop='brand']",
      ".brand",
    ]);

    const image =
      document.querySelector("meta[property='og:image:secure_url']")?.content ||
      document.querySelector("meta[property='og:image']")?.content ||
      document.querySelector("img[itemprop='image']")?.getAttribute("src") ||
      null;

    let currency =
      document.querySelector("meta[property='product:price:currency']")?.content ||
      document.querySelector("meta[property='og:price:currency']")?.content ||
      window.Shopify?.currency?.active ||
      window.ShopifyAnalytics?.meta?.currency ||
      null;

    const pickVariant = (variants) => {
      if (!Array.isArray(variants) || variants.length === 0) return null;

      if (variantInUrl) {
        const match = variants.find((variant) => toId(variant?.id) === variantInUrl);
        if (match) return match;
      }

      const available = variants.find((variant) => variant?.available === true);
      if (available) return available;

      return variants[0];
    };

    const metaProduct =
      window.meta && typeof window.meta.product === "object"
        ? window.meta.product
        : null;
    const preOrderProduct =
      window._POConfig && typeof window._POConfig.product === "object"
        ? window._POConfig.product
        : null;

    const selectedVariant =
      pickVariant(metaProduct?.variants) ||
      (preOrderProduct?.selected_or_first_available_variant &&
      (!variantInUrl ||
        toId(preOrderProduct.selected_or_first_available_variant.id) === variantInUrl)
        ? preOrderProduct.selected_or_first_available_variant
        : null) ||
      pickVariant(preOrderProduct?.variants);

    let scriptPriceCents = null;
    if (selectedVariant?.price != null) {
      const raw = selectedVariant.price;
      const asNumber = Number(raw);
      if (Number.isFinite(asNumber)) {
        scriptPriceCents = String(raw).includes(".")
          ? Math.round(asNumber * 100)
          : Math.round(asNumber);
      }
    }

    let scriptPriceText = null;
    let scriptVendor = norm(metaProduct?.vendor || preOrderProduct?.vendor || "");
    let scriptCategory = norm(metaProduct?.type || preOrderProduct?.type || "");
    let scriptOrigin = null;
    let scriptAbv = null;

    const findOriginInJson = (value) => {
      const queue = [value];

      while (queue.length) {
        const current = queue.pop();
        if (current == null) continue;

        if (Array.isArray(current)) {
          for (const item of current) queue.push(item);
          continue;
        }

        if (typeof current !== "object") continue;

        const countryOfOrigin = current.countryOfOrigin;
        if (typeof countryOfOrigin === "string" && norm(countryOfOrigin)) {
          return norm(countryOfOrigin);
        }

        if (typeof current.name === "string" && /origin|country/i.test(current.name)) {
          const valueCandidate =
            current.value ??
            current.text ??
            current.description ??
            current.identifier ??
            null;
          if (typeof valueCandidate === "string" && norm(valueCandidate)) {
            return norm(valueCandidate);
          }
        }

        for (const key of Object.keys(current)) {
          queue.push(current[key]);
        }
      }

      return null;
    };

    for (const script of Array.from(document.querySelectorAll("script"))) {
      const content = script.textContent || "";

      if (!currency) {
        const currencyMatch = content.match(/Shopify\.currency\s*=\s*\{"active":"([A-Z]{3})"/);
        if (currencyMatch?.[1]) currency = currencyMatch[1];
      }

      if (scriptPriceCents == null) {
        const variantMatch = content.match(/selected_or_first_available_variant\s*=\s*(\{[\s\S]*?\});/);
        if (variantMatch?.[1]) {
          try {
            const parsed = JSON.parse(variantMatch[1]);
            if (parsed?.price != null) {
              const asNumber = Number(parsed.price);
              if (Number.isFinite(asNumber)) {
                scriptPriceCents = String(parsed.price).includes(".")
                  ? Math.round(asNumber * 100)
                  : Math.round(asNumber);
              }
            }
            if (!scriptVendor && parsed?.vendor) {
              scriptVendor = norm(parsed.vendor);
            }
          } catch {
            // ignore parse errors
          }
        }
      }

      if (!scriptPriceText) {
        if (variantInUrl) {
          const escapedVariant = variantInUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const variantPriceMatch = content.match(
            new RegExp(
              `"variantId"\\s*:\\s*${escapedVariant}[\\s\\S]{0,600}?"price"\\s*:\\s*"([0-9]+(?:\\.[0-9]{2})?)"`
            )
          );
          if (variantPriceMatch?.[1]) scriptPriceText = variantPriceMatch[1];
        }

        if (!scriptPriceText) {
          const genericPriceMatch = content.match(/"price"\s*:\s*"([0-9]+(?:\.[0-9]{2})?)"/);
          if (genericPriceMatch?.[1]) scriptPriceText = genericPriceMatch[1];
        }
      }

      if (!scriptVendor) {
        const vendorMatch = content.match(/"vendor"\s*:\s*"([^"]+)"/);
        if (vendorMatch?.[1]) scriptVendor = vendorMatch[1];
      }

      if (!scriptOrigin) {
        if ((script.type || "").toLowerCase().includes("ld+json")) {
          try {
            const parsed = JSON.parse(content);
            scriptOrigin = findOriginInJson(parsed);
          } catch {
            // ignore parse errors
          }
        }

        if (!scriptOrigin) {
          const originFromScriptText = content.match(/Origin:\s*(?:\\u00a0|&nbsp;|\s)*([A-Za-z][A-Za-z .,'()-]{1,80})/i);
          if (originFromScriptText?.[1]) {
            scriptOrigin = norm(originFromScriptText[1]);
          }
        }
      }

      if (!scriptAbv) {
        const abvMatch = content.match(
          /Alcohol[^%]{0,80}?((?:&lt;|\\u0026lt;|\\u003c|<)\s*)?(\d*(?:[.,]\d+)?)\s*%/i
        );
        if (abvMatch) {
          const marker = abvMatch[1] ? "<" : "";
          scriptAbv = `${marker}${abvMatch[2].replace(",", ".")}%`;
        }
      }
    }

    const categoryCrumb = Array.from(document.querySelectorAll(".breadcrumb a, nav.breadcrumb a"))
      .map((node) => norm(node.textContent))
      .filter(Boolean);

    const amazonTitle = isAmazon
      ? firstText([
          "#productTitle",
          "#title span",
          "h1#title span",
        ])
      : null;

    const amazonPriceText = isAmazon
      ? firstText([
          "#corePrice_feature_div .a-price .a-offscreen",
          "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
          "#apex_desktop .a-price .a-offscreen",
          "#priceblock_ourprice",
          "#priceblock_dealprice",
          "#priceblock_saleprice",
          ".a-price .a-offscreen",
        ])
      : null;

    const amazonDescription = isAmazon
      ? (
          document.querySelector("meta[name='description']")?.content ||
          descriptionText ||
          ""
        )
      : null;

    const amazonBrand = isAmazon
      ? firstText([
          "#bylineInfo",
          "#brand",
        ])
      : null;

    const amazonImage = isAmazon
      ? (
          document.querySelector("#landingImage")?.getAttribute("data-old-hires") ||
          document.querySelector("#landingImage")?.getAttribute("src") ||
          document.querySelector("#imgTagWrapperId img")?.getAttribute("src") ||
          null
        )
      : null;

    const amazonBreadcrumb = isAmazon
      ? Array.from(document.querySelectorAll("#wayfinding-breadcrumbs_feature_div ul li a"))
          .map((node) => norm(node.textContent))
          .filter(Boolean)
      : [];
    const amazonCategory = amazonBreadcrumb.length
      ? amazonBreadcrumb[amazonBreadcrumb.length - 1]
      : null;

    return {
      pageUrl,
      isAmazon,
      bodyText: text,
      priceText,
      descriptionText,
      originText,
      vendorText,
      image,
      currency,
      scriptPriceCents,
      scriptPriceText,
      scriptVendor,
      scriptCategory,
      scriptOrigin,
      scriptAbv,
      categoryCrumb,
      amazonTitle,
      amazonPriceText,
      amazonDescription,
      amazonBrand,
      amazonImage,
      amazonCategory,
    };
  });

  const isAmazonPage = Boolean(scraped.isAmazon);

  if (isAmazonPage) {
    const currentName = clean(product.name);
    const isBadAmazonName = (value) =>
      !value ||
      /^name not found$/i.test(value) ||
      /^adding to cart/i.test(value) ||
      /^psalcoholfree$/i.test(value) ||
      /product summary/i.test(value) ||
      /keyboard shortcut/i.test(value);
    const shouldReplaceName =
      isBadAmazonName(currentName);

    const nameFromDescription = clean(scraped.amazonDescription).replace(
      /\s*:\s*amazon\.[^:]+.*$/i,
      ""
    );

    if (shouldReplaceName) {
      const titleCandidate = clean(scraped.amazonTitle);
      product.name = isBadAmazonName(titleCandidate)
        ? (nameFromDescription || product.name)
        : titleCandidate;
    }

    if (!product.description || /^no description available$/i.test(clean(product.description))) {
      product.description = clean(scraped.amazonDescription || scraped.descriptionText);
    }

    const amazonImage = toAbsUrl(scraped.amazonImage || product.images, rootUrl);
    if (amazonImage) product.images = amazonImage;

    const amazonPrice = parsePrice(scraped.amazonPriceText) || parsePrice(product.price);
    if (amazonPrice) product.price = amazonPrice;

    if (!product.producer) {
      const amazonBrand = clean(scraped.amazonBrand).replace(/^brand\s*:\s*/i, "");
      if (amazonBrand) product.producer = amazonBrand;
    }
  }

  if (product.name) {
    product.name = clean(product.name)
      .replace(/\s*\|\s*[^|]+$/g, "")
      .replace(/\s*:\s*amazon\.[^:]+.*$/i, "");
  }

  if (!product.description) {
    product.description = clean(scraped.descriptionText);
  } else {
    product.description = clean(product.description);
  }

  const absoluteImage = toAbsUrl(product.images || scraped.image, rootUrl);
  if (absoluteImage) product.images = absoluteImage;

  const fromScript =
    typeof scraped.scriptPriceCents === "number"
      ? (scraped.scriptPriceCents / 100).toFixed(2)
      : null;
  const fromScriptText = parsePrice(scraped.scriptPriceText);
  const fromDom = parsePrice(scraped.priceText);
  const fromExisting = parsePrice(product.price);

  if (fromScript || fromScriptText || fromDom || fromExisting) {
    product.price = fromScript || fromScriptText || fromDom || fromExisting;
  }

  const resolvedCurrency = clean(scraped.currency || product.currency || "").toUpperCase();
  if (resolvedCurrency) {
    product.currency = resolvedCurrency;
  } else {
    product.currency = "CAD";
  }

  if (!product.producer) {
    product.producer = clean(scraped.vendorText || scraped.scriptVendor) || product.producer;
  }

  const originCountry = extractOriginCountry(
    scraped.originText,
    scraped.scriptOrigin,
    product.description,
    scraped.descriptionText,
    scraped.bodyText
  );
  if (originCountry) {
    product.country = originCountry;
  } else if (!product.country) {
    product.country = "Canada";
  }

  const crumb = Array.isArray(scraped.categoryCrumb) && scraped.categoryCrumb.length >= 2
    ? clean(scraped.categoryCrumb[scraped.categoryCrumb.length - 2])
    : null;
  const categoryCandidate =
    clean(scraped.amazonCategory) ||
    crumb ||
    clean(scraped.scriptCategory) ||
    clean(product.product_category);
  product.product_category = inferCategory(product.name, product.description, categoryCandidate);

  if (!product.vegan && /vegan/i.test(scraped.bodyText || "")) {
    product.vegan = "Vegan";
  }

  if (!product.gluten_free && /gluten[-\s]*free/i.test(scraped.bodyText || "")) {
    product.gluten_free = "Gluten free";
  }

  const abvCandidate =
    normalizeAbv(product.abv) ||
    normalizeAbv(scraped.scriptAbv) ||
    normalizeAbv(extractABVFromText(product.name || "", product.description || ""));

  if (abvCandidate) {
    product.abv = abvCandidate;
  }

  return product;
}
