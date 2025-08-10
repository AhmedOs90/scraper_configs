// services/refiners/sites/upsidedrinks.com.js
export default async function refine(rootUrl, product, page) {
  if (product.price) {
    const num = parseFloat(String(product.price).replace(/[^0-9]/g, ''));
    if (!Number.isNaN(num)) product.price = (num / 100).toString();
  }

  product.abv = product.abv || await page.evaluate(() => {
    const paragraphs = document.querySelectorAll('p');
    for (const p of paragraphs) {
      const strong = p.querySelector('strong');
      if (strong && strong.textContent?.trim().toLowerCase().startsWith('alcohol')) {
        const span = p.querySelector('span');
        if (span) return span.textContent.trim();
        const textAfterStrong = p.textContent.replace(strong.textContent, '').trim();
        return textAfterStrong || null;
      }
    }
    return null;
  }).catch(() => null);

  // Brand via Product JSON-LD
  product.producer = product.producer || await page.evaluate(() => {
    const script = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .find(s => (s.textContent || '').includes('"@type": "Product"'));
    if (!script) return null;
    try {
      const data = JSON.parse(script.textContent || '{}');
      return data.brand || null;
    } catch { return null; }
  }).catch(() => null);

  product.currency = product.currency || "USD";
  return product;
}
