// services/refiners/sites/sansdrinks.com.au.js
export default async function refine(rootUrl, product, page) {
  product.energy = await page.evaluate(() => {
    const th = Array.from(document.querySelectorAll("th")).find(el => el.textContent.includes("Calories"));
    return th ? th.nextElementSibling?.textContent?.trim() ?? null : null;
  }).catch(() => null);

  product.sugars = await page.evaluate(() => {
    const th = Array.from(document.querySelectorAll("th")).find(el => el.textContent.includes("Sugar"));
    return th ? th.nextElementSibling?.textContent?.trim() ?? null : null;
  }).catch(() => null);

  product.abv = product.abv || await page.evaluate(() => {
    const th = Array.from(document.querySelectorAll("th")).find(el => el.textContent.includes("ABV"));
    return th ? th.nextElementSibling?.textContent?.trim() ?? null : null;
  }).catch(() => null);

  const productDataArray = await page.evaluate(() => {
    const scriptTags = Array.from(document.querySelectorAll("script.tpt-seo-schema"));
    const data = [];
    scriptTags.forEach(scriptTag => {
      const scriptContent = scriptTag.textContent || "";
      const match = scriptContent.match(/var preAsssignedValue = ({[\s\S]*?});/);
      if (match && match[1]) {
        try {
          // eslint-disable-next-line no-eval
          const parsedData = eval("(" + match[1] + ")");
          data.push(parsedData);
        } catch {}
      }
    });
    return data;
  });

  if (Array.isArray(productDataArray) && productDataArray.length > 0) {
    for (const data of productDataArray) {
      product.producer = data["product.vendor"] || product.producer || null;
    }
  }

  product.vegan = product.vegan && /vegan/i.test(product.vegan) ? "Vegan" : null;
  product.gluten_free = product.gluten_free && /glutten/i.test(product.gluten_free) ? "gluten_free" : null;

  return product;
}


