const { ipcMain } = require('electron');
const { getDB }   = require('../db/database');

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

// Génère le prochain numéro de décharge : DCH-YYYY-XXXX
function nextNumero() {
  const db   = getDB();
  const year = new Date().getFullYear();
  const last = db.prepare(
    `SELECT numero FROM decharges WHERE numero LIKE 'DCH-${year}-%' ORDER BY id DESC LIMIT 1`
  ).get();
  const seq = last
    ? String(parseInt(last.numero.split('-')[2]) + 1).padStart(4, '0')
    : '0001';
  return `DCH-${year}-${seq}`;
}

// ── GET ALL ──────────────────────────────────────────────────────────────────
handle('decharges:getAll', () => {
  return getDB().prepare(`
    SELECT d.*,
           ds.nom  AS dept_source_nom,  ds.code AS dept_source_code,
           dd.nom  AS dept_dest_nom,    dd.code AS dept_dest_code,
           COUNT(da.id) AS nb_articles
    FROM decharges d
    JOIN departements ds ON d.dept_source_id = ds.id
    JOIN departements dd ON d.dept_dest_id   = dd.id
    LEFT JOIN decharge_articles da ON da.decharge_id = d.id
    GROUP BY d.id
    ORDER BY d.created_at DESC
  `).all();
});

// ── GET BY ID (avec articles) ─────────────────────────────────────────────────
handle('decharges:getById', (id) => {
  const db       = getDB();
  const decharge = db.prepare(`
    SELECT d.*,
           ds.nom AS dept_source_nom, ds.code AS dept_source_code,
           dd.nom AS dept_dest_nom,   dd.code AS dept_dest_code
    FROM decharges d
    JOIN departements ds ON d.dept_source_id = ds.id
    JOIN departements dd ON d.dept_dest_id   = dd.id
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
});

// ── CREATE (brouillon) ────────────────────────────────────────────────────────
handle('decharges:create', ({ header, articleIds }) => {
  const db     = getDB();
  const numero = nextNumero();

  const run = db.transaction(() => {
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO decharges (numero, dept_source_id, dept_dest_id, motif, emetteur)
      VALUES (@numero, @dept_source_id, @dept_dest_id, @motif, @emetteur)
    `).run({ numero, ...header });

    const insertLigne = db.prepare(
      `INSERT INTO decharge_articles (decharge_id, article_id) VALUES (?, ?)`
    );
    for (const artId of articleIds) {
      insertLigne.run(lastInsertRowid, artId);
    }

    return lastInsertRowid;
  });

  return { id: run(), numero };
});

// ── VALIDER → transfère réellement les articles ───────────────────────────────
handle('decharges:valider', ({ id, recepteur, operateur }) => {
  const db       = getDB();
  const decharge = db.prepare(`SELECT * FROM decharges WHERE id = ?`).get(id);

  if (!decharge)                      throw new Error('Décharge introuvable');
  if (decharge.statut !== 'brouillon') throw new Error('Décharge déjà traitée');

  const articleIds = db.prepare(
    `SELECT article_id FROM decharge_articles WHERE decharge_id = ?`
  ).all(id).map(r => r.article_id);

  db.transaction(() => {
    for (const artId of articleIds) {
      // Clôture l'affectation courante
      db.prepare(
        `UPDATE affectations SET date_fin = date('now') WHERE article_id = ? AND date_fin IS NULL`
      ).run(artId);

      // Nouvelle affectation
      db.prepare(
        `INSERT INTO affectations (article_id, dept_id, motif, created_by)
         VALUES (?, ?, ?, ?)`
      ).run(artId, decharge.dept_dest_id, `Transfert décharge ${decharge.numero}`, operateur || 'system');

      // Met à jour le département courant de l'article
      db.prepare(
        `UPDATE articles SET dept_actuel_id = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(decharge.dept_dest_id, artId);

      // Log historique
      db.prepare(
        `INSERT INTO historique (action, article_id, decharge_id, details, operateur)
         VALUES ('TRANSFERT', ?, ?, ?, ?)`
      ).run(artId, id, JSON.stringify({ decharge }), operateur || 'system');
    }

    // Clôture la décharge
    db.prepare(
      `UPDATE decharges SET statut = 'validee', recepteur = ? WHERE id = ?`
    ).run(recepteur, id);
  })();

  return { success: true, articlesTransferes: articleIds.length };
});

// ── ANNULER ───────────────────────────────────────────────────────────────────
handle('decharges:annuler', (id) => {
  const db       = getDB();
  const decharge = db.prepare(`SELECT statut FROM decharges WHERE id = ?`).get(id);

  if (!decharge)                      throw new Error('Décharge introuvable');
  if (decharge.statut !== 'brouillon') throw new Error('Seules les décharges brouillon peuvent être annulées');

  db.prepare(`UPDATE decharges SET statut = 'annulee' WHERE id = ?`).run(id);
  return { success: true };
});