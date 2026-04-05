const fs      = require('fs');
const path    = require('path');
const { app } = require('electron');
const { getDB } = require('../db/database');

/**
 * Retourne le chemin de la DB source
 */
function getDBPath() {
  return path.join(app.getPath('userData'), 'inventaire.db');
}

/**
 * Crée un backup de la DB vers un dossier cible
 * Nom du fichier : inventaire_backup_YYYY-MM-DD_HH-MM.db
 *
 * @param {string} destDir — dossier de destination
 * @returns {string}       — chemin du fichier créé
 */
async function backupDB(destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const now      = new Date();
  const stamp    = now.toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
  const filename = `inventaire_backup_${stamp}.db`;
  const destPath = path.join(destDir, filename);

  // better-sqlite3 a une méthode native backup() — atomique et sûre
  await getDB().backup(destPath);

  console.log(`[Backup] Sauvegarde créée : ${destPath}`);
  return destPath;
}

/**
 * Liste les backups existants dans un dossier
 * @param {string} destDir
 * @returns {object[]} — [{ name, path, size, date }]
 */
function listBackups(destDir) {
  if (!fs.existsSync(destDir)) return [];

  return fs.readdirSync(destDir)
    .filter(f => f.startsWith('inventaire_backup_') && f.endsWith('.db'))
    .map(f => {
      const full  = path.join(destDir, f);
      const stats = fs.statSync(full);
      return {
        name: f,
        path: full,
        size: stats.size,
        date: stats.mtime.toISOString(),
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // plus récent en premier
}

/**
 * Supprime les anciens backups, garde seulement les N plus récents
 * @param {string} destDir
 * @param {number} keep — nombre de backups à conserver (défaut: 10)
 */
function pruneBackups(destDir, keep = 10) {
  const backups = listBackups(destDir);
  const toDelete = backups.slice(keep);
  for (const b of toDelete) {
    fs.unlinkSync(b.path);
    console.log(`[Backup] Supprimé : ${b.name}`);
  }
  return toDelete.length;
}

/**
 * Planifie un backup automatique toutes les N heures
 * @param {string} destDir
 * @param {number} intervalHours
 * @returns {NodeJS.Timeout} — référence du timer (pour annuler)
 */
function scheduleBackup(destDir, intervalHours = 24) {
  const ms = intervalHours * 60 * 60 * 1000;

  // Backup immédiat au démarrage
  backupDB(destDir)
    .then(() => pruneBackups(destDir))
    .catch(e => console.error('[Backup] Erreur backup initial:', e));

  // Puis toutes les N heures
  const timer = setInterval(async () => {
    try {
      await backupDB(destDir);
      pruneBackups(destDir);
    } catch (e) {
      console.error('[Backup] Erreur backup planifié:', e);
    }
  }, ms);

  console.log(`[Backup] Planifié toutes les ${intervalHours}h → ${destDir}`);
  return timer;
}

module.exports = { backupDB, listBackups, pruneBackups, scheduleBackup, getDBPath };