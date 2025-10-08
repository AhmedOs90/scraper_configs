// services/refiners/sites/thebluedolphinstore.com.js
export default async function refine(rootUrl, product, page) {
  // Price from dataLayer.push({...})
  product.price = product.price || await page.evaluate(() => {
    try {
      const scripts = Array.from(document.querySelectorAll('script'))
        .map(s => s.textContent)
        .filter(Boolean);
      for (const script of scripts) {
        if (script.includes('dataLayer.push') && script.includes('"ecommerce"')) {
          const jsonMatch = script.match(/dataLayer\.push\((\{.*?\})\)/s);
          if (jsonMatch && jsonMatch[1]) {
            const data = JSON.parse(jsonMatch[1]);
            const items = data?.ecommerce?.items;
            if (Array.isArray(items) && items.length > 0) return items[0].price ?? null;
          }
        }
      }
    } catch {}
    return null;
  }).catch(() => null);

  // ABV (Graduación)
  product.abv = product.abv || await page.evaluate(() => {
    for (const li of Array.from(document.querySelectorAll('li'))) {
      const txt = (li.innerText || '').toLowerCase();
      if (txt.includes('graduación')) return txt.replace('graduación:', '').trim();
    }
    return null;
  }).catch(() => null);

  product.currency = product.currency || "EUR";

  // Producer (Productor)
  product.producer = product.producer || await page.evaluate(() => {
    for (const li of Array.from(document.querySelectorAll('li'))) {
      const txt = (li.innerText || '').toLowerCase();
      if (txt.includes('productor')) return txt.replace('productor:', '').trim();
    }
    return null;
  }).catch(() => null);

  // Energy / Sugars (Calorías / Azúcares totales)
  product.energy = product.energy || await page.evaluate(() => {
    for (const li of Array.from(document.querySelectorAll('li'))) {
      const txt = (li.innerText || '').toLowerCase();
      if (txt.includes('calorías')) return txt.replace('calorías:', '').trim();
    }
    return null;
  }).catch(() => null);

  product.sugar = product.sugar || await page.evaluate(() => {
    for (const li of Array.from(document.querySelectorAll('li'))) {
      const txt = (li.innerText || '').toLowerCase();
      if (txt.includes('azúcares totales')) return txt.replace('azúcares totales:', '').trim();
    }
    return null;
  }).catch(() => null);

  return product;
}
