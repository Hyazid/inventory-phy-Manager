const {contextBridge, ipcRenderer} = require('electron');

const ALLOWED_CHANNELS = [
  'articles:getAll',
  'articles:getById',
  'articles:create',
  'articles:update',
  'articles:delete',
  'articles:barcode',
  'departements:getAll',
  'departements:getById',
  'departements:create',
  'departements:update',
  'decharges:getAll',
  'decharges:create',
  'decharges:valider',
  'decharges:annuler',
  'rapports:inventaire',
  'rapports:decharge',
  'categories:getAll',
  'decharges:getById',
  'rapports:inventaire:pdf',
  'rapports:inventaire:excel',
  'rapports:decharge:pdf',
  'rapports:decharge:excel',
  'auth:login',
  'utilisateurs:getAll',
  'utilisateurs:create',
  'utilisateurs:update',
  'utilisateurs:toggle',
  'utilisateurs:changePassword',
  'backup:manual',
  'backup:list',
  'backup:schedule',
  'backup:unschedule',
  'backup:restore',
];

contextBridge.exposeInMainWorld('electron', {
  /**
   * Appel IPC sécurisé depuis le renderer
   * Usage : await window.electron.invoke('articles:getAll', { dept_id: 2 })
   */
  invoke(channel, ...args) {
    if (!ALLOWED_CHANNELS.includes(channel)) {
      throw new Error(`[IPC] Channel non autorisé : ${channel}`);
    }
    return ipcRenderer.invoke(channel, ...args);
  },

  // Écoute des événements push depuis le main (ex: notification)
  on(channel, callback) {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
  },
  off(channel, callback) {
    ipcRenderer.removeListener(channel, callback);
  },
});