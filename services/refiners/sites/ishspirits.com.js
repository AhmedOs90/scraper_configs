// services/refiners/sites/ishspirits.com.js
export default async function refine(rootUrl, product, page) {
  product.producer = "Ish";
  product.country = "DK";
  product.currency = "KR"; // preserving your original logic

  product.energy = await page.evaluate(() => {
    const elements = document.querySelectorAll("span.metafield-multi_line_text_field");
    for (let el of elements) {
      if (el.textContent.includes("Energy:")) {
        return el.textContent.split("Energy:")[1].split("\n")[0].trim();
      }
    }
    return null;
  }).catch(() => null);

  product.sugars = await page.evaluate(() => {
    const elements = document.querySelectorAll("span.metafield-multi_line_text_field");
    for (let el of elements) {
      if (el.textContent.includes("of which sugars:")) {
        return el.textContent.split("of which sugars:")[1].split("\n")[0].trim();
      }
    }
    return null;
  }).catch(() => null);

  return product;
}
