// services/refiners/sites/boisson.co.js
export default async function refine(rootUrl, product, page) {
  product.abv = product.abv || await page.evaluate(() => {
    const body = document.querySelector('#description-1');
    if (!body) return null;
    const ps = Array.from(body.querySelectorAll('p'));
    for (const p of ps) {
      const label = (p.textContent || '').trim().toLowerCase();
      if (label.includes('alcohol by volume')) {
        const ul = p.nextElementSibling;
        if (ul && ul.tagName.toLowerCase() === 'ul') {
          const li = ul.querySelector('li');
          return li?.textContent?.trim() || null;
        }
      }
    }
    return null;
  }).catch(() => null);

  return product;
}
