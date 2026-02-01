export default async function refine(rootUrl, product, page) {
  // Store country (optional)
  product.country = product.country || "Denmark";

  //

  // Producer/brand from ShopifyAnalytics "Viewed Product" payload
  // Example contains: ..."brand":"La Baume",...
  const brand = await page.evaluate(() => {
    const s = document.querySelector("script.analytics")?.textContent || "";
    if (!s) return null;

    // "brand":"..."
    let m = s.match(/"brand"\s*:\s*"([^"]+)"/);
    if (m?.[1]) return m[1].trim();

    // fallback: 'brand':'...'
    m = s.match(/['"]brand['"]\s*:\s*['"]([^'"]+)['"]/);
    if (m?.[1]) return m[1].trim();

    return null;
  }).catch(() => null);

  if (brand) product.producer = product.producer || brand;

  return product;
}
