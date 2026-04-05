import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const EMPTY = {
  designation:      '',
  description:      '',
  marque:           '',
  modele:           '',
  numero_serie:     '',
  date_acquisition: '',
  valeur_achat:     '',
  etat:             'bon',
  categorie_id:     '',
  dept_actuel_id:   '',
  notes:            '',
};

export default function ArticleForm({ initial, onSave, onCancel }) {
  const isEdit = !!initial;

  const [form, setForm]       = useState(isEdit ? { ...EMPTY, ...initial } : EMPTY);
  const [depts, setDepts]     = useState([]);
  const [cats, setCats]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    api.departements.getAll().then(setDepts).catch(console.error);
    api.categories.getAll().then(setCats).catch(console.error);
  }, []);

  // Fermer avec Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit() {
    if (!form.designation.trim()) {
      setError('La désignation est obligatoire.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...form,
        categorie_id:   form.categorie_id   ? Number(form.categorie_id)   : null,
        dept_actuel_id: form.dept_actuel_id ? Number(form.dept_actuel_id) : null,
        valeur_achat:   form.valeur_achat   ? Number(form.valeur_achat)   : null,
        operateur:      'admin',
      };
      if (isEdit) {
        await api.articles.update(initial.id, payload);
      } else {
        await api.articles.create(payload);
      }
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
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>
            {isEdit ? 'Modifier l\'article' : 'Nouvel article'}
          </h2>
          <button style={styles.closeBtn} onClick={onCancel}>✕</button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {error && (
            <div style={styles.errorBox}>{error}</div>
          )}

          <div style={styles.grid}>
            {/* Désignation — pleine largeur */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Désignation *</label>
              <input value={form.designation} onChange={set('designation')} placeholder="Ex: Ordinateur portable Dell" />
            </div>

            {/* Marque */}
            <div className="form-group">
              <label className="form-label">Marque</label>
              <input value={form.marque} onChange={set('marque')} placeholder="Dell, HP, Lenovo..." />
            </div>

            {/* Modèle */}
            <div className="form-group">
              <label className="form-label">Modèle</label>
              <input value={form.modele} onChange={set('modele')} placeholder="Latitude 5520..." />
            </div>

            {/* N° série */}
            <div className="form-group">
              <label className="form-label">N° de série</label>
              <input value={form.numero_serie} onChange={set('numero_serie')} placeholder="SN-XXXXXXX" />
            </div>

            {/* Date acquisition */}
            <div className="form-group">
              <label className="form-label">Date d'acquisition</label>
              <input type="date" value={form.date_acquisition} onChange={set('date_acquisition')} />
            </div>

            {/* Valeur achat */}
            <div className="form-group">
              <label className="form-label">Valeur d'achat (DA)</label>
              <input type="number" min="0" value={form.valeur_achat} onChange={set('valeur_achat')} placeholder="0" />
            </div>

            {/* État */}
            <div className="form-group">
              <label className="form-label">État</label>
              <select value={form.etat} onChange={set('etat')}>
                <option value="bon">Bon état</option>
                <option value="usage">Usagé</option>
                <option value="defectueux">Défectueux</option>
                <option value="reforme">Réformé</option>
              </select>
            </div>

            {/* Catégorie */}
            <div className="form-group">
              <label className="form-label">Catégorie</label>
              <select value={form.categorie_id} onChange={set('categorie_id')}>
                <option value="">— Sélectionner —</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>

            {/* Département */}
            <div className="form-group">
              <label className="form-label">Département affecté</label>
              <select value={form.dept_actuel_id} onChange={set('dept_actuel_id')}>
                <option value="">— Sélectionner —</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.code} — {d.nom}</option>)}
              </select>
            </div>

            {/* Description — pleine largeur */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={set('description')}
                placeholder="Détails supplémentaires..."
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Notes — pleine largeur */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Notes</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={set('notes')}
                placeholder="Observations, remarques..."
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onCancel} disabled={loading}>Annuler</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer l\'article'}
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
    width: 680,
    maxWidth: '95vw',
    maxHeight: '90vh',
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
    background: '#fee2e2',
    color: '#991b1b',
    padding: '10px 14px',
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 13,
  },
};