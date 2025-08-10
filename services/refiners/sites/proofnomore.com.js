// services/refiners/sites/proofnomore.com.js

export default async function refine(rootUrl, product, page) {
  product.producer = await page.evaluate(() => {
    const scriptTag = document.querySelector("#viewed_product");
    if (!scriptTag) return null;
    const content = scriptTag.textContent || "";
    const match = content.match(/Brand:\s*"([^"]+)"/);
    return match ? match[1] : null;
  });
  return product;
}
