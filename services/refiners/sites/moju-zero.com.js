// services/refiners/sites/moju-zero.com.js
export default async function refine(rootUrl, product, page) {
    product.country = "Netherlands";
    product.name = product.name
        .replace(' — MoJu-Zero', '')
        .trim();
    product.description = product.description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const extracted = await page.evaluate(() => {
        const blocks = [...document.querySelectorAll(".sqs-html-content")];

        const mainBlock = blocks.find(el =>
            /ingredients\s*\+?\s*nutritional facts/i.test(el.innerText)
        );

        const extraBlock = blocks.find(el =>
            /additional information/i.test(el.innerText)
        );

        const result = {
            ingredients: null,
            nutrition: {},
            extraInfo: {}
        };

        if (mainBlock) {
            const lines = mainBlock.innerText
                .split("\n")
                .map(l => l.replace(/\s+/g, " ").trim())
                .filter(Boolean);

            const idxIngredients = lines.findIndex(l =>
                /^Ingredients\s*:?\s*$/i.test(l) || /^Ingredients\s*:/i.test(l)
            );

            const idxNutrition = lines.findIndex(l =>
                /^Nutritional information per 100\s*ml:?/i.test(l) ||
                /^Nutritional information per 100ml:?/i.test(l)
            );

            if (idxIngredients !== -1) {
                const sameLine = lines[idxIngredients]
                    .replace(/^Ingredients\s*:\s*/i, "")
                    .trim();

                if (sameLine) {
                    result.ingredients = sameLine;
                } else if (idxNutrition > idxIngredients + 1) {
                    result.ingredients = lines
                        .slice(idxIngredients + 1, idxNutrition)
                        .join(" ")
                        .trim();
                }
            }

            const nutritionLines = idxNutrition !== -1
                ? lines.slice(idxNutrition + 1)
                : [];

            const joined = nutritionLines.join(" ");

            const pick = (regex) => joined.match(regex)?.[1] ?? null;

            const compactZero = /fat.*saturated fatty acids.*carbohydrates.*sugar.*protein.*salt\s*0g each/i.test(joined);

            const energyLine = nutritionLines.find(l => /^Energy\b/i.test(l));

            result.nutrition = {
                energy: energyLine
                    ?.replace(/^Energy\s*/i, "")
                    .replace(/,$/, "")
                    .trim() || null,
                carbohydrates: pick(/Carbohydrates\s*([0-9.,]+\s*[a-zA-Z]+)/i),
                sugar: pick(/sugar\s*([0-9.,]+\s*[a-zA-Z]+)/i),
                fat: pick(/Fat\s*([<]?\s*[0-9.,]+\s*[a-zA-Z]+)/i)?.replace(/\s+/g, " ") || null,
                saturated_fatty_acids: pick(/saturated fatty acids\s*([<]?\s*[0-9.,]+\s*[a-zA-Z]+)/i)?.replace(/\s+/g, " ") || null,
                protein: pick(/Protein\s*([<]?\s*[0-9.,]+\s*[a-zA-Z]+)/i)?.replace(/\s+/g, " ") || null,
                salt: pick(/Salt\s*([<]?\s*[0-9.,]+\s*[a-zA-Z]+)/i)?.replace(/\s+/g, "") || null,
            };

            if (compactZero) {
                result.nutrition.fat ??= "0g";
                result.nutrition.saturated_fatty_acids ??= "0g";
                result.nutrition.carbohydrates ??= "0g";
                result.nutrition.sugar ??= "0g";
                result.nutrition.protein ??= "0g";
                result.nutrition.salt ??= "0g";
            }
        }

        if (extraBlock) {
            const text = extraBlock.innerText;

            const pick = (regex) => text.match(regex)?.[1]?.trim() ?? null;

            result.extraInfo = {
                abv: pick(/Alcohol\s*([0-9.,]+\s*% ?vol\.?)/i),
                sugar: pick(/Residual Sugar\s*([0-9.,]+\s*[a-zA-Z/]+)/i),
                total_acid: pick(/Total Acid\s*([0-9.,]+\s*[a-zA-Z/]+)/i),
            };
        }

        return result;
    });

    product.energy = extracted.nutrition.energy;
    product.sugar = extracted.nutrition.sugar || extracted.extraInfo.sugar;
    product.abv = extracted.extraInfo.abv;

    product.extras = {
        ingredients: extracted.ingredients,
        fat: extracted.nutrition.fat,
        saturated_fatty_acids: extracted.nutrition.saturated_fatty_acids,
        carbohydrates: extracted.nutrition.carbohydrates,
        protein: extracted.nutrition.protein,
        salt: extracted.nutrition.salt,
        total_acid: extracted.extraInfo.total_acid
    };
    return product;
}