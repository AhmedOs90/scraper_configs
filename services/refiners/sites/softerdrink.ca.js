// services/refiners/sites/softerdrink.ca.js
export default async function refine(rootUrl, product, page) {
  // Normalize price like AF (keep as numeric string)
  if (product.price != null) {
    product.price = String(product.price).replace(/[^\d.]/g, "");
  }

  // Read embedded Shopify JSON to extract vendor -> producer and currency
  const storeData = await page.evaluate(() => {
    const el = document.querySelector('#tpo-store-data[type="application/json"]');
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch { return null; }
  });

  // Producer from vendor
  if (storeData?.product?.vendor) {
    product.producer = storeData.product.vendor.trim();
  }

  // Currency from shop.money_with_currency_format e.g. "${{amount}} CAD"
  if (storeData?.shop?.money_with_currency_format) {
    const m = storeData.shop.money_with_currency_format.match(/\b([A-Z]{3})\b/);
    if (m) product.currency = m[1];
  }

  // Country hint (CAD → CA) if not already set
  if (!product.country && product.currency === "CAD") {
    product.country = "CA";
  }

  // Nothing specific for energy on softerdrink.ca; leave as-is
  return product;
}
