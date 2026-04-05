import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function Rapports() {
  const [depts, setDepts]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }

  // Filtres inventaire
  const [deptId, setDeptId] = useState('');
  const [etat,   setEtat]   = useState('');

  // Décharge ciblée
  const [decharges, setDecharges]   = useState([]);
  const [dechargeId, setDechargeId] = useState('');

  useEffect(() => {
    api.departements.getAll().then(setDepts).catch(console.error);
    api.decharges.getAll().then(setDecharges).catch(console.error);
  }, []);

  function notify(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function run(fn) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fn();
      notify('success', `Fichier généré → ${res.path}`);
    } catch (e) {
      notify('error', e.message);
    } finally {
      setLoading(false);
    }
  }

  const filters = {
    dept_id: deptId ? Number(deptId) : undefined,
    etat:    etat   || undefined,
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Rapports & Exports</h1>
      </div>

      {/* Notification */}
      {message && (
        <div style={{
          ...styles.notif,
          background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color:      message.type === 'success' ? '#15803d' : '#991b1b',
          borderColor:message.type === 'success' ? '#bbf7d0' : '#fecaca',
        }}>
          {message.type === 'success' ? '✓' : '✕'} {message.text}
        </div>
      )}

      <div style={styles.grid}>

        {/* ── Inventaire ── */}
        <div className="card">
          <h2 style={styles.cardTitle}>📦 Inventaire</h2>
          <p style={styles.cardDesc}>
            Export de l'inventaire complet ou filtré par département et/ou état.
            Le fichier est ouvert automatiquement après génération.
          </p>

          <div style={styles.filterRow}>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label className="form-label">Département</label>
              <select value={deptId} onChange={e => setDeptId(e.target.value)}>
                <option value="">Tous</option>
                {depts.map(d => (
                  <option key={d.id} value={d.id}>{d.code} — {d.nom}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label className="form-label">État</label>
              <select value={etat} onChange={e => setEtat(e.target.value)}>
                <option value="">Tous</option>
                <option value="bon">Bon état</option>
                <option value="usage">Usagé</option>
                <option value="defectueux">Défectueux</option>
                <option value="reforme">Réformé</option>
              </select>
            </div>
          </div>

          <div style={styles.btnRow}>
            <ExportBtn
              icon="📄"
              label="PDF"
              disabled={loading}
              onClick={() => run(() => api.rapports.inventairePDF(filters))}
            />
            <ExportBtn
              icon="📊"
              label="Excel"
              disabled={loading}
              onClick={() => run(() => api.rapports.inventaireExcel(filters))}
            />
          </div>
        </div>

        {/* ── Décharge ── */}
        <div className="card">
          <h2 style={styles.cardTitle}>📋 Décharge</h2>
          <p style={styles.cardDesc}>
            Exporte le document de décharge avec la liste des articles transférés
            et les zones de signature.
          </p>

          <div className="form-group">
            <label className="form-label">Sélectionner une décharge</label>
            <select value={dechargeId} onChange={e => setDechargeId(e.target.value)}>
              <option value="">— Choisir —</option>
              {decharges.map(d => (
                <option key={d.id} value={d.id}>
                  {d.numero} — {d.dept_source_code} → {d.dept_dest_code} ({d.statut})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.btnRow}>
            <ExportBtn
              icon="📄"
              label="PDF"
              disabled={loading || !dechargeId}
              onClick={() => run(() => api.rapports.dechargePDF(Number(dechargeId)))}
            />
            <ExportBtn
              icon="📊"
              label="Excel"
              disabled={loading || !dechargeId}
              onClick={() => run(() => api.rapports.dechargeExcel(Number(dechargeId)))}
            />
          </div>
        </div>

      </div>

      {/* Info dossier téléchargements */}
      <p style={{ marginTop: 20, fontSize: 12, color: 'var(--color-muted)' }}>
        Les fichiers sont enregistrés dans votre dossier <strong>Téléchargements</strong> et ouverts automatiquement.
      </p>
    </div>
  );
}

function ExportBtn({ icon, label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles.exportBtn,
        opacity: disabled ? 0.5 : 1,
        cursor:  disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
    </button>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  cardTitle: {
    fontSize: 15, fontWeight: 600, marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13, color: 'var(--color-muted)',
    marginBottom: 16, lineHeight: 1.5,
  },
  filterRow: {
    display: 'flex', gap: 12, marginBottom: 16,
  },
  btnRow: {
    display: 'flex', gap: 10, marginTop: 8,
  },
  exportBtn: {
    flex: 1,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: '16px 12px',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    background: 'var(--color-bg)',
    transition: 'background .15s',
  },
  notif: {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid',
    fontSize: 13,
    marginBottom: 16,
    wordBreak: 'break-all',
  },
};