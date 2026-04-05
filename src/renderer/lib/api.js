
async function call(channel, payload) {
  const res = await window.electron.invoke(channel, payload);
  if (!res.ok) throw new Error(res.error || `Erreur IPC: ${channel}`);
  return res.data;
}

export const api = {
  departements: {
    getAll:  ()          => call('departements:getAll'),
    getById: (id)        => call('departements:getById', id),
    create:  (data)      => call('departements:create', data),
    update:  (id, d)     => call('departements:update', { id, data: d }),
  },
  articles: {
    getAll:  (f)         => call('articles:getAll', f),
    getById: (id)        => call('articles:getById', id),
    create:  (data)      => call('articles:create', data),
    update:  (id, data)  => call('articles:update', { id, data }),
    delete:  (id)        => call('articles:delete', id),
    barcode: (code)      => call('articles:barcode', code),
  },
  categories: {
    getAll:  ()          => call('categories:getAll'),
  },
  decharges: {
    getAll:  ()                   => call('decharges:getAll'),
    getById: (id)                 => call('decharges:getById', id),
    create:  (header, articleIds) => call('decharges:create', { header, articleIds }),
    valider: (id, recepteur, op)  => call('decharges:valider', { id, recepteur, operateur: op }),
    annuler: (id)                 => call('decharges:annuler', id),
  },
  rapports: {
  inventairePDF:   (f)  => call('rapports:inventaire:pdf', f),
  inventaireExcel: (f)  => call('rapports:inventaire:excel', f),
  dechargePDF:     (id) => call('rapports:decharge:pdf', id),
  dechargeExcel:   (id) => call('rapports:decharge:excel', id),
  },
  auth: {
  login: (login, password) => call('auth:login', { login, password }),
},
utilisateurs: {
  getAll:          ()           => call('utilisateurs:getAll'),
  create:          (data)       => call('utilisateurs:create', data),
  update:          (id, data)   => call('utilisateurs:update', { id, data }),
  toggle:          (id)         => call('utilisateurs:toggle', id),
  changePassword:  (id, o, n)   => call('utilisateurs:changePassword', { id, oldPassword: o, newPassword: n }),
},
backup: {
  manual:      ()                    => call('backup:manual'),
  list:        (dir)                 => call('backup:list', dir),
  schedule:    (destDir, hours)      => call('backup:schedule', { destDir, intervalHours: hours }),
  unschedule:  ()                    => call('backup:unschedule'),
  restore:     ()                    => call('backup:restore'),
},
};