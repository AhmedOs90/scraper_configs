export default async function refine(rootUrl, product, page) {
    product.country = 'Denmark';
    product.currency = 'DKK';
    product.name = product.name.replace(' - Gourmetsaft', '').trim();

    product.description = product.description
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    product.price = product.price
        .replace(/[^\d,.,]/g, '')
        .replace(/,+/g, ',')
        .replace(/\.(?=.*\.)/g, '')
        .replace(',', '.')
        .replace(/\.$/, '')
        .trim();

    const data = await page.evaluate((productName) => {
        const decode = (html) => html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<\/div>/gi, '\n')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&amp;/gi, '&')
            .replace(/[\u2000-\u200F\u2028-\u202F\u205F\u2060\uFEFF]/g, ' ')
            .replace(/[ \t]+/g, ' ')
            .replace(/[ ]*\n[ ]*/g, '\n')
            .replace(/\n{2,}/g, '\n')
            .trim();

        const normalize = (str) => (str || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/&/g, ' og ')
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const getMatch = (text, patterns) => {
            for (const regex of patterns) {
                const match = text.match(regex);
                if (match) return match[1].replace(/\s+/g, ' ').trim();
            }
            return null;
        };

        const pickEnergy = (text) => {
            const patterns = [
                /Energi[:\s]+(\d+\s*kJ)\b/i,
                /Energi[:\s]+(?:\d+\s*kcal\s*\/\s*)?(\d+\s*kJ)\b/i,
                /Energi[:\s]+(\d+\s*kJ)\s*\/\s*\d+\s*kcal\b/i,
                /Energi[:\s]+(\d+\s*kj)\b/i
            ];

            for (const regex of patterns) {
                const match = text.match(regex);
                if (match) return match[1].replace(/\bkj\b/i, 'kJ').replace(/\s+/g, ' ').trim();
            }

            return null;
        };

        const parseIngredients = (sectionText) => {
            const match = sectionText.match(
                /(?:^|\n)\s*(?:INGREDIENSER)\s*:?\s*([\s\S]*?)(?:\n\s*(?:NÆRINGSVÆRDIER)\b|$)/i
            );

            if (!match) return [];

            return match[1]
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .filter((line) => !/^(?:pr\.?\s*100\s*ml|næringsdeklaration(?:er)? pr\.?\s*100\s*ml)$/i.test(line));
        };

        const parseAbv = (text) => {
            const patterns = [
                /Alkohol\s*\(([\d.,]+)\s*%\)/i,
                /\b([\d.,]+)\s*%\s*alkohol\b/i
            ];

            for (const regex of patterns) {
                const match = text.match(regex);
                if (match) return match[1].trim();
            }

            return null;
        };

        const extractNutrition = (text) => ({
            energy: pickEnergy(text),
            fat: getMatch(text, [
                /Samlet fedt[:\s]+([<>]?\s*[\d.,]+\s*g)\b/i,
                /Fedt[:\s]+([<>]?\s*[\d.,]+\s*g)\b/i
            ]),
            carbohydrates: getMatch(text, [
                /Kulhydrat[:\s]+([\d.,]+\s*g)\b/i
            ]),
            sugar: getMatch(text, [
                /Sukker[:\s]+([\d.,]+\s*g)\b/i,
                /sukkerarter[:\s]+([\d.,]+\s*g)\b/i
            ]),
            protein: getMatch(text, [
                /Protein[:\s]+([<>]?\s*[\d.,]+\s*g)\b/i
            ]),
            salt: getMatch(text, [
                /Salt[:\s]+([<>]?\s*[\d.,]+\s*g)\b/i
            ])
        });

        const scoreSection = (sectionText, normalizedProductName) => {
            const normalizedSection = normalize(sectionText);
            if (!normalizedSection) return 0;

            let score = 0;

            if (normalizedSection.includes(normalizedProductName)) {
                score += 100;
            }

            const nameWords = normalizedProductName.split(' ').filter((x) => x.length > 2);
            const matchedWords = nameWords.filter((word) => normalizedSection.includes(word)).length;
            score += matchedWords * 10;

            if (/(?:^|\n)\s*(?:ingredienser)\s*:?/i.test(sectionText)) score += 5;
            if (/(?:^|\n)\s*(?:næringsværdier)\b/i.test(sectionText)) score += 5;

            return score;
        };

        const splitIntoSections = (text) => {
            const lines = text.split('\n').map((x) => x.trim()).filter(Boolean);
            const sections = [];
            let current = [];

            const isDivider = (line) => /^[-–—]+$/.test(line);
            const isLikelyHeading = (line) => {
                if (!line || line.length < 4) return false;
                if (/^(?:INGREDIENSER|NÆRINGSVÆRDIER|pr\.?\s*100\s*ml|næringsdeklaration(?:er)? pr\.?\s*100\s*ml)$/i.test(line)) {
                    return false;
                }

                const lettersOnly = line.replace(/[^A-Za-zÀ-ÿÆØÅæøå0-9 ]/g, '').trim();
                if (!lettersOnly) return false;

                const upperRatio = lettersOnly.replace(/[^A-ZÀ-ÞÆØÅ0-9 ]/g, '').length / lettersOnly.length;
                return upperRatio > 0.6 && lettersOnly.length >= 8;
            };

            for (const line of lines) {
                if (isDivider(line)) continue;

                if (isLikelyHeading(line) && current.length) {
                    sections.push(current.join('\n').trim());
                    current = [line];
                    continue;
                }

                current.push(line);
            }

            if (current.length) {
                sections.push(current.join('\n').trim());
            }

            return sections.filter(Boolean);
        };

        const tab = document.querySelector('.elementor-tab-content[data-tab="1"]');
        const fullText = tab ? decode(tab.innerHTML || '') : '';
        const normalizedProductName = normalize(productName);
        const sections = splitIntoSections(fullText);

        let targetText = fullText;

        if (sections.length > 1) {
            const ranked = sections
                .map((section) => ({
                    section,
                    score: scoreSection(section, normalizedProductName)
                }))
                .sort((a, b) => b.score - a.score);

            if (ranked[0] && ranked[0].score > 0) {
                targetText = ranked[0].section;
            }
        }

        const ingredients = parseIngredients(targetText);
        const abv = parseAbv(targetText);
        const nutrition = extractNutrition(targetText);

        return {
            abv,
            ingredients,
            energy: nutrition.energy,
            fat: nutrition.fat,
            carbohydrates: nutrition.carbohydrates,
            sugar: nutrition.sugar,
            protein: nutrition.protein,
            salt: nutrition.salt
        };
    }, product.name);

    product.abv = data.abv;
    product.energy = data.energy;
    product.sugar = data.sugar;

    product.extras = {
        ...product.extras,
        ingredients: data.ingredients,
        fat: data.fat,
        carbohydrates: data.carbohydrates,
        protein: data.protein,
        salt: data.salt
    };
    return product;
}