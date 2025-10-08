export default async function refine(rootUrl, product, page) {
  const norm = (s) => (s || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

  // --- Grab the main visible text (focus product area if possible) ---
  const rawText = await page.evaluate(() => {
    const candidates = [
      '.product__description.rte.quick-add-hidden',
      '.product__description.rte',
      '.product__accordion .rte',
      '.product__info-wrapper',
      '[id^="ProductInfo"]',
      'main'
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el && el.innerText) return el.innerText;
    }
    return document.body.innerText || '';
  });
  const text = norm(rawText);

  // --- ABV (handles "0.4% ABV", "ABV: 0.5%", "Less than 0.5% Alc./Vol.") ---
  (() => {
    let abv = null;
    const abvPatterns = [
      /(?:ABV|Alcohol(?:\s*\/\s*Vol\.?)?|Alc\.\s*\/\s*Vol\.?)\s*[:\-]?\s*(?:less than|under|<)\s*([0-9]+(?:\.[0-9]+)?)\s*%/i,
      /([0-9]+(?:\.[0-9]+)?)\s*%\s*(?:ABV|Alcohol(?:\s*\/\s*Vol\.?)?)/i,
      /(?:ABV|Alcohol(?:\s*\/\s*Vol\.?)?)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*%/i
    ];
    for (const re of abvPatterns) {
      const m = text.match(re);
      if (m) {
        const hasLT = /(?:less than|under|<)\s*[0-9.]+\s*%/i.test(m[0]);
        abv = hasLT ? `<${m[1]}%` : `${m[1]}%`;
        break;
      }
    }
    if (!abv && /\b(non[-\s]?alcoholic|alcohol[-\s]?free)\b/i.test(text)) abv = '0%';
    if (abv) product.abv = abv;
  })();

  // --- Energy (Calories → kcal) ---
  (() => {
    let energy = null;
    const caloriesMatch = text.match(/Calories?\s*(?:[:\-]|\s)\s*([<≈]?\s*[0-9]+(?:\.[0-9]+)?)/i);
    if (caloriesMatch) {
      energy = `${norm(caloriesMatch[1])} kcal`;
    } else {
      const kcalMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*k(?:il)?cal/i);
      if (kcalMatch) energy = `${kcalMatch[1]} kcal`;
    }
    if (energy) product.energy = energy;
  })();

  // --- Sugar (g per listed serving) ---
  (() => {
    let sugar = null;
    const sugarPatterns = [
      /\b(?:Sugars?|Total\s*Sugar(?:s)?)\b[^0-9<≈]*([<≈]?\s*[0-9]+(?:\.[0-9]+)?)\s*g\b/i,
      /\bof which sugars\b[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*g/i
    ];
    for (const re of sugarPatterns) {
      const m = text.match(re);
      if (m) {
        sugar = `${norm(m[1])} g`;
        break;
      }
    }
    if (sugar) product.sugar = sugar;
  })();

  // --- Vegan & Gluten Free (from the product description block) ---
  // Use the specific container you provided: ".product__description.rte.quick-add-hidden"
  const diet = await page.evaluate(() => {
    const root =
      document.querySelector('.product__description.rte.quick-add-hidden') ||
      document.querySelector('.product__description.rte') ||
      document.body;

    const txt = (root.innerText || '').toLowerCase();

    // Positive signals
    const isVegan =
      /\bvegan\b/.test(txt) || /\bvegan\s*certified\b/.test(txt) || /\bvegan[-\s]?friendly\b/.test(txt);
    const isGlutenFree = /\bgluten\s*[-\s]?free\b/.test(txt);

    // Simple negation guards (rare on this site, but safe to include)
    const negVegan = /\bnon[-\s]?vegan\b|\bnot\s+vegan\b/.test(txt);
    const negGluten = /\bcontains\s+gluten\b/.test(txt);

    return {
      vegan: isVegan && !negVegan,
      glutenFree: isGlutenFree && !negGluten
    };
  });

  if (diet.vegan) product.vegan = 'Vegan';
  if (diet.glutenFree) product.gluten_free = 'Gluten free';

  return product;
}
