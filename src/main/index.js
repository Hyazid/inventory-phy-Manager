const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initDB } = require('./db/database');

// Charge tous les handlers IPC
require('./ipc/articles.ipc');
require('./ipc/departements.ipc');
require('./ipc/decharges.ipc');
require('./ipc/rapports.ipc');
require('./ipc/utilisateurs.ipc');
require('./ipc/backup.ipc');
// Détection dev : NODE_ENV OU absence du dossier dist
const isDev = process.env.NODE_ENV === 'development' || !require('fs').existsSync(path.join(__dirname, '../../dist/index.html'));

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,   // obligatoire
      nodeIntegration: false,   // obligatoire
      sandbox: false,
    },
    titleBarStyle: 'hiddenInset', // macOS — retire sur Windows si besoin
    show: false, // on attend 'ready-to-show' pour éviter le flash blanc
  });

  // En dev: Vite dev server. En prod: fichier buildé
  if (isDev) {
    win.loadURL('http://localhost:5173/#');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(() => {
  initDB(); // Initialise SQLite + applique le schema
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});