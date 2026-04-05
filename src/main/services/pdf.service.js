const PDFDocument = require('pdfkit');
const path        = require('path');
const fs          = require('fs');
const { app }     = require('electron');

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('fr-FR');
}

function formatMoney(v) {
  if (!v) return '—';
  return Number(v).toLocaleString('fr-DZ') + ' DA';
}

// Dessine une ligne de tableau
function tableRow(doc, cols, y, widths, opts = {}) {
  const { fill = null, textColor = '#1e1e2e', fontSize = 9 } = opts;
  let x = 40;
  if (fill) {
    doc.rect(x, y, widths.reduce((a, b) => a + b, 0), 18).fill(fill).fillColor(textColor);
  }
  doc.fontSize(fontSize).fillColor(textColor);
  cols.forEach((text, i) => {
    doc.text(String(text ?? '—'), x + 4, y + 5, { width: widths[i] - 6, ellipsis: true });
    x += widths[i];
  });
}

// En-tête de page commune
function pageHeader(doc, title, subtitle) {
  doc.rect(0, 0, doc.page.width, 60).fill('#4f46e5');
  doc.fontSize(18).fillColor('#ffffff').text(title, 40, 18);
  if (subtitle) {
    doc.fontSize(9).fillColor('#c7d2fe').text(subtitle, 40, 40);
  }
  doc.fillColor('#1e1e2e');
  return 75;
}

// ── Export inventaire ──────────────────────────────────────────────────────

/**
 * Génère un PDF d'inventaire
 * @param {object[]} articles
 * @param {object}   filters  — { departement, etat }
 * @returns {string} chemin du fichier généré
 */
async function generateInventairePDF(articles, filters = {}) {
  const doc      = new PDFDocument({ margin: 0, size: 'A4', layout: 'landscape' });
  const filename = `inventaire_${Date.now()}.pdf`;
  const outPath  = path.join(app.getPath('downloads'), filename);
  const stream   = fs.createWriteStream(outPath);

  doc.pipe(stream);

  // En-tête
  const subtitle = [
    filters.departement ? `Département : ${filters.departement}` : 'Tous les départements',
    filters.etat        ? `État : ${filters.etat}`               : '',
    `Édité le ${formatDate(new Date())} — ${articles.length} article(s)`,
  ].filter(Boolean).join('  ·  ');

  let y = pageHeader(doc, 'Inventaire Physique', subtitle);

  // En-tête tableau
  const widths = [110, 160, 90, 80, 80, 70, 80];
  const headers = ['Code-barre', 'Désignation', 'Marque/Modèle', 'Catégorie', 'Département', 'État', 'Valeur (DA)'];

  tableRow(doc, headers, y, widths, { fill: '#eef2ff', textColor: '#3730a3', fontSize: 9 });
  y += 18;

  // Lignes
  articles.forEach((a, i) => {
    if (y > doc.page.height - 40) {
      doc.addPage({ margin: 0, size: 'A4', layout: 'landscape' });
      y = pageHeader(doc, 'Inventaire Physique', subtitle);
      tableRow(doc, headers, y, widths, { fill: '#eef2ff', textColor: '#3730a3', fontSize: 9 });
      y += 18;
    }

    const fill = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    tableRow(doc, [
      a.code_barre,
      a.designation,
      [a.marque, a.modele].filter(Boolean).join(' ') || '—',
      a.categorie    || '—',
      a.departement  || '—',
      a.etat         || '—',
      formatMoney(a.valeur_achat),
    ], y, widths, { fill, fontSize: 8 });
    y += 18;
  });

  // Total valeur
  const total = articles.reduce((s, a) => s + (a.valeur_achat || 0), 0);
  y += 6;
  doc.fontSize(9).fillColor('#1e1e2e')
    .text(`Valeur totale : ${formatMoney(total)}`, 40, y, { align: 'right', width: widths.reduce((a, b) => a + b, 0) - 10 });

  doc.end();
  await new Promise((res, rej) => { stream.on('finish', res); stream.on('error', rej); });
  return outPath;
}

// ── Export décharge ────────────────────────────────────────────────────────

