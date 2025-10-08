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

  // -------- 5) Energy (kcal) & Sugars (g/100ml) from nutrition table using selectors ---
const nutritionValues = await page.evaluate(() => {
  const result = { energy: null, sugars: null };

  const rows = document.querySelectorAll('.tfv1-table[data-table-name="Nutrition"] .tfv1-tr');
  for (const row of rows) {
    const label = row.querySelector('.tfv1-label .tfv1-data')?.innerText?.trim().toLowerCase();
    const value = row.querySelector('.tfv1-value .tfv1-data span')?.innerText?.trim().toLowerCase();

    if (!label || !value) continue;

    if (label.includes('energy')) {
      const match = value.match(/([0-9]+(?:\.[0-9]+)?)\s*kcal/i);
      if (match) result.energy = `${match[1]} kcal`;
    }

    if (/carbohydrate/i.test(label) && /sugar/i.test(label)) {
      const match = value.match(/\(([\d.]+)\s*g\)/i);
      if (match) result.sugars = `${match[1]} g`;
    }
  }

  return result;
});


if (nutritionValues.energy) product.energy = nutritionValues.energy;
if (nutritionValues.sugars) product.sugar = nutritionValues.sugars;


  // -------- 6) Category (optional) from breadcrumbs or badges ----------
  if (!product.category && product.description) {
    const d = product.description.toLowerCase();
    if (d.includes('pale ale')) product.category = 'Pale Ale';
    else if (d.includes('lager')) product.category = 'Lager';
    else if (d.includes('stout')) product.category = 'Stout';
  }

  return product;
}
