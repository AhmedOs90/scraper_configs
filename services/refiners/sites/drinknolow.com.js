// services/refiners/sites/drinknolow.com.js

export default async function refine(rootUrl, product, page) {
  // Brand from #viewed_product
  product.producer = await page.evaluate(() => {
    const scriptTag = document.querySelector("#viewed_product");
    if (!scriptTag) return null;
    const content = scriptTag.textContent || "";
    const match = content.match(/Brand:\s*"([^"]+)"/);
    return match ? match[1] : null;
  });

  // Vegan / gluten-free flags from metafields
  const flags = await page.evaluate(() => {
    const spans = document.querySelectorAll("span.metafield-multi_line_text_field");
    if (!spans.length) return { vegan: false, glutenfree: false };
    const text = Array.from(spans).map(s => s.innerText).join(" ").toLowerCase();
    return { vegan: text.includes("vegan"), glutenfree: text.includes("gluten") };
  });

  product.vegan = flags.vegan ? "Vegan" : product.vegan || null;
  product.gluten_free = flags.glutenfree ? "Gluten free" : product.gluten_free || null;

  return product;
}
