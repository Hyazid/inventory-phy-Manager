import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import NouvelleDecharge from './NouvelleDecharge';
import DechargeDetail   from './DechargeDetail';

const STATUT_STYLE = {
  brouillon: { background: '#fef9c3', color: '#92400e', label: 'Brouillon' },
  validee:   { background: '#dcfce7', color: '#15803d', label: 'Validée'   },
  annulee:   { background: '#f1f5f9', color: '#475569', label: 'Annulée'   },
};

export default function Decharges() {
  const [decharges, setDecharges] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [formOpen, setFormOpen]   = useState(false);
  const [selected, setSelected]   = useState(null); // id décharge pour le détail

  async function load() {
    setLoading(true);
    try {
      const data = await api.decharges.getAll();
      setDecharges(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function afterCreate() {
    setFormOpen(false);
    load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Décharges</h1>
        <button className="btn-primary" onClick={() => setFormOpen(true)}>
          + Nouvelle décharge
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          {loading ? (
            <p style={{ padding: 20, color: 'var(--color-muted)' }}>Chargement...</p>
          ) : decharges.length === 0 ? (
            <p style={{ padding: 20, color: 'var(--color-muted)' }}>Aucune décharge enregistrée.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Date</th>
                  <th>De</th>
                  <th>Vers</th>
                  <th>Émetteur</th>
                  <th style={{ textAlign: 'center' }}>Articles</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {decharges.map(d => {
                  const st = STATUT_STYLE[d.statut] || {};
                  return (
                    <tr key={d.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {d.numero}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-muted)' }}>
                        {new Date(d.date_decharge).toLocaleDateString('fr-DZ')}
                      </td>
                      <td>
                        <span style={styles.deptBadge}>{d.dept_source_code}</span>
                        <span style={{ color: 'var(--color-muted)', fontSize: 12, marginLeft: 6 }}>
                          {d.dept_source_nom}
                        </span>
                      </td>
                      <td>
                        <span style={styles.deptBadge}>{d.dept_dest_code}</span>
                        <span style={{ color: 'var(--color-muted)', fontSize: 12, marginLeft: 6 }}>
                          {d.dept_dest_nom}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-muted)' }}>{d.emetteur}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{d.nb_articles}</td>
                      <td>
                        <span style={{
                          ...styles.badge,
                          background: st.background,
                          color: st.color,
                        }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => setSelected(d.id)} title="Voir le détail">
                          🔍
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal nouvelle décharge */}
      {formOpen && (
        <NouvelleDecharge
          onSave={afterCreate}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {/* Modal détail / validation */}
      {selected && (
        <DechargeDetail
          id={selected}
          onClose={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}

const styles = {
  deptBadge: {
    background: '#eef2ff', color: '#4f46e5',
    padding: '2px 8px', borderRadius: 99,
    fontSize: 12, fontWeight: 600,
  },
  badge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 99,
    fontSize: 12,
    fontWeight: 600,
  },
};