/**
 * Génère le PDF d'une décharge
 * @param {object} decharge — objet complet avec .articles[]
 * @returns {string} chemin du fichier généré
 */
async function generateDechargePDF(decharge) {
  const doc      = new PDFDocument({ margin: 0, size: 'A4' });
  const filename = `decharge_${decharge.numero}_${Date.now()}.pdf`;
  const outPath  = path.join(app.getPath('downloads'), filename);
  const stream   = fs.createWriteStream(outPath);

  doc.pipe(stream);

  // En-tête
  let y = pageHeader(doc, `Décharge ${decharge.numero}`, `Émis le ${formatDate(decharge.date_decharge)}`);

  // Infos décharge
  const infoY = y;
  doc.fontSize(9).fillColor('#6b7280').text('Département source', 40, infoY);
  doc.fontSize(11).fillColor('#1e1e2e').text(
    `${decharge.dept_source_code} — ${decharge.dept_source_nom}`, 40, infoY + 12
  );

  doc.fontSize(9).fillColor('#6b7280').text('Département destination', 300, infoY);
  doc.fontSize(11).fillColor('#1e1e2e').text(
    `${decharge.dept_dest_code} — ${decharge.dept_dest_nom}`, 300, infoY + 12
  );

  y = infoY + 36;

  doc.fontSize(9).fillColor('#6b7280').text('Émetteur', 40, y);
  doc.fontSize(10).fillColor('#1e1e2e').text(decharge.emetteur || '—', 40, y + 12);

  doc.fontSize(9).fillColor('#6b7280').text('Récepteur', 300, y);
  doc.fontSize(10).fillColor('#1e1e2e').text(decharge.recepteur || '—', 300, y + 12);

  if (decharge.motif) {
    doc.fontSize(9).fillColor('#6b7280').text('Motif', 40, y + 30);
    doc.fontSize(10).fillColor('#1e1e2e').text(decharge.motif, 40, y + 42);
    y += 30;
  }

  y += 50;

  // Ligne séparatrice
  doc.moveTo(40, y).lineTo(555, y).strokeColor('#e2e6ea').stroke();
  y += 10;

  // Tableau articles
  doc.fontSize(11).fillColor('#1e1e2e').text('Articles transférés', 40, y);
  y += 16;

  const widths = [130, 160, 100, 100, 60];
  const headers = ['Code-barre', 'Désignation', 'Marque/Modèle', 'N° Série', 'État'];

  tableRow(doc, headers, y, widths, { fill: '#eef2ff', textColor: '#3730a3', fontSize: 9 });
  y += 18;

  (decharge.articles || []).forEach((a, i) => {
    if (y > doc.page.height - 120) {
      doc.addPage({ margin: 0, size: 'A4' });
      y = 40;
      tableRow(doc, headers, y, widths, { fill: '#eef2ff', textColor: '#3730a3', fontSize: 9 });
      y += 18;
    }
    const fill = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    tableRow(doc, [
      a.code_barre,
      a.designation,
      [a.marque, a.modele].filter(Boolean).join(' ') || '—',
      a.numero_serie || '—',
      a.etat,
    ], y, widths, { fill, fontSize: 8 });
    y += 18;
  });

  // Zone signatures
  y = Math.max(y + 40, doc.page.height - 160);

  doc.moveTo(40, y).lineTo(555, y).strokeColor('#e2e6ea').stroke();
  y += 16;

  doc.fontSize(9).fillColor('#6b7280');
  doc.text('Signature émetteur', 40,  y);
  doc.text('Signature récepteur', 350, y);

  doc.rect(40,  y + 14, 180, 50).strokeColor('#cbd5e1').stroke();
  doc.rect(350, y + 14, 180, 50).strokeColor('#cbd5e1').stroke();

  doc.fontSize(8).fillColor('#9ca3af');
  doc.text(decharge.emetteur  || '', 40,  y + 54);
  doc.text(decharge.recepteur || '', 350, y + 54);

  doc.end();
  await new Promise((res, rej) => { stream.on('finish', res); stream.on('error', rej); });
  return outPath;
}

module.exports = { generateInventairePDF, generateDechargePDF };