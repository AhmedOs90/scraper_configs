import stringSimilarity from 'string-similarity';


export function filterProducts(products) {
  const blacklistedCategories = ['tea', 'soda water', 'coffee', 'can opener', 'gift card'];
  const blacklistedKeywords = ['multiple packs', 'mixed case', 'discovery box', 'set', 'box', 'packs'];
  const abvThreshold = 1.2;

  const accepted = [];
  const rejected = [];
  const needMoreInvestigation = [];

  products.forEach((product) => {
    const { abv, category, name, description } = product;
    const lowerName = (name || "").toLowerCase();
    const lowerDesc = (description || "").toLowerCase();
    const combinedText = `${lowerName} ${lowerDesc}`;

    // Parse ABV using the new function
    const parsedABV = parseABV(abv);

    // Initialize reason for investigation or rejection
    let reason = '';

    // Check reject criteria
    if (parsedABV && parsedABV > abvThreshold) {
      reason = `ABV exceeds the threshold (${abvThreshold}%)`;
    } else if (blacklistedCategories.some((cat) => combinedText.includes(cat.toLowerCase()))) {
      reason = `Blacklisted category found in name/description`;
    } else if (blacklistedKeywords.some((kw) => combinedText.includes(kw))) {
      reason = `Blacklisted keyword found in name/description`;
    }

    if (reason) {
      product.reason = reason; // Add reason to product
      rejected.push(product);
    }
    // Check accept criteria
    else if (
      category &&
      !blacklistedCategories.includes(category.toLowerCase()) &&
      parsedABV !== null &&
      parsedABV <= abvThreshold
    ) {
      accepted.push(product);
    }
    // Otherwise, needs more investigation
    else {
      reason = `Missing or unclear category/ABV`;
      product.reason = reason; // Add reason to product
      needMoreInvestigation.push(product);
    }
  });

  return { accepted, rejected, needMoreInvestigation };
}



function parseABV(abvText) {
  if (!abvText) return null;

  // Convert to lowercase for consistency
  const lowerAbv = abvText.toLowerCase();

  // Look for phrases like "less than" or "<" and convert them to an approximate value
  if (lowerAbv.includes('less than') || lowerAbv.includes('<')) {
    const match = lowerAbv.match(/(\d+(\.\d+)?)/); // Find numeric value
    return match ? parseFloat(match[1]) : null;
  }

  // Use regex to extract the first numeric value in the text
  const match = lowerAbv.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}



function calculateSimilarity(a, b) {
  if (!a || !b) return 0;
  return stringSimilarity.compareTwoStrings(a.toLowerCase(), b.toLowerCase()) * 100;
}

export function findDuplication(newProduct, productList) {
  let bestMatch = null;
  let highestProbability = 0;

  const abvNew = parseABV(newProduct.abv);

  productList.forEach((existingProduct) => {
    const abvExisting = parseABV(existingProduct.abv);

    // Name similarity (60%)
    const nameSimilarity = calculateSimilarity(newProduct.name, existingProduct.name);

    // ABV similarity (20%)
    let abvSimilarity = 0;
    if (abvNew !== null && abvExisting !== null && Math.abs(abvNew - abvExisting) <= 0.1) {
      abvSimilarity = 100; // Treat as identical if within 0.1
    }

    // Producer similarity (10%)
    const producerSimilarity = calculateSimilarity(newProduct.producer, existingProduct.producer);

    // Category similarity (10%)
    const categorySimilarity = calculateSimilarity(newProduct.category, existingProduct.category);

    // Weighted probability score
    let probability =
      0.85 * (nameSimilarity / 100) +
      0.05 * (abvSimilarity / 100) +
      0.05 * (producerSimilarity / 100) +
      0.05 * (categorySimilarity / 100);

      probability *= 100; // Convert to percentage

    if (probability > highestProbability) {
      highestProbability = probability;
      bestMatch = existingProduct.name; // Use `name` to identify duplicates
    }
  });

  // Add duplication details to the new product
  newProduct.duplicateWith = highestProbability >= 80 ? bestMatch : null; // Add duplicateWith key
  newProduct.percentDuplication = highestProbability >= 80 ? highestProbability : null; // Add percentDuplication key

  return newProduct;
}