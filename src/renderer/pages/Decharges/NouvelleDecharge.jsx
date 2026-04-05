import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function NouvelleDecharge({ onSave, onCancel }) {
  const [depts, setDepts]         = useState([]);
  const [articles, setArticles]   = useState([]);
  const [selected, setSelected]   = useState([]); // ids articles sélectionnés
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const [form, setForm] = useState({
    dept_source_id: '',
    dept_dest_id:   '',
    motif:          '',
    emetteur:       '',
  });

  // Fermer avec Escape
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  useEffect(() => {
    api.departements.getAll().then(setDepts).catch(console.error);
  }, []);

  // Recharge les articles du département source sélectionné
  useEffect(() => {
    if (!form.dept_source_id) { setArticles([]); setSelected([]); return; }
    api.articles.getAll({ dept_id: Number(form.dept_source_id) })
      .then(data => { setArticles(data); setSelected([]); })
      .catch(console.error);
  }, [form.dept_source_id]);

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  function toggleArticle(id) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    setSelected(prev =>
      prev.length === articles.length ? [] : articles.map(a => a.id)
    );
  }

  async function handleSubmit() {
    if (!form.dept_source_id)  return setError('Sélectionnez le département source.');
    if (!form.dept_dest_id)    return setError('Sélectionnez le département destination.');
    if (form.dept_source_id === form.dept_dest_id)
                               return setError('Source et destination doivent être différents.');
    if (!form.emetteur.trim()) return setError('Le nom de l\'émetteur est obligatoire.');
    if (selected.length === 0) return setError('Sélectionnez au moins un article.');

    setLoading(true);
    setError(null);
    try {
      const header = {
        dept_source_id: Number(form.dept_source_id),
        dept_dest_id:   Number(form.dept_dest_id),
        motif:          form.motif || null,
        emetteur:       form.emetteur,
      };
      await api.decharges.create(header, selected);
      onSave();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={styles.header}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Nouvelle décharge</h2>
          <button style={styles.closeBtn} onClick={onCancel}>✕</button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {error && <div style={styles.errorBox}>{error}</div>}

          <div style={styles.grid}>
            {/* Dept source */}
            <div className="form-group">
              <label className="form-label">Département source *</label>
              <select value={form.dept_source_id} onChange={set('dept_source_id')}>
                <option value="">— Sélectionner —</option>
                {depts.map(d => (
                  <option key={d.id} value={d.id}>{d.code} — {d.nom}</option>
                ))}
              </select>
            </div>

            {/* Dept destination */}
            <div className="form-group">
              <label className="form-label">Département destination *</label>
              <select value={form.dept_dest_id} onChange={set('dept_dest_id')}>
                <option value="">— Sélectionner —</option>
                {depts
                  .filter(d => String(d.id) !== form.dept_source_id)
                  .map(d => (
                    <option key={d.id} value={d.id}>{d.code} — {d.nom}</option>
                  ))}
              </select>
            </div>

            {/* Émetteur */}
            <div className="form-group">
              <label className="form-label">Émetteur *</label>
              <input
                value={form.emetteur}
                onChange={set('emetteur')}
                placeholder="Nom et prénom"
              />
            </div>

            {/* Motif */}
            <div className="form-group">
              <label className="form-label">Motif</label>
              <input
                value={form.motif}
                onChange={set('motif')}
                placeholder="Raison du transfert..."
              />
            </div>
          </div>

          {/* Liste articles du dept source */}
          <div style={{ marginTop: 8 }}>
            <div style={styles.artHeader}>
              <span className="form-label" style={{ margin: 0 }}>
                Articles du département source
                {articles.length > 0 && ` (${articles.length})`}
              </span>
              {articles.length > 0 && (
                <button style={styles.selectAllBtn} onClick={toggleAll}>
                  {selected.length === articles.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              )}
            </div>

            {!form.dept_source_id ? (
              <p style={styles.hint}>Sélectionnez un département source pour voir ses articles.</p>
            ) : articles.length === 0 ? (
              <p style={styles.hint}>Aucun article dans ce département.</p>
            ) : (
              <div style={styles.artList}>
                {articles.map(a => (
                  <label key={a.id} style={{
                    ...styles.artItem,
                    background: selected.includes(a.id) ? '#eef2ff' : 'var(--color-bg)',
                    borderColor: selected.includes(a.id) ? '#4f46e5' : 'var(--color-border)',
                  }}>
                    <input
                      type="checkbox"
                      checked={selected.includes(a.id)}
                      onChange={() => toggleArticle(a.id)}
                      style={{ marginRight: 10, accentColor: '#4f46e5' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{a.designation}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>
                        {[a.marque, a.modele].filter(Boolean).join(' ')} —{' '}
                        <code style={{ fontSize: 11 }}>{a.code_barre}</code>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: a.etat === 'bon' ? '#15803d' : '#92400e',
                    }}>
                      {a.etat}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {selected.length > 0 && (
            <p style={{ fontSize: 13, color: '#4f46e5', marginTop: 10, fontWeight: 500 }}>
              {selected.length} article{selected.length > 1 ? 's' : ''} sélectionné{selected.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onCancel} disabled={loading}>Annuler</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Création...' : 'Créer la décharge'}
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
    width: 700,
    maxWidth: '95vw',
    maxHeight: '92vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
  },
  closeBtn: {
    background: 'none', border: 'none',
    fontSize: 18, cursor: 'pointer',
    color: 'var(--color-muted)',
  },
  body: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0 20px',
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    padding: '12px 20px',
    borderTop: '1px solid var(--color-border)',
    flexShrink: 0,
  },
  errorBox: {
    background: '#fee2e2', color: '#991b1b',
    padding: '10px 14px', borderRadius: 6,
    marginBottom: 16, fontSize: 13,
  },
  artHeader: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  selectAllBtn: {
    fontSize: 12, color: '#4f46e5',
    background: 'none', border: 'none',
    cursor: 'pointer', textDecoration: 'underline',
    padding: 0,
  },
  artList: {
    display: 'flex', flexDirection: 'column', gap: 6,
    maxHeight: 280, overflowY: 'auto',
    padding: 4,
  },
  artItem: {
    display: 'flex', alignItems: 'center',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid',
    cursor: 'pointer',
    transition: 'background .1s, border-color .1s',
  },
  hint: {
    color: 'var(--color-muted)', fontSize: 13,
    padding: '12px 0',
  },
};