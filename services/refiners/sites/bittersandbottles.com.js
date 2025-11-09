// services/refiners/sites/bittersandbottles.com.js
export default async function refine(rootUrl, product, page) {
  // Basic normalization
  product.price = product.price.replace('$', '').trim();
  product.currency = 'USD';
  product.country = 'USA';
  product.description = product.description.replace(/\s+/g, ' ').trim();

  // --- Extract categories from the inline script ---
  const categories = await page.evaluate(() => {
    const scriptTag = document.querySelector('#viewed_product');
    if (!scriptTag) return null;
    const content = scriptTag.textContent || '';
    const match = content.match(/Categories:\s*\[([^\]]+)\]/);
    if (!match) return null;
    const arrayString = match[1];
    const items = Array.from(arrayString.matchAll(/"([^"]+)"/g)).map(m => m[1]);
    return items;
  });

  product.categories = categories || [];

  // --- ABV inference logic ---
  if (Array.isArray(product.categories) && product.categories.length > 0) {
    const lowerCategories = product.categories.map(c => c.toLowerCase());
    const hasZero = lowerCategories.some(c => c.includes('zero'));
    if (hasZero) {
      product.abv = '0.0%';
    } else {
      product.abv = '<0.5%';
    }
  } else {
    product.abv = '<0.5%';
  }

  return product;
}
