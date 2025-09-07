export default async function refine(rootUrl, product, page) {
  // Tags from window.Rivo
  const tags = await page.evaluate(() => window?.Rivo?.common?.product?.tags || []);

  // ABV (first tag containing "abv", stored as-is)
  const abvTag = tags.find(t => t.toLowerCase().includes('abv'));
  if (abvTag) product.abv = abvTag;

  // Vegan / Gluten-Free flags
  if (tags.some(t => t.toLowerCase() === 'vegan')) product.vegan = 'Vegan';
  if (tags.some(t => t.toLowerCase() === 'gluten-free')) product.gluten_free = 'Gluten free';

  // Brand from #viewed_product
  product.producer = await page.evaluate(() => {
    const scriptTag = document.querySelector('#viewed_product');
    if (!scriptTag) return null;
    const content = scriptTag.textContent || '';
    const match = content.match(/Brand:\s*"([^"]+)"/);
    return match ? match[1] : null;
  });

  // Sugar & Energy from the collapsible nutrition block
  const nutrition = await page.evaluate(() => {
    // Grab the first block that contains the rich text nutrition details
    const el = document.querySelector('.product-tabs__tab-item-content .metafield-rich_text_field');
    if (!el) return { sugar: null, energy: null };

    const text = el.innerText.replace(/\s+/g, ' ').trim();

    // Sugar: capture values like "< 1g", "1 g", "1.5g"
    const sugarMatch = text.match(/Total\s*Sugars?\s*:?\s*([<≈]?\s*\d+(\.\d+)?\s*g)/i);

    // Energy: try Calories first (e.g., "Calories 20"), then kJ/kcal phrases if present
    const caloriesMatch = text.match(/Calories?\s*([<≈]?\s*\d+(\.\d+)?)/i);
    const kjMatch = text.match(/(\d+(\.\d+)?)\s*k[jJ]/);
    const kcalWordMatch = text.match(/(\d+(\.\d+)?)\s*k?cal/i);

    let energy = null;
    if (caloriesMatch) {
      energy = `${caloriesMatch[1]} kcal`;
    } else if (kcalWordMatch) {
      energy = `${kcalWordMatch[1]} kcal`;
    } else if (kjMatch) {
      energy = `${kjMatch[1]} kJ`;
    }

    return {
      sugar: sugarMatch ? sugarMatch[1].replace(/\s+/g, ' ').trim() : null,
      energy: energy ? energy.replace(/\s+/g, ' ').trim() : null,
    };
  });

  if (nutrition.sugar) product.sugar = nutrition.sugar;     // e.g., "< 1g"
  if (nutrition.energy) product.energy = nutrition.energy;   // e.g., "20 kcal" or "173 kJ"

  return product;
}