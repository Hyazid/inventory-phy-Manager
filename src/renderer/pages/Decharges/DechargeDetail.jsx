import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const STATUT_STYLE = {
  brouillon: { background: '#fef9c3', color: '#92400e', label: 'Brouillon' },
  validee:   { background: '#dcfce7', color: '#15803d', label: 'Validée'   },
  annulee:   { background: '#f1f5f9', color: '#475569', label: 'Annulée'   },
};

export default function DechargeDetail({ id, onClose }) {
  const [decharge, setDecharge] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [recepteur, setRecepteur] = useState('');
  const [acting, setActing]     = useState(false);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    api.decharges.getById(id)
      .then(setDecharge)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleValider() {
    if (!recepteur.trim()) return setError('Le nom du récepteur est obligatoire.');
    if (!confirm(`Valider la décharge ${decharge.numero} ? Cette action est irréversible.`)) return;
    setActing(true);
    try {
      await api.decharges.valider(id, recepteur, 'admin');
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setActing(false);
    }
  }

  async function handleAnnuler() {
    if (!confirm(`Annuler la décharge ${decharge.numero} ?`)) return;
    setActing(true);
    try {
      await api.decharges.annuler(id);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setActing(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              {decharge ? decharge.numero : 'Chargement...'}
            </div>
            {decharge && (
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
                {new Date(decharge.date_decharge).toLocaleDateString('fr-DZ')}
              </div>
            )}
          </div>
          {decharge && (
            <span style={{
              ...styles.badge,
              background: STATUT_STYLE[decharge.statut]?.background,
              color:      STATUT_STYLE[decharge.statut]?.color,
            }}>
              {STATUT_STYLE[decharge.statut]?.label}
            </span>
          )}
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {loading && <p style={{ color: 'var(--color-muted)' }}>Chargement...</p>}
          {error   && <div style={styles.errorBox}>{error}</div>}

          {decharge && (
            <>
              {/* Infos décharge */}
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>De</span>
                  <span>
                    <span style={styles.deptBadge}>{decharge.dept_source_code}</span>
                    {' '}{decharge.dept_source_nom}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Vers</span>
                  <span>
                    <span style={styles.deptBadge}>{decharge.dept_dest_code}</span>
                    {' '}{decharge.dept_dest_nom}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Émetteur</span>
                  <span>{decharge.emetteur || '—'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Récepteur</span>
                  <span>{decharge.recepteur || '—'}</span>
                </div>
                {decharge.motif && (
                  <div style={{ ...styles.infoItem, gridColumn: '1 / -1' }}>
                    <span style={styles.infoLabel}>Motif</span>
                    <span>{decharge.motif}</span>
                  </div>
                )}
              </div>

              {/* Liste articles */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                  Articles ({decharge.articles?.length ?? 0})
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Code-barre</th>
                        <th>Désignation</th>
                        <th>Marque / Modèle</th>
                        <th>N° série</th>
                        <th>État</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decharge.articles?.map(a => (
                        <tr key={a.id}>
                          <td><code style={{ fontSize: 11 }}>{a.code_barre}</code></td>
                          <td style={{ fontWeight: 500 }}>{a.designation}</td>
                          <td style={{ color: 'var(--color-muted)' }}>
                            {[a.marque, a.modele].filter(Boolean).join(' ') || '—'}
                          </td>
                          <td style={{ color: 'var(--color-muted)' }}>{a.numero_serie || '—'}</td>
                          <td>
                            <span className={`badge badge-${a.etat}`}>{a.etat}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Validation — seulement si brouillon */}
              {decharge.statut === 'brouillon' && (
                <div style={styles.validationBox}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
                    Valider la décharge
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: 1, margin: 0 }}>
                      <label className="form-label">Nom du récepteur *</label>
                      <input
                        value={recepteur}
                        onChange={e => setRecepteur(e.target.value)}
                        placeholder="Nom et prénom du récepteur"
                      />
                    </div>
                    <button
                      className="btn-primary"
                      onClick={handleValider}
                      disabled={acting}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {acting ? 'Validation...' : '✓ Valider'}
                    </button>
                    <button
                      onClick={handleAnnuler}
                      disabled={acting}
                      style={{ whiteSpace: 'nowrap', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                    >
                      {acting ? '...' : '✕ Annuler'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose}>Fermer</button>
          <button onClick={() => api.rapports.dechargePDF(id)}>
  📄 PDF
</button>
<button onClick={() => api.rapports.dechargeExcel(id)}>
  📊 Excel
</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'var(--color-surface)',
    borderRadius: 10,
    width: 760,
    maxWidth: '95vw',
    maxHeight: '92vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '16px 20px',
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
  },
  closeBtn: {
    background: 'none', border: 'none',
    fontSize: 18, cursor: 'pointer',
    color: 'var(--color-muted)',
    marginLeft: 'auto',
  },
  body: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end',
    padding: '12px 20px',
    borderTop: '1px solid var(--color-border)',
    flexShrink: 0,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px 20px',
    background: 'var(--color-bg)',
    borderRadius: 8,
    padding: '14px 16px',
    marginBottom: 8,
  },
  infoItem: {
    display: 'flex', flexDirection: 'column', gap: 3,
  },
  infoLabel: {
    fontSize: 11, fontWeight: 600,
    color: 'var(--color-muted)',
    textTransform: 'uppercase', letterSpacing: '.04em',
  },
  deptBadge: {
    background: '#eef2ff', color: '#4f46e5',
    padding: '1px 7px', borderRadius: 99,
    fontSize: 11, fontWeight: 600,
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 99,
    fontSize: 12, fontWeight: 600,
  },
  errorBox: {
    background: '#fee2e2', color: '#991b1b',
    padding: '10px 14px', borderRadius: 6,
    marginBottom: 16, fontSize: 13,
  },
  validationBox: {
    marginTop: 20,
    padding: '14px 16px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
  },
};