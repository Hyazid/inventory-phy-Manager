const {ipcMain} = require('electron')
const {getDB} = require('../db/database')
function handle(channel, fn){
    ipcMain.handle(channel, async(event, ...args)=>{
        try{
            return {ok : true, data:await fn(...args)}
        } catch (error) {
            console.error(`[IPC] Erreur dans le handler ${channel} :`, error)
            return {ok : false, error: error.message}
        }
    })
}

handle('departements:getAll', () => {
  return getDB()
    .prepare(`
      SELECT d.*, 
             COUNT(a.id) AS total_articles,
             SUM(a.valeur_achat) AS valeur_totale
      FROM departements d
      LEFT JOIN articles a ON a.dept_actuel_id = d.id
      GROUP BY d.id
      ORDER BY d.nom
    `)
    .all();
});

handle('departements:getById', (id) => {
  const dept = getDB().prepare(`SELECT * FROM departements WHERE id = ?`).get(id);
  if (!dept) throw new Error(`Département ${id} introuvable`);
  return dept;
});
handle('departements:create', (data) => {
  const { lastInsertRowid } = getDB()
    .prepare(`INSERT INTO departements (code, nom, responsable, localisation) VALUES (@code, @nom, @responsable, @localisation)`)
    .run(data);
  return { id: lastInsertRowid };
});

handle('departements:update', ({ id, data }) => {
  getDB()
    .prepare(`UPDATE departements SET code=@code, nom=@nom, responsable=@responsable, localisation=@localisation, updated_at=datetime('now') WHERE id=@id`)
    .run({ ...data, id });
  return { ok: true };
});
handle('categories:getAll', () => {
  return getDB().prepare(`SELECT * FROM categories ORDER BY nom`).all();
});