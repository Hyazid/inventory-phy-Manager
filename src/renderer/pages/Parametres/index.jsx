import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

const STORAGE_KEY = 'backup_config';

function loadConfig() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : { destDir: '', intervalHours: 24, autoActive: false };
  } catch { return { destDir: '', intervalHours: 24, autoActive: false }; }
}

function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export default function Parametres() {
  const [config, setConfig]     = useState(loadConfig);
  const [backups, setBackups]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState(null);

  useEffect(() => {
    if (config.destDir) loadBackupList();
  }, []);

  // Réactive le backup auto au démarrage si configuré
  useEffect(() => {
    if (config.autoActive && config.destDir) {
      api.backup.schedule(config.destDir, config.intervalHours).catch(console.error);
    }
  }, []);

  function notify(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }

  async function loadBackupList() {
    if (!config.destDir) return;
    try {
      const list = await api.backup.list(config.destDir);
      setBackups(list);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleManualBackup() {
    setLoading(true);
    try {
      const res = await api.backup.manual();
      // Mémorise le dossier choisi
      const newConfig = { ...config, destDir: res.dir };
      setConfig(newConfig);
      saveConfig(newConfig);
      await loadBackupList();
      notify('success', `Backup créé : ${res.path}`);
    } catch (e) {
      if (!e.message.includes('Annulé')) notify('error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSchedule() {
    if (!config.destDir) {
      return notify('error', 'Effectuez d\'abord un backup manuel pour définir le dossier.');
    }
    setLoading(true);
    try {
      await api.backup.schedule(config.destDir, config.intervalHours);
      const newConfig = { ...config, autoActive: true };
      setConfig(newConfig);
      saveConfig(newConfig);
      notify('success', `Backup automatique activé toutes les ${config.intervalHours}h.`);
    } catch (e) {
      notify('error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnschedule() {
    await api.backup.unschedule();
    const newConfig = { ...config, autoActive: false };
    setConfig(newConfig);
    saveConfig(newConfig);
    notify('success', 'Backup automatique désactivé.');
  }

  async function handleRestore() {
    if (!confirm('Restaurer un backup ? L\'état actuel sera sauvegardé automatiquement avant la restauration.')) return;
    setLoading(true);
    try {
      await api.backup.restore();
      notify('success', 'Backup restauré. Redémarrez l\'application pour appliquer les changements.');
    } catch (e) {
      if (!e.message.includes('Annulé')) notify('error', e.message);
    } finally {
      setLoading(false);
    }
  }

  function formatSize(bytes) {
    if (bytes < 1024)       return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Paramètres & Sauvegarde</h1>
      </div>

      {message && (
        <div style={{
          ...styles.notif,
          background:  message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color:       message.type === 'success' ? '#15803d' : '#991b1b',
          borderColor: message.type === 'success' ? '#bbf7d0' : '#fecaca',
        }}>
          {message.type === 'success' ? '✓' : '✕'} {message.text}
        </div>
      )}

      <div style={styles.grid}>

        {/* ── Backup manuel ── */}
        <div className="card">
          <h2 style={styles.cardTitle}>💾 Sauvegarde manuelle</h2>
          <p style={styles.cardDesc}>
            Crée une copie de la base de données dans le dossier de votre choix.
            Le fichier s'ouvre automatiquement dans l'explorateur.
          </p>

          {config.destDir && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Dernier dossier</span>
              <code style={{ fontSize: 12 }}>{config.destDir}</code>
            </div>
          )}

          <div style={styles.btnRow}>
            <button
              className="btn-primary"
              onClick={handleManualBackup}
              disabled={loading}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              💾 Sauvegarder maintenant
            </button>
            <button
              onClick={handleRestore}
              disabled={loading}
              style={{ flex: 1, justifyContent: 'center', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
            >
              ♻️ Restaurer un backup
            </button>
          </div>
        </div>

        {/* ── Backup automatique ── */}
        <div className="card">
          <h2 style={styles.cardTitle}>⏰ Sauvegarde automatique</h2>
          <p style={styles.cardDesc}>
            Planifie des sauvegardes périodiques dans le dossier configuré.
            Les 10 backups les plus récents sont conservés automatiquement.
          </p>

          <div className="form-group">
            <label className="form-label">Intervalle</label>
            <select
              value={config.intervalHours}
              onChange={e => {
                const newConfig = { ...config, intervalHours: Number(e.target.value) };
                setConfig(newConfig);
                saveConfig(newConfig);
              }}
              disabled={config.autoActive}
            >
              <option value={1}>Toutes les heures</option>
              <option value={6}>Toutes les 6 heures</option>
              <option value={12}>Toutes les 12 heures</option>
              <option value={24}>Une fois par jour</option>
              <option value={48}>Tous les 2 jours</option>
              <option value={168}>Une fois par semaine</option>
            </select>
          </div>

          <div style={styles.btnRow}>
            {config.autoActive ? (
              <button
                onClick={handleUnschedule}
                style={{ flex: 1, justifyContent: 'center', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
              >
                ⏹ Désactiver
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={handleSchedule}
                disabled={loading || !config.destDir}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                ▶ Activer
              </button>
            )}
          </div>

          {config.autoActive && (
            <div style={styles.activeBox}>
              ✓ Actif — toutes les {config.intervalHours}h
              <br />
              <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{config.destDir}</span>
            </div>
          )}
        </div>

      </div>

      {/* ── Liste des backups ── */}
      {config.destDir && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={styles.cardTitle}>📁 Backups existants</h2>
            <button onClick={loadBackupList} style={{ fontSize: 12 }}>↻ Actualiser</button>
          </div>

          {backups.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>Aucun backup trouvé dans ce dossier.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Fichier</th>
                    <th style={{ textAlign: 'right' }}>Taille</th>
                    <th style={{ textAlign: 'right' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b, i) => (
                    <tr key={b.name} style={{ opacity: i === 0 ? 1 : 0.75 }}>
                      <td>
                        <code style={{ fontSize: 12 }}>{b.name}</code>
                        {i === 0 && (
                          <span style={{ marginLeft: 8, fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: 99 }}>
                            dernier
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--color-muted)' }}>
                        {formatSize(b.size)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--color-muted)' }}>
                        {new Date(b.date).toLocaleString('fr-DZ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  cardTitle: { fontSize: 15, fontWeight: 600, marginBottom: 6 },
  cardDesc:  { fontSize: 13, color: 'var(--color-muted)', marginBottom: 16, lineHeight: 1.5 },
  btnRow:    { display: 'flex', gap: 10, marginTop: 8 },
  infoRow:   { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12, fontSize: 12 },
  infoLabel: { fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase' },
  activeBox: {
    marginTop: 12, padding: '10px 12px',
    background: '#dcfce7', color: '#15803d',
    borderRadius: 6, fontSize: 13, fontWeight: 500,
  },
  notif: {
    padding: '10px 16px', borderRadius: 8,
    border: '1px solid', fontSize: 13,
    marginBottom: 16, wordBreak: 'break-all',
  },
};