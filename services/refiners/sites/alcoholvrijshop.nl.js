// services/refiners/sites/alcoholvrijshop.nl.js
export default async function refine(rootUrl, product, page) {
  product.energy = await page.evaluate(() => {
    const th = Array.from(document.querySelectorAll("th")).find(el => el.textContent.includes("Energie"));
    return th ? th.nextElementSibling?.textContent?.trim() ?? null : null;
  }).catch(() => null);

  product.sugar = await page.evaluate(() => {
    const th = Array.from(document.querySelectorAll("th")).find(el => el.textContent.includes("waarvan suikers"));
    return th ? th.nextElementSibling?.textContent?.trim() ?? null : null;
  }).catch(() => null);

  product.abv = product.abv || await page.evaluate(() => {
    const th = Array.from(document.querySelectorAll("th")).find(el => el.textContent.includes("Alcoholgehalte"));
    return th ? th.nextElementSibling?.textContent?.trim() ?? null : null;
  }).catch(() => null);

  product.producer = product.producer || await page.evaluate(() => {
    const th = Array.from(document.querySelectorAll("th")).find(el => el.textContent.includes("Merk"));
    return th ? th.nextElementSibling?.textContent?.trim() ?? null : null;
  }).catch(() => null);

  return product;
}
