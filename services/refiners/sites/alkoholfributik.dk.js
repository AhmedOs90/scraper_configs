// services/refiners/sites/alkoholfributik.dk.js

function extractAbvFromText(text) {
  if (!text) return null;
  const haystack = String(text);

  // 1) Look for patterns like "0.5 %", "0.0%", "5,0 %"
  const percentMatch = haystack.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (percentMatch) {
    let numStr = percentMatch[1].replace(',', '.');
    const num = parseFloat(numStr);

    if (!Number.isNaN(num) && num >= 0 && num <= 50) {
      // Return the original matched substring (normalized spacing)
      return `${num}%`;
    }
  }

  // 2) If no explicit "%" found, but we see "0,0" or "0.0"
  const zeroMatch = haystack.match(/\b0[.,]0\b/);
  if (zeroMatch) {
    // Site is alcohol-free, treat 0,0 as 0.0% ABV
    return '0.0%';
  }

  return null;
}

export default async function refine(rootUrl, product, page) {
  // --- ABV: try old table first (in case any pages still use it) ---
  const abvFromTable = await page
    .evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.table-data-sheet tr'));
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (
          cells.length === 2 &&
          cells[0].textContent.trim().includes('Alkoholindhold')
        ) {
          return cells[1].textContent.trim();
        }
      }
      return null;
    })
    .catch(() => null);

  if (abvFromTable) {
    product.abv = abvFromTable;
  } else {
    // Fallback: extract from product name or description
    let abv =
      extractAbvFromText(product.name) ||
      extractAbvFromText(product.description);

    // If still nothing, default to "< 0.5%"
    product.abv = abv || '< 0.5%';
  }

  // --- Energy (keep old logic) ---
  product.energy = await page
    .evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.table-data-sheet tr'));
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (
          cells.length === 2 &&
          cells[0].textContent.trim().includes('Kalorier')
        ) {
          return cells[1].textContent.trim();
        }
      }
      return null;
    })
    .catch(() => null);

  // --- Sugar (keep old logic) ---
  product.sugar = await page
    .evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.table-data-sheet tr'));
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (
          cells.length === 2 &&
          cells[0].textContent.trim().includes('Heraf sukkerarter')
        ) {
          return cells[1].textContent.trim();
        }
      }
      return null;
    })
    .catch(() => null);

  return product;
}
