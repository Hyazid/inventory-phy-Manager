import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';
import BarcodeModal from '../../components/BarcodeModal';
import ArticleForm  from '../../components/ArticaleForm';

export default function Inventaire() {
  const [articles, setArticles]   = useState([]);
  const [depts, setDepts]         = useState([]);
  const [loading, setLoading]     = useState(true);

  // Filtres
  const [search, setSearch]       = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterEtat, setFilterEtat] = useState('');

  // Modals
  const [barcode, setBarcode]     = useState(null); // { code, designation }
  const [formOpen, setFormOpen]   = useState(false);
  const [editing, setEditing]     = useState(null);  // article à modifier

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.articles.getAll({
        search:  search  || undefined,
        dept_id: filterDept || undefined,
        etat:    filterEtat || undefined,
      });
      setArticles(data);
    } finally {
      setLoading(false);
    }
  }, [search, filterDept, filterEtat]);

  useEffect(() => { api.departements.getAll().then(setDepts); }, []);
  useEffect(() => { load(); }, [load]);

  function openEdit(article) { setEditing(article); setFormOpen(true); }
  function openNew()         { setEditing(null);    setFormOpen(true); }
  function closeForm()       { setFormOpen(false);  setEditing(null);  }
  function afterSave()       { closeForm(); load(); }

  async function handleDelete(id) {
    if (!confirm('Marquer cet article comme réformé ?')) return;
    await api.articles.delete(id);
    load();
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Inventaire</h1>
        <button className="btn-primary" onClick={openNew}>+ Nouvel article</button>
      </div>

      {/* Filtres */}
      <div style={styles.filters}>
        <input
          placeholder="Rechercher (désignation, code-barre, n° série)..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 2, minWidth: 220 }}
        />
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ flex: 1 }}>
          <option value="">Tous les départements</option>
          {depts.map(d => <option key={d.id} value={d.id}>{d.code} — {d.nom}</option>)}
        </select>
        <select value={filterEtat} onChange={e => setFilterEtat(e.target.value)} style={{ flex: 1 }}>
          <option value="">Tous les états</option>
          <option value="bon">Bon état</option>
          <option value="usage">Usagé</option>
          <option value="defectueux">Défectueux</option>
          <option value="reforme">Réformé</option>
        </select>
        <button onClick={load}>↻ Actualiser</button>
      </div>

      {/* Compteur */}
      <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 12 }}>
        {loading ? 'Chargement...' : `${articles.length} article(s)`}
      </p>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Code-barre</th>
                <th>Désignation</th>
                <th>Marque / Modèle</th>
                <th>Catégorie</th>
                <th>Département</th>
                <th>État</th>
                <th>Valeur (DA)</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && articles.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-muted)', padding: 32 }}>
                  Aucun article trouvé
                </td></tr>
              )}
              {articles.map(a => (
                <tr key={a.id}>
                  <td>
                    <span
                      style={styles.codeLink}
                      onClick={() => setBarcode({ code: a.code_barre, designation: a.designation })}
                      title="Afficher le code-barre"
                    >
                      {a.code_barre}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{a.designation}</td>
                  <td style={{ color: 'var(--color-muted)' }}>{[a.marque, a.modele].filter(Boolean).join(' ') || '—'}</td>
                  <td>{a.categorie || '—'}</td>
                  <td>
                    {a.dept_code
                      ? <span style={styles.deptBadge}>{a.dept_code}</span>
                      : <span style={{ color: 'var(--color-muted)' }}>—</span>
                    }
                  </td>
                  <td><StatusBadge etat={a.etat} /></td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {a.valeur_achat ? a.valeur_achat.toLocaleString('fr-DZ') : '—'}
                  </td>
                  <td>
                    <div style={styles.actions}>
                      <button onClick={() => openEdit(a)} title="Modifier">✏️</button>
                      <button
                        onClick={() => setBarcode({ code: a.code_barre, designation: a.designation })}
                        title="Code-barre"
                      >
                        ▦
                      </button>
                      <button onClick={() => handleDelete(a.id)} title="Réformer" style={{ color: 'var(--color-danger)' }}>
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {barcode && (
        <BarcodeModal
          code={barcode.code}
          designation={barcode.designation}
          onClose={() => setBarcode(null)}
        />
      )}
      {formOpen && (
        <ArticleForm
          initial={editing}
          onSave={afterSave}
          onCancel={closeForm}
        />
      )}
    </div>
  );
}

const styles = {
  filters: {
    display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap',
  },
  codeLink: {
    fontFamily: 'monospace', fontSize: 12,
    color: 'var(--color-primary)', cursor: 'pointer',
    textDecoration: 'underline dotted',
  },
  deptBadge: {
    background: '#eef2ff', color: 'var(--color-primary)',
    padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 600,
  },
  actions: { display: 'flex', gap: 4, justifyContent: 'center' },
};