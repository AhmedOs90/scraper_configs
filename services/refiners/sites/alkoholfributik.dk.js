// services/refiners/sites/alkoholfributik.dk.js
export default async function refine(rootUrl, product, page) {
  product.abv = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll(".table-data-sheet tr"));
    for (const row of rows) {
      const cells = row.querySelectorAll("td");
      if (cells.length === 2 && cells[0].textContent.trim().includes("Alkoholindhold")) {
        return cells[1].textContent.trim();
      }
    }
    return null;
  }).catch(() => null);

  product.energy = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll(".table-data-sheet tr"));
    for (const row of rows) {
      const cells = row.querySelectorAll("td");
      if (cells.length === 2 && cells[0].textContent.trim().includes("Kalorier")) {
        return cells[1].textContent.trim();
      }
    }
    return null;
  }).catch(() => null);

  product.sugars = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll(".table-data-sheet tr"));
    for (const row of rows) {
      const cells = row.querySelectorAll("td");
      if (cells.length === 2 && cells[0].textContent.trim().includes("Heraf sukkerarter")) {
        return cells[1].textContent.trim();
      }
    }
    return null;
  }).catch(() => null);

  return product;
}
