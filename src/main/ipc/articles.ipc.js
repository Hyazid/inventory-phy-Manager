const {ipcMain} = require('electron');
const {getDB} = require('../db/database');
const {generateBarcode, renderBarcodeImage} =require('../services/barecode.services');
const { ok } = require('node:assert');

function handle (channel, fn){
    ipcMain.handle(channel, async(_,... args)=>{
        try{
            return {ok : true, data: await fn(...args)}
        } catch (error) {
            console.error(`[IPC] Erreur dans le handler ${channel} :`, error)
            return {ok : false, error: error.message}
        }
    })
}


handle('articles:getAll', (filters = {}) => {
  const db = getDB();
  let sql = `
    SELECT a.id, a.code_barre, a.designation, a.marque, a.modele,
           a.etat, a.valeur_achat, a.numero_serie, a.date_acquisition,
           c.nom AS categorie, d.nom AS departement, d.code AS dept_code
    FROM articles a
    LEFT JOIN categories c ON a.categorie_id = c.id
    LEFT JOIN departements d ON a.dept_actuel_id = d.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.dept_id)  { sql += ` AND a.dept_actuel_id = ?`; params.push(filters.dept_id); }
  if (filters.etat)     { sql += ` AND a.etat = ?`;           params.push(filters.etat); }
  if (filters.cat_id)   { sql += ` AND a.categorie_id = ?`;   params.push(filters.cat_id); }
  if (filters.search) {
    const s = `%${filters.search}%`;
    sql += ` AND (a.designation LIKE ? OR a.code_barre LIKE ? OR a.numero_serie LIKE ? OR a.marque LIKE ?)`;
    params.push(s, s, s, s);
  }

  sql += ` ORDER BY a.updated_at DESC`;
  return db.prepare(sql).all(...params);
});


handle('articles:getById', (id) => {
  const db = getDB();
  const article = db.prepare(`
    SELECT a.*, c.nom AS categorie, d.nom AS departement
    FROM articles a
    LEFT JOIN categories c ON a.categorie_id = c.id
    LEFT JOIN departements d ON a.dept_actuel_id = d.id
    WHERE a.id = ?
  `).get(id);

  if (!article) throw new Error(`Article ${id} introuvable`);

  // Historique des affectations
  article.historique = db.prepare(`
    SELECT af.*, d.nom AS departement
    FROM affectations af
    JOIN departements d ON af.dept_id = d.id
    WHERE af.article_id = ?
    ORDER BY af.date_debut DESC
  `).all(id);

  return article;
});

handle('articles:create', (data) => {
  const db = getDB();
  const code_barre = generateBarcode();

  const run = db.transaction(() => {
    // Tous les champs doivent être présents (même null) pour better-sqlite3
    const payload = {
      code_barre,
      designation:      data.designation      ?? null,
      description:      data.description      ?? null,
      categorie_id:     data.categorie_id      ?? null,
      marque:           data.marque            ?? null,
      modele:           data.modele            ?? null,
      numero_serie:     data.numero_serie      ?? null,
      date_acquisition: data.date_acquisition  ?? null,
      valeur_achat:     data.valeur_achat      ?? null,
      etat:             data.etat              ?? 'bon',
      dept_actuel_id:   data.dept_actuel_id    ?? null,
      notes:            data.notes             ?? null,
    };

    const { lastInsertRowid } = db.prepare(`
      INSERT INTO articles
        (code_barre, designation, description, categorie_id, marque, modele,
         numero_serie, date_acquisition, valeur_achat, etat, dept_actuel_id, notes)
      VALUES
        (@code_barre, @designation, @description, @categorie_id, @marque, @modele,
         @numero_serie, @date_acquisition, @valeur_achat, @etat, @dept_actuel_id, @notes)
    `).run(payload);

    if (data.dept_actuel_id) {
      db.prepare(`
        INSERT INTO affectations (article_id, dept_id, motif, created_by)
        VALUES (?, ?, 'affectation initiale', ?)
      `).run(lastInsertRowid, data.dept_actuel_id, data.operateur || 'system');
    }

    db.prepare(`
      INSERT INTO historique (action, article_id, details, operateur)
      VALUES ('CREATION', ?, ?, ?)
    `).run(lastInsertRowid, JSON.stringify(data), data.operateur || 'system');

    return lastInsertRowid;
  });

  return { id: run(), code_barre };
});

handle('articles:update', ({ id, data }) => {
  getDB().prepare(`
    UPDATE articles SET
      designation = @designation,
      marque = @marque,
      modele = @modele,
      etat = @etat,
      notes = @notes,
      categorie_id = @categorie_id,
      valeur_achat = @valeur_achat,
      updated_at = datetime('now')
    WHERE id = @id
  `).run({ ...data, id });
  return { ok: true };
});

handle('articles:delete', (id) => {
  // Soft delete : on marque comme réformé plutôt que supprimer
  getDB().prepare(`UPDATE articles SET etat = 'reforme', updated_at = datetime('now') WHERE id = ?`).run(id);
  return { ok: true };
});


// Retourne le PNG du barcode en base64 pour affichage dans le renderer

// Retourne le PNG du barcode en base64 pour affichage dans le renderer
handle('articles:barcode', async (code) => {
  const buf = await renderBarcodeImage(code);
  return buf.toString('base64');
});