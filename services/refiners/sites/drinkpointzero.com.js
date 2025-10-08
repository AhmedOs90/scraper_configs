export default async function refine(rootUrl, product, page) {
  // Helper: collapse whitespace
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();

  // -------- 1) Pull brand from JSON-LD (most robust when present) --------
  const jsonLd = await page.evaluate(() => {
    const out = { brand: null };
    const nodes = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    for (const n of nodes) {
      try {
        const data = JSON.parse(n.textContent || 'null');
        const arr = Array.isArray(data) ? data : [data];
        for (const obj of arr) {
          if (obj && obj['@type'] === 'Product' && obj.brand) {
            if (typeof obj.brand === 'string') return { brand: obj.brand };
            if (obj.brand && typeof obj.brand.name === 'string') return { brand: obj.brand.name };
          }
        }
      } catch (_) {}
    }
    return out;
  });
  if (jsonLd.brand) product.producer = jsonLd.brand;

  // -------- 1b) Brand from product title H1 (DrinkPointZero) -----------
  if (!product.producer) {
    try {
      const titleText = await page.evaluate(() => {
        const sels = [
          // common product-title variants
          'h1.product__title',
          'h1.product-title',
          'h1.product-single__title',
          // the user-provided pattern from a similar theme
          '.main-product__block .m-product-title',
          // final fallback: first H1 on the page
          'h1',
        ];
        for (const s of sels) {
          const el = document.querySelector(s);
          const txt = el && el.textContent ? el.textContent.trim() : '';
          if (txt) return txt;
        }
        return null;
      });

      if (titleText) {
        const t = norm(titleText);
        // Extract brand as the part before the first common separator
        // e.g. "Pierre Zero - Merlot (0.0%)" -> "Pierre Zero"
        let brand = null;
        const m = t.match(/^([^–—\-:|]+?)\s*(?:-|–|—|:|\|)\s+/);
        if (m && m[1]) {
          brand = norm(m[1]);
        }
        // Extra fallback: if it starts with something like "Brand Name"
        if (!brand) {
          // Take the first 2–3 words if that looks sensible
          const words = t.split(/\s+/);
          if (words.length >= 2) brand = norm(words.slice(0, 2).join(' '));
        }
        if (brand && brand.length >= 2 && brand.length <= 60) {
          product.producer = brand;
        }
      }
    } catch (_) {}
  }

  // -------- 2) Brand heuristic from product.name if still missing -------
  if (!product.producer && product.name) {
    const name = norm(product.name);
    const mQuoted = name.match(/^([^'‘’"]+?)\s*['‘”]/);
    const mPrefix = name.match(/^(.+?)(?:\s+Alcohol\b|\s+Non[- ]Alcohol|\s+\(\d*\.?\d*%?\s*ABV\)|\s+0(?:\.0)?\s*ABV)/i);
    const guess = (mQuoted && norm(mQuoted[1])) || (mPrefix && norm(mPrefix[1]));
    if (guess && guess.length >= 2 && guess.length <= 60) product.producer = guess;
  }

  // -------- 3) ABV extraction (kept minimal; you can swap in your richer one) ---
  function extractAbvPhrase(text) {
    if (!text) return null;
    const t = String(text).trim();

    // Try simple "[number]% ABV" or just "[number]%"
    let m = t.match(/(\d+(?:\.\d+)?)\s*%\s*(?:ABV)?/i);
    if (m) return `${m[1]}%`;

    // "[number] ABV" (no %)
    m = t.match(/(\d+(?:\.\d+)?)\s*ABV\b/i);
    if (m) return `${m[1]}%`;

    // textual zero
    if (/\b0\.?0?\s*%\b/i.test(t) || /\balcohol[-\s]?free\b/i.test(t) || /\bnon[-\s]?alcoholic\b/i.test(t)) {
      return '0%';
    }
    return null;
  }

  // Try from product name first
  let abv = extractAbvPhrase(product.name);
  if (!abv) {
    // Try the visible h1 too
    try {
      const h1Text = await page.evaluate(() => {
        const el = document.querySelector('h1') || document.querySelector('h1.product__title') || document.querySelector('h1.product-title');
        return el ? el.textContent : null;
      });
      if (h1Text) abv = extractAbvPhrase(h1Text);
    } catch (_) {}
  }
  if (abv) product.abv = abv;

  // -------- 4) Vegan / Gluten simple text detection --------------------
  const diet = await page.evaluate(() => {
    const txt = (document.body.innerText || '').toLowerCase();
    return {
      vegan: /(^|\b)vegan( friendly)?(\b|$)/i.test(txt),
      glutenFree: /gluten\s*free/i.test(txt),
    };
  });
  if (diet.vegan) product.vegan = 'Vegan';
  if (diet.glutenFree) product.gluten_free = 'Gluten free';

  // -------- 5) Optional category hint from description -----------------
  if (!product.category && product.description) {
    const d = product.description.toLowerCase();
    if (d.includes('merlot')) product.category = 'Red Wine';
    else if (d.includes('chardonnay')) product.category = 'White Wine';
    else if (d.includes('sparkling')) product.category = 'Sparkling Wine';
  }

  return product;
}
