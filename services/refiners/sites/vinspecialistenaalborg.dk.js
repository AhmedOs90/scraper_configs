// services/refiners/sites/vinspecialistenaalborg.dk.js

export default async function refine(rootUrl, product, page) {

  /**
   * ====================
   * ABV — from product name
   * ====================
   * Example:
   * "Torres, Natureo Rosé, Cabernet Sauvignon, 0.75 l. – 0.0%"
   */
  if (product.name) {
    const match = product.name.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (match) {
      // Normalize Danish / EU decimal
      product.abv = `${match[1].replace(',', '.')}%`;
    } else {
      product.abv = null;
    }
  } else {
    product.abv = null;
  }

  return product;
}

