
// Helper function to detect category
export function detectCategory(productName, productDescription, categories) {
  const lowerName = productName.toLowerCase();
  const lowerDescription = productDescription.toLowerCase();
  for (const category of categories) {
    if (lowerName.includes(category.toLowerCase()) || lowerDescription.includes(category.toLowerCase())) {
      return category;
    }
  }
  return "Other";
}

export const categories = [
  "Beer",
  "Wine",
  "Spirit",
  "RTD Cocktail",
  "Aperitif",
  "Sparkling Tea",
  "Kombucha",
  "Cider",
  "Mixer",
  "Other"
]
  ;

// Helper function to detect vegan and gluten-free in description
export function detectVeganAndgluten_free(description) {

  const isVegan = /vegan/i.test(description) ? "Vegan" : null;
  const isgluten_free = /gluten[-\s]*free/i.test(description) ? "Gluten free" : null;
  return { isVegan, isgluten_free };
}

// Helper function to check for "zero alcohol" in name or description
export function detectZeroAlcohol(name, description) {
  const isZeroAlcohol = /zero[-\s]*alcohol/i.test(name) || /zero[-\s]*alcohol/i.test(description) ||
    /non[-\s]*alcohol/i.test(name) || /non[-\s]*alcohol/i.test(description) || /alcohol[-\s]*free/i.test(name) || /alcohol[-\s]*free/i.test(description) ? "0.0 ABV" : null;
  return isZeroAlcohol;
}

export function extractABVFromText(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  const match = text.match(/(\d{1,2}[.,]\d{1,2})\s*%/); // e.g. 4.5%, 0,3 %
  if (match) {
    return match[1].replace(',', '.') + '%';
  }
  return null;
}
