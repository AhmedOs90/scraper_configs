function clean(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePrice(raw) {
  const text = clean(raw);
  if (!text) return null;

  const match = text.match(/(\d[\d,]*\.\d{2}|\d[\d,]*)/);
  if (!match?.[1]) return null;
  return match[1].replace(/,/g, "");
}

export default async function refine(rootUrl, product, page) {
  const scraped = await page.evaluate(() => {
    const norm = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

    const findLabeledValue = (labelWanted) => {
      const wanted = labelWanted.toLowerCase();
      const boxes = Array.from(document.querySelectorAll("main div[class*='_box_'], div[class*='_box_']"));

      for (const box of boxes) {
        const label = norm(box.querySelector("h2")?.textContent || "").toLowerCase();
        if (!label || label !== wanted) continue;

        const divs = Array.from(box.querySelectorAll("div"))
          .map((el) => norm(el.textContent))
          .filter(Boolean);
        if (divs.length) return divs[divs.length - 1];
      }
      return null;
    };

    return {
      brand: findLabeledValue("Brand"),
    };
  }).catch(() => ({ brand: null }));

  if (scraped.brand && !product.producer) {
    product.producer = clean(scraped.brand);
  }

  const fixedPrice = normalizePrice(product.price);
  if (fixedPrice) product.price = fixedPrice;

  if (!product.currency || !clean(product.currency)) {
    product.currency = "CAD";
  }

  if (product.name) product.name = clean(product.name);
  if (product.description) product.description = clean(product.description);

  return product;
}
