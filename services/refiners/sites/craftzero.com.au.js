// services/refiners/sites/craftzero.com.au.js
export default async function refine(rootUrl, product, page) {
  const pickDisclosure = async (label) => {
    return page.evaluate((lbl) => {
      const els = document.querySelectorAll('.product-info-accordion .disclosure__title .with-icon__beside');
      for (const el of els) {
        if (el.textContent?.trim() === lbl) {
          const content = el.closest('details')?.querySelector('.disclosure__content p');
          return content?.textContent?.trim() || null;
        }
      }
      return null;
    }, label).catch(() => null);
  };

  product.abv     = product.abv     || await pickDisclosure('ABV');
  product.country = product.country || await pickDisclosure('Country of Origin');

  // Site shows “Nutritional Info Per 100ml” as a blob; store as-is
  const nutr = await pickDisclosure('Nutritional Info Per 100ml');
  product.energy = product.energy || nutr || null;
  product.sugar = product.sugar || nutr || null;

  return product;
}
