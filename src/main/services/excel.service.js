const XLSX    = require('xlsx');
const path    = require('path');
const { app } = require('electron');

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('fr-FR');
}

// Style cellule header
const HEADER_STYLE = {
  font:      { bold: true, color: { rgb: 'FFFFFF' } },
  fill:      { fgColor: { rgb: '4F46E5' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: {
    bottom: { style: 'thin', color: { rgb: 'C7D2FE' } },
  },
};

// Style ligne paire
const ROW_EVEN_STYLE = {
  fill: { fgColor: { rgb: 'F8FAFC' } },
};

/**
 * Applique les styles et largeurs à une worksheet
 * @param {object} ws       — worksheet XLSX
 * @param {string[]} headers — labels des colonnes
 * @param {number[]} widths  — largeurs en caractères
 */
function styleSheet(ws, headers, widths) {
  // Largeurs colonnes
  ws['!cols'] = widths.map(w => ({ wch: w }));

  // Style headers (ligne 1)
  headers.forEach((_, i) => {
    const cell = XLSX.utils.encode_cell({ r: 0, c: i });
    if (ws[cell]) ws[cell].s = HEADER_STYLE;
  });
}

// ── Export inventaire ──────────────────────────────────────────────────────

/**
 * Génère un fichier Excel d'inventaire complet
 * @param {object[]} articles
 * @param {object[]} depts    — pour la feuille résumé par département
 * @returns {string}          — chemin du fichier généré
 */
function generateInventaireExcel(articles, depts = []) {
  const wb = XLSX.utils.book_new();

  // ── Feuille 1 : Inventaire complet ──
  const headers1 = [
    'Code-barre', 'Désignation', 'Marque', 'Modèle',
    'Catégorie', 'Département', 'État',
    'N° Série', 'Date acquisition', 'Valeur achat (DA)', 'Notes',
  ];

  const rows1 = articles.map(a => [
    a.code_barre,
    a.designation,
    a.marque           || '',
    a.modele           || '',
    a.categorie        || '',
    a.departement      || '',
    a.etat             || '',
    a.numero_serie     || '',
    formatDate(a.date_acquisition),
    a.valeur_achat     || 0,
    a.notes            || '',
  ]);

  // Ligne total
  rows1.push([
    '', `TOTAL — ${articles.length} article(s)`, '', '', '', '', '', '', '',
    articles.reduce((s, a) => s + (a.valeur_achat || 0), 0),
    '',
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet([headers1, ...rows1]);
  styleSheet(ws1, headers1, [18, 30, 14, 16, 16, 18, 12, 18, 16, 18, 24]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Inventaire');

  // ── Feuille 2 : Résumé par département ──
  if (depts.length > 0) {
    const headers2 = ['Code', 'Département', 'Responsable', 'Total articles', 'Valeur totale (DA)', 'En bon état', 'Défectueux'];

    // Calcul par dept depuis les articles
    const byDept = {};
    articles.forEach(a => {
      const key = a.dept_code || 'N/A';
      if (!byDept[key]) byDept[key] = { nom: a.departement || 'N/A', total: 0, valeur: 0, bon: 0, def: 0 };
      byDept[key].total++;
      byDept[key].valeur += a.valeur_achat || 0;
      if (a.etat === 'bon') byDept[key].bon++;
      if (a.etat === 'defectueux') byDept[key].def++;
    });

    const rows2 = depts.map(d => [
      d.code,
      d.nom,
      d.responsable      || '',
      d.total_articles   || 0,
      d.valeur_totale    || 0,
      byDept[d.code]?.bon || 0,
      byDept[d.code]?.def || 0,
    ]);

    const ws2 = XLSX.utils.aoa_to_sheet([headers2, ...rows2]);
    styleSheet(ws2, headers2, [8, 26, 20, 14, 18, 14, 12]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Par département');
  }

  // ── Feuille 3 : État du parc ──
  const etats = ['bon', 'usage', 'defectueux', 'reforme'];
  const headers3 = ['État', 'Nombre', '% du parc', 'Valeur (DA)'];
  const rows3 = etats.map(e => {
    const subset = articles.filter(a => a.etat === e);
    const pct    = articles.length ? ((subset.length / articles.length) * 100).toFixed(1) : '0.0';
    const val    = subset.reduce((s, a) => s + (a.valeur_achat || 0), 0);
    return [e, subset.length, `${pct}%`, val];
  });

  const ws3 = XLSX.utils.aoa_to_sheet([headers3, ...rows3]);
  styleSheet(ws3, headers3, [14, 10, 12, 16]);
  XLSX.utils.book_append_sheet(wb, ws3, 'État du parc');

  // Écriture fichier
  const filename = `inventaire_${Date.now()}.xlsx`;
  const outPath  = path.join(app.getPath('downloads'), filename);
  XLSX.writeFile(wb, outPath);
  return outPath;
}

// ── Export décharge ────────────────────────────────────────────────────────

/**
 * Génère un Excel pour une décharge spécifique
 * @param {object} decharge — objet complet avec .articles[]
 * @returns {string}        — chemin du fichier généré
 */
function generateDechargeExcel(decharge) {
  const wb = XLSX.utils.book_new();

  // Infos décharge
  const infoRows = [
    ['Numéro',      decharge.numero],
    ['Date',        formatDate(decharge.date_decharge)],
    ['Source',      `${decharge.dept_source_code} — ${decharge.dept_source_nom}`],
    ['Destination', `${decharge.dept_dest_code} — ${decharge.dept_dest_nom}`],
    ['Émetteur',    decharge.emetteur  || ''],
    ['Récepteur',   decharge.recepteur || ''],
    ['Motif',       decharge.motif     || ''],
    ['Statut',      decharge.statut],
    [],
  ];

  const artHeaders = ['Code-barre', 'Désignation', 'Marque', 'Modèle', 'N° Série', 'État', 'Notes'];
  const artRows = (decharge.articles || []).map(a => [
    a.code_barre,
    a.designation,
    a.marque       || '',
    a.modele       || '',
    a.numero_serie || '',
    a.etat         || '',
    a.notes        || '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([...infoRows, artHeaders, ...artRows]);
  styleSheet(ws, artHeaders, [18, 30, 14, 16, 18, 12, 24]);

  // Style header articles (ligne 10 = index 9)
  artHeaders.forEach((_, i) => {
    const cell = XLSX.utils.encode_cell({ r: infoRows.length, c: i });
    if (ws[cell]) ws[cell].s = HEADER_STYLE;
  });

  XLSX.utils.book_append_sheet(wb, ws, `Décharge ${decharge.numero}`);

  const filename = `decharge_${decharge.numero}_${Date.now()}.xlsx`;
  const outPath  = path.join(app.getPath('downloads'), filename);
  XLSX.writeFile(wb, outPath);
  return outPath;
}

module.exports = { generateInventaireExcel, generateDechargeExcel };