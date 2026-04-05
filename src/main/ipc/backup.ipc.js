const { ipcMain, dialog, shell, app } = require('electron');
const path = require('path');
const { backupDB, listBackups, pruneBackups, scheduleBackup } = require('../services/backup.service');

let backupTimer = null;

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

// ── Backup manuel — ouvre un sélecteur de dossier ─────────────────────────
handle('backup:manual', async () => {
  const win = require('electron').BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(win, {
    title:       'Choisir le dossier de sauvegarde',
    properties:  ['openDirectory', 'createDirectory'],
    buttonLabel: 'Sauvegarder ici',
  });

  if (result.canceled || !result.filePaths.length) {
    throw new Error('Annulé par l\'utilisateur.');
  }

  const destDir  = result.filePaths[0];
  const destPath = await backupDB(destDir);
  shell.showItemInFolder(destPath); // ouvre le dossier avec le fichier sélectionné
  return { path: destPath, dir: destDir };
});

// ── Liste les backups d'un dossier ────────────────────────────────────────
handle('backup:list', async (destDir) => {
  if (!destDir) return [];
  return listBackups(destDir);
});

// ── Activer le backup automatique ─────────────────────────────────────────
handle('backup:schedule', async ({ destDir, intervalHours }) => {
  // Annule le timer précédent s'il existe
  if (backupTimer) {
    clearInterval(backupTimer);
    backupTimer = null;
  }

  if (!destDir) throw new Error('Dossier de destination requis.');

  backupTimer = scheduleBackup(destDir, intervalHours || 24);
  return { active: true, destDir, intervalHours: intervalHours || 24 };
});

// ── Désactiver le backup automatique ─────────────────────────────────────
handle('backup:unschedule', () => {
  if (backupTimer) {
    clearInterval(backupTimer);
    backupTimer = null;
  }
  return { active: false };
});

// ── Restaurer un backup ───────────────────────────────────────────────────
handle('backup:restore', async () => {
  const win = require('electron').BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(win, {
    title:   'Sélectionner un fichier de backup',
    filters: [{ name: 'SQLite DB', extensions: ['db'] }],
    properties: ['openFile'],
  });

  if (result.canceled || !result.filePaths.length) {
    throw new Error('Annulé par l\'utilisateur.');
  }

  const srcPath  = result.filePaths[0];
  const destPath = path.join(app.getPath('userData'), 'inventaire.db');

  // Backup de sécurité avant restauration
  const safeDir = path.join(app.getPath('userData'), 'backups_auto');
  await backupDB(safeDir);

  // Copie le fichier sélectionné
  const fs = require('fs');
  fs.copyFileSync(srcPath, destPath);

  return { restored: true, from: srcPath };
});