const { ipcMain } = require('electron');
const { getDB }   = require('../db/database');
const crypto      = require('crypto');

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

// Hash simple SHA256 — suffisant pour une app desktop locale
function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

// ── Login ──────────────────────────────────────────────────────────────────
handle('auth:login', ({ login, password }) => {
  const db   = getDB();
  const hash = hashPassword(password);
  const user = db.prepare(`
    SELECT id, nom, prenom, login, role
    FROM utilisateurs
    WHERE login = ? AND password = ? AND actif = 1
  `).get(login, hash);

  if (!user) throw new Error('Login ou mot de passe incorrect.');
  return user; // { id, nom, prenom, login, role }
});

// ── Liste utilisateurs ─────────────────────────────────────────────────────
handle('utilisateurs:getAll', () => {
  return getDB().prepare(`
    SELECT id, nom, prenom, login, role, actif, created_at
    FROM utilisateurs
    ORDER BY nom, prenom
  `).all();
});

// ── Créer utilisateur ──────────────────────────────────────────────────────
handle('utilisateurs:create', (data) => {
  const db = getDB();

  // Vérifie unicité du login
  const exists = db.prepare(`SELECT id FROM utilisateurs WHERE login = ?`).get(data.login);
  if (exists) throw new Error(`Le login "${data.login}" est déjà utilisé.`);

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO utilisateurs (nom, prenom, login, password, role)
    VALUES (@nom, @prenom, @login, @password, @role)
  `).run({
    nom:      data.nom,
    prenom:   data.prenom,
    login:    data.login,
    password: hashPassword(data.password),
    role:     data.role || 'gestionnaire',
  });

  return { id: lastInsertRowid };
});

// ── Modifier utilisateur ───────────────────────────────────────────────────
handle('utilisateurs:update', ({ id, data }) => {
  const db = getDB();

  // Si nouveau mot de passe fourni
  if (data.password && data.password.trim()) {
    db.prepare(`
      UPDATE utilisateurs SET
        nom=@nom, prenom=@prenom, login=@login,
        password=@password, role=@role,
        updated_at=datetime('now')
      WHERE id=@id
    `).run({ ...data, id, password: hashPassword(data.password) });
  } else {
    db.prepare(`
      UPDATE utilisateurs SET
        nom=@nom, prenom=@prenom, login=@login,
        role=@role, updated_at=datetime('now')
      WHERE id=@id
    `).run({ nom: data.nom, prenom: data.prenom, login: data.login, role: data.role, id });
  }

  return { ok: true };
});

// ── Activer / Désactiver ───────────────────────────────────────────────────
handle('utilisateurs:toggle', (id) => {
  const db   = getDB();
  const user = db.prepare(`SELECT actif FROM utilisateurs WHERE id = ?`).get(id);
  if (!user) throw new Error('Utilisateur introuvable.');

  db.prepare(`UPDATE utilisateurs SET actif = ? WHERE id = ?`).run(user.actif ? 0 : 1, id);
  return { actif: !user.actif };
});

// ── Changer mot de passe ───────────────────────────────────────────────────
handle('utilisateurs:changePassword', ({ id, oldPassword, newPassword }) => {
  const db      = getDB();
  const oldHash = hashPassword(oldPassword);
  const user    = db.prepare(`SELECT id FROM utilisateurs WHERE id = ? AND password = ?`).get(id, oldHash);
  if (!user) throw new Error('Ancien mot de passe incorrect.');

  db.prepare(`UPDATE utilisateurs SET password = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(hashPassword(newPassword), id);
  return { ok: true };
});