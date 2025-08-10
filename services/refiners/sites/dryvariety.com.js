// services/refiners/sites/dryvariety.com.js
export default async function refine(rootUrl, product, page) {
  const text = product.abv || product.description || "";

  const abvMatch    = text.match(/Alcohol[:\s]*(.*)/i);
  const energyMatch = text.match(/Energy[:\s]*(.*)/i);
  const sugarsMatch = text.match(/sugars[:\s]*(.*)/i);

  if (!product.abv && abvMatch)    product.abv = abvMatch[1].trim();
  if (!product.energy && energyMatch) product.energy = energyMatch[1].trim();
  if (!product.sugars && sugarsMatch) product.sugars = sugarsMatch[1].trim();

  return product;
}
