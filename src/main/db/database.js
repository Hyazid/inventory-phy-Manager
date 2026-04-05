const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db = null;

function getDB() {
  if (!db) throw new Error('DB non initialisée. Appelle initDB() d\'abord.');
  return db;
}

function initDB() {
  const dbPath = path.join(app.getPath('userData'), 'inventaire.db');
  console.log('[DB] Chemin :', dbPath);

  db = new Database(dbPath, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
  });

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  _applySchema();
  _runMigrations();
  _seedDemoData();

  console.log('[DB] Initialisée avec succès.');
  return db;
}

function _applySchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS utilisateurs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nom        TEXT NOT NULL,
      prenom     TEXT NOT NULL,
      login      TEXT NOT NULL UNIQUE,
      password   TEXT NOT NULL,
      role       TEXT CHECK(role IN ('admin','gestionnaire','lecteur')) DEFAULT 'gestionnaire',
      actif      INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS departements (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      code         TEXT    NOT NULL UNIQUE,
      nom          TEXT    NOT NULL,
      responsable  TEXT,
      localisation TEXT,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      nom   TEXT NOT NULL UNIQUE,
      icone TEXT
    );

    CREATE TABLE IF NOT EXISTS articles (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      code_barre       TEXT    NOT NULL UNIQUE,
      designation      TEXT    NOT NULL,
      description      TEXT,
      categorie_id     INTEGER REFERENCES categories(id),
      marque           TEXT,
      modele           TEXT,
      numero_serie     TEXT UNIQUE,
      date_acquisition TEXT,
      valeur_achat     REAL,
      etat             TEXT CHECK(etat IN ('bon','usage','defectueux','reforme')) DEFAULT 'bon',
      dept_actuel_id   INTEGER REFERENCES departements(id),
      photo_path       TEXT,
      notes            TEXT,
      created_at       TEXT DEFAULT (datetime('now')),
      updated_at       TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS affectations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id  INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      dept_id     INTEGER NOT NULL REFERENCES departements(id),
      utilisateur TEXT,
      date_debut  TEXT NOT NULL DEFAULT (date('now')),
      date_fin    TEXT,
      motif       TEXT,
      created_by  TEXT
    );

    CREATE TABLE IF NOT EXISTS decharges (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      numero         TEXT NOT NULL UNIQUE,
      dept_source_id INTEGER NOT NULL REFERENCES departements(id),
      dept_dest_id   INTEGER NOT NULL REFERENCES departements(id),
      date_decharge  TEXT NOT NULL DEFAULT (date('now')),
      motif          TEXT,
      emetteur       TEXT NOT NULL,
      recepteur      TEXT,
      statut         TEXT CHECK(statut IN ('brouillon','validee','annulee')) DEFAULT 'brouillon',
      notes          TEXT,
      created_at     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS decharge_articles (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      decharge_id  INTEGER NOT NULL REFERENCES decharges(id) ON DELETE CASCADE,
      article_id   INTEGER NOT NULL REFERENCES articles(id),
      etat_depart  TEXT,
      etat_arrivee TEXT,
      notes        TEXT
    );

    CREATE TABLE IF NOT EXISTS historique (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      action      TEXT NOT NULL,
      article_id  INTEGER REFERENCES articles(id),
      decharge_id INTEGER REFERENCES decharges(id),
      details     TEXT,
      operateur   TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_articles_dept     ON articles(dept_actuel_id);
    CREATE INDEX IF NOT EXISTS idx_articles_cat      ON articles(categorie_id);
    CREATE INDEX IF NOT EXISTS idx_articles_barcode  ON articles(code_barre);
    CREATE INDEX IF NOT EXISTS idx_affectations_art  ON affectations(article_id);
    CREATE INDEX IF NOT EXISTS idx_decharge_articles ON decharge_articles(decharge_id);
  `);
}

function _runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    db.prepare('SELECT name FROM _migrations').all().map(r => r.name)
  );

  const migrations = [
    // Futures migrations ici :
    // { name: '001_add_photo_path', up: `ALTER TABLE articles ADD COLUMN photo_path TEXT` },
  ];

  const insert = db.prepare('INSERT INTO _migrations (name) VALUES (?)');
  db.transaction(() => {
    for (const m of migrations) {
      if (!applied.has(m.name)) {
        db.exec(m.up);
        insert.run(m.name);
        console.log(`[DB] Migration appliquée : ${m.name}`);
      }
    }
  })();
}

function _seedDemoData() {
  const crypto = require('crypto');
  const hash   = crypto.createHash('sha256').update('admin123').digest('hex');

  // ── 1. Admin — indépendant du reste ───────────────────────────────────
  const { n: userCount } = db.prepare(`SELECT COUNT(*) as n FROM utilisateurs`).get();
  if (userCount === 0) {
    db.prepare(`
      INSERT INTO utilisateurs (nom, prenom, login, password, role)
      VALUES ('Administrateur', 'Système', 'admin', ?, 'admin')
    `).run(hash);
    console.log('[DB] Utilisateur admin créé.');
  }

  // ── 2. Départements + catégories ──────────────────────────────────────
  const { n: deptCount } = db.prepare(`SELECT COUNT(*) as n FROM departements`).get();
  if (deptCount > 0) return; // déjà seedé

  db.transaction(() => {
    const insertDept = db.prepare(
      `INSERT INTO departements (code, nom, responsable, localisation) VALUES (?, ?, ?, ?)`
    );
    insertDept.run('DIR', 'Direction Générale',    'M. Directeur',  'Bâtiment A - RDC');
    insertDept.run('IT',  'Informatique',           'M. Technicien', 'Bâtiment B - 1er');
    insertDept.run('RH',  'Ressources Humaines',    'Mme RH',        'Bâtiment A - 2ème');
    insertDept.run('FIN', 'Finance & Comptabilité', 'Mme Finance',   'Bâtiment A - 1er');
    insertDept.run('LOG', 'Logistique',             'M. Logistique', 'Bâtiment C');

    const insertCat = db.prepare(`INSERT INTO categories (nom, icone) VALUES (?, ?)`);
    insertCat.run('Informatique', 'monitor');
    insertCat.run('Mobilier',     'armchair');
    insertCat.run('Véhicule',     'car');
    insertCat.run('Téléphonie',   'phone');
    insertCat.run('Imprimante',   'printer');
    insertCat.run('Autre',        'box');
  })();

  console.log('[DB] Données de démo insérées.');
}
module.exports = { initDB, getDB };