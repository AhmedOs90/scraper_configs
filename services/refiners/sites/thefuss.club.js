// services/refiners/sites/thefuss.club.js
export default async function refine(rootUrl, product, page) {
  // 1) Title sources: H1 → og:title → <title>
  const { h1, ogTitle, docTitle } = await page.evaluate(() => {
    const q = (s) => document.querySelector(s)?.textContent?.trim() || null;
    const meta = (p) => document.querySelector(`meta[property="${p}"]`)?.content?.trim() || null;
    return { h1: q('h1'), ogTitle: meta('og:title'), docTitle: document.title || null };
  }).catch(() => ({ h1: null, ogTitle: null, docTitle: null }));

  const rawTitle = (h1 || ogTitle || docTitle || product.name || '').trim();

  // 2) ABV from title tail (e.g., "Cinnamon Smores AF Stout, 0.5%")
  //    - Only capture when the % is at the end (common store pattern)
  //    - Guard against "0% sugar", "0% added sugar", etc.
  if (!product.abv && rawTitle) {
    const abvTail = rawTitle.match(
      /(?:,|\s-\s|\s*\()\s*([0-9]+(?:\.[0-9]+)?)\s*%\)?\s*$/i
    );
    const suspicious = /\b(added\s*)?sugar|fat|salt|discount|off\b/i.test(rawTitle);
    if (abvTail && abvTail[1] && !suspicious) {
      const val = parseFloat(abvTail[1]);
      if (!Number.isNaN(val) && val >= 0 && val <= 100) {
        product.abv = `${val}%`;
      }
    }
  }

  // 3) Clean the trailing ABV piece from the name (only if we actually matched it)
  if (rawTitle) {
    const cleaned = rawTitle.replace(
      /(?:,|\s-\s|\s*\()\s*[0-9]+(?:\.[0-9]+)?\s*%\)?\s*$/i,
      ''
    ).trim();

    if (
      !product.name ||
      product.name === 'Name not found' ||
      /,\s*\d+(\.\d+)?\s*%$/.test(product.name)
    ) {
      product.name = cleaned || product.name || rawTitle;
    }
  }

  // 4) Producer (vendor) from the DOM
  if (!product.producer) {
    const vendor = await page.evaluate(() => {
      const sel = [
        '.product__meta--vendor a',
        '.product__meta--vendor .label-font a',
        '.product-meta__vendor a',
        '.product-vendor a',
        '.product-vendor',
        "[itemprop='brand']",
      ].join(',');

      const el = document.querySelector(sel);
      let txt = el?.textContent?.trim() || null;

      // Fallback: vendor links like /collections/vendors?q=Brand+Name
      if (!txt && el?.getAttribute) {
        const href = el.getAttribute('href') || '';
        const m = href.match(/[?&]q=([^&]+)/);
        if (m) {
          try { txt = decodeURIComponent(m[1]).trim(); } catch {}
        }
      }
      return txt || null;
    }).catch(() => null);

    if (vendor) product.producer = vendor;
  }

  return product;
}
