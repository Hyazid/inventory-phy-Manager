const { ipcMain, shell } = require('electron');
const { getDB }          = require('../db/database');
const { generateInventairePDF, generateDechargePDF }     = require('../services/pdf.service');
const { generateInventaireExcel, generateDechargeExcel } = require('../services/excel.service');

function handle(channel, fn) {
  ipcMain.handle(channel, async (_, ...args) => {
    try {
      return { ok: true, data: await fn(...args) };
    } catch (err) {
      console.error(`[IPC] ${channel} error:`, err);
      return { ok: false, error: err.message };
    }
  });
}

// ── Helpers DB ─────────────────────────────────────────────────────────────

function fetchArticles(filters = {}) {
  const db = getDB();
  let sql = `
    SELECT a.id, a.code_barre, a.designation, a.marque, a.modele,
           a.etat, a.valeur_achat, a.numero_serie, a.date_acquisition, a.notes,
           c.nom AS categorie,
           d.nom AS departement, d.code AS dept_code
    FROM articles a
    LEFT JOIN categories c ON a.categorie_id = c.id
    LEFT JOIN departements d ON a.dept_actuel_id = d.id
    WHERE 1=1
  `;
  const params = [];
  if (filters.dept_id) { sql += ` AND a.dept_actuel_id = ?`; params.push(filters.dept_id); }
  if (filters.etat)    { sql += ` AND a.etat = ?`;           params.push(filters.etat); }
  sql += ` ORDER BY d.nom, a.designation`;
  return db.prepare(sql).all(...params);
}

function fetchDecharge(id) {
  const db = getDB();
  const decharge = db.prepare(`
    SELECT d.*,
           ds.nom AS dept_source_nom, ds.code AS dept_source_code,
           dd.nom AS dept_dest_nom,   dd.code AS dept_dest_code
    FROM decharges d
    LEFT JOIN departements ds ON d.dept_source_id = ds.id
    LEFT JOIN departements dd ON d.dept_dest_id   = dd.id
    WHERE d.id = ?
  `).get(id);

  if (!decharge) throw new Error(`Décharge ${id} introuvable`);

  decharge.articles = db.prepare(`
    SELECT a.id, a.code_barre, a.designation, a.marque, a.modele,
           a.numero_serie, a.etat, da.notes
    FROM decharge_articles da
    JOIN articles a ON da.article_id = a.id
    WHERE da.decharge_id = ?
  `).all(id);

  return decharge;
}

// ── Handlers ───────────────────────────────────────────────────────────────

// PDF inventaire
handle('rapports:inventaire:pdf', async (filters = {}) => {
  const db      = getDB();
  const articles = fetchArticles(filters);
  const dept    = filters.dept_id
    ? db.prepare(`SELECT nom FROM departements WHERE id = ?`).get(filters.dept_id)
    : null;

  const outPath = await generateInventairePDF(articles, {
    departement: dept?.nom,
    etat:        filters.etat,
  });

  // Ouvre le fichier directement dans le lecteur PDF par défaut
  shell.openPath(outPath);
  return { path: outPath, count: articles.length };
});

// Excel inventaire
handle('rapports:inventaire:excel', async (filters = {}) => {
  const articles = fetchArticles(filters);
  const depts    = getDB().prepare(`
    SELECT d.*, COUNT(a.id) AS total_articles, SUM(a.valeur_achat) AS valeur_totale
    FROM departements d
    LEFT JOIN articles a ON a.dept_actuel_id = d.id
    GROUP BY d.id ORDER BY d.nom
  `).all();

  const outPath = generateInventaireExcel(articles, depts);
  shell.openPath(outPath);
  return { path: outPath, count: articles.length };
});

// PDF décharge
handle('rapports:decharge:pdf', async (id) => {
  const decharge = fetchDecharge(id);
  const outPath  = await generateDechargePDF(decharge);
  shell.openPath(outPath);
  return { path: outPath };
});

// Excel décharge
handle('rapports:decharge:excel', async (id) => {
  const decharge = fetchDecharge(id);
  const outPath  = generateDechargeExcel(decharge);
  shell.openPath(outPath);
  return { path: outPath };
});