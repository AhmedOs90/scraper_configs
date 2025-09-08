// services/refiners/sites/minusmoonshine.com.js
export default async function refine(rootUrl, product, page) {
    let name = product.name || "";
    const m = name.match(/^(.+?)\s*[—–-]\s*(.+)$/);
    
    if (m) {
        product.producer = product.producer || m[1].trim();
        name = m[2].trim();
    }

    name = name.replace(/,\s*\d+.*$/i, "").trim();
    product.name = name;
    return product;
}
