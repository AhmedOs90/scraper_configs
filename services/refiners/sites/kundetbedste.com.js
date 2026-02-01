// services/refiners/sites/kundetbedste.com.js

export default async function refine(rootUrl, product, page) {

  /**
   * --------------------
   * PRODUCER
   * --------------------
   */

  // 1) JSON-LD Product.brand
  const producerFromLd = await page.evaluate(() => {
    const scripts = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]')
    );

    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent);
        const items = Array.isArray(data) ? data : [data];
        const prod = items.find(x => x && x['@type'] === 'Product');

        if (prod?.brand) {
          return typeof prod.brand === 'string'
            ? prod.brand
            : prod.brand?.name || null;
        }
      } catch {
        continue;
      }
    }
    return null;
  }).catch(() => null);

  if (producerFromLd) {
    product.producer = producerFromLd;
  }

  // 2) Fallback: title pattern → "fra ISH"
  if (!product.producer) {
    const producerFromTitle = await page.evaluate(() => {
      const h2 = document.querySelector('.details-content h2');
      if (!h2) return null;

      const text = h2.textContent.trim();

      // Danish / English patterns
      const match =
        text.match(/\bfra\s+([A-ZÆØÅ][A-Za-zÆØÅæøå\s\-]+)/i) ||
        text.match(/\bfrom\s+([A-Z][A-Za-z\s\-]+)/i);

      return match ? match[1].trim() : null;
    }).catch(() => null);

    if (producerFromTitle) {
      product.producer = producerFromTitle;
    }
  }

  /**
   * --------------------
   * ABV — Alkoholindhold field
   * --------------------
   * <strong>Alkoholindhold:</strong> <span>&lt;0,5%</span>
   */
  const abv = await page.evaluate(() => {
    const ps = Array.from(document.querySelectorAll('ul li p'));

    for (const p of ps) {
      const strong = p.querySelector('strong');
      if (!strong) continue;

      const label = strong.textContent?.trim().toLowerCase();
      if (label === 'alkoholindhold:' || label === 'alkoholindhold') {
        const span = p.querySelector('span');
        if (!span) return null;

        let text = span.textContent.trim();

        // Normalize Danish decimal
        text = text.replace(',', '.');

        // Accept: <0.5%, 0%, 0.0%, 0.5%
        const match = text.match(/<?\s*\d+(\.\d+)?\s*%/);
        return match ? match[0].replace(/\s+/g, '') : null;
      }
    }
    return null;
  }).catch(() => null);

  if (abv) {
    product.abv = abv;
  } else {
    // Non-alcoholic shop fallback
    product.abv = product.abv || '< 0.5%';
  }

  return product;
}
