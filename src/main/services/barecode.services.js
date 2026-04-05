const bwipjs = require('bwip-js');

/**
 * Génère un code-barre unique
 * Format: INV-YYYYMMDD-XXXXX (ex: INV-20250328-04231)
 */
function generateBarcode() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `INV-${date}-${rand}`;
}

/**
 * Rend un code-barre CODE128 en PNG (Buffer)
 * bwip-js = pur JavaScript, aucun binding natif
 *
 * @param {string} code — valeur à encoder
 * @returns {Promise<Buffer>} — PNG buffer
 */
async function renderBarcodeImage(code) {
  return await bwipjs.toBuffer({
    bcid:        'code128',
    text:        code,
    scale:       2,        // facteur d'échelle (2 = 2x résolution)
    height:      12,       // hauteur en mm
    includetext: true,     // affiche le texte sous le barcode
    textxalign:  'center',
    textsize:    10,
  });
}

module.exports = { generateBarcode, renderBarcodeImage };