export default async function refine(rootUrl, product, page) {
  // Helper: collapse whitespace
  console.log("called");
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();

  // -------- 1) Pull brand from JSON-LD (most robust on Shopify) --------
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

  // -------- 2) Brand heuristic from product.name if JSON-LD missing ----
  if (!product.producer && product.name) {
    const name = norm(product.name);
    const mQuoted = name.match(/^([^'‘’"]+?)\s*['‘”]/);
    const mPrefix = name.match(/^(.+?)(?:\s+Alcohol\b|\s+Non[- ]Alcohol|\s+\(\d*\.?\d*%?\s*ABV\)|\s+0(?:\.0)?\s*ABV)/i);
    const guess = (mQuoted && norm(mQuoted[1])) || (mPrefix && norm(mPrefix[1]));
    if (guess && guess.length >= 2 && guess.length <= 60) product.producer = guess;
  }

  // -------- 3) ABV extraction from name + page text (handles "0 ABV") ---
  function extractAbvPhrase(text) {
  if (!text) return null;

  const words = text.trim().split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    if (words[i].toLowerCase() === 'abv') {
      return `${words[i - 1]} ${words[i]}`;
    }
  }

  return null;
}



  // Try from product name first
  console.log(product.name);
  let abv = extractAbvPhrase(product.name);
  
  if (abv) product.abv = abv;

  // -------- 4) Vegan / Gluten from page badges/sections ----------------
  const diet = await page.evaluate(() => {
    const txt = (document.body.innerText || '').toLowerCase();
    return {
      vegan: /(^|\b)vegan( friendly)?(\b|$)/i.test(txt),
      glutenFree: /gluten\s*free/i.test(txt),
      lowSugar: /low\s*sugar/i.test(txt)
    };
  });
  if (diet.vegan) product.vegan = 'Vegan';
  if (diet.glutenFree) product.gluten_free = 'Gluten free';

// -------- 5) Energy (kcal) & Sugars (g/100ml) from Sechey block or fallback ---
const nutritionValues = await page.evaluate(() => {
  const result = { energy: null, sugars: null };

  // Try Sechey's ".text-link-animated ul li span" block
  const spans = Array.from(document.querySelectorAll('.text-link-animated ul li span'))
    .map(el => el.innerText.trim().toLowerCase());

  for (const line of spans) {
    if (!result.energy && line.includes('calories')) {
      const m = line.match(/calories[:\s]*([0-9.]+)/i);
      if (m) result.energy = `${m[1]} kcal`;
    }
    if (!result.sugars && line.includes('carbohydrates')) {
      const m = line.match(/carbohydrates[:\s]*([0-9.]+)\s*g/i);
      if (m) result.sugars = `${m[1]} g`;
    }
  }

  return result;
});


if (nutritionValues.energy) product.energy = nutritionValues.energy;
if (nutritionValues.sugar) product.sugar = nutritionValues.sugar;


  // -------- 6) Category (optional) from breadcrumbs or badges ----------
  if (!product.category && product.description) {
    const d = product.description.toLowerCase();
    if (d.includes('pale ale')) product.category = 'Pale Ale';
    else if (d.includes('lager')) product.category = 'Lager';
    else if (d.includes('stout')) product.category = 'Stout';
  }

  return product;
}
