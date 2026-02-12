export default async function refine(rootUrl, product, page) {
    product.country = "France";
    product.producer = "Moderato";
    product.price = product.price.replace(',', '.');

    const { energy, sugar } = await page.evaluate(() => {
        
        const text = document.body.innerText;
        const energyMatch = text.match(/Energy[:\s]+([\d]+)\s*kJ/i);
        const sugarMatch = text.match(/including sugars\s*([\d.]+)\s*g/i);

        return {
            energy: energyMatch ? energyMatch[1] + " kJ" : null,
            sugar: sugarMatch ? sugarMatch[1] + " g" : null,
        };
    
    });

    product.energy = energy;
    product.sugar = sugar;
    return product;
}