import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function Departements() {
  const [depts, setDepts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    api.departements.getAll()
      .then(setDepts)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><p>Chargement...</p></div>;
  if (error)   return <div className="page"><p style={{ color: 'var(--color-danger)' }}>{error}</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Départements</h1>
        <span style={{ color: 'var(--color-muted)', fontSize: 13 }}>
          {depts.length} département{depts.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Nom</th>
                <th>Responsable</th>
                <th>Localisation</th>
                <th style={{ textAlign: 'right' }}>Articles</th>
                <th style={{ textAlign: 'right' }}>Valeur totale</th>
              </tr>
            </thead>
            <tbody>
              {depts.map(d => (
                <tr key={d.id}>
                  <td>
                    <span className="badge" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                      {d.code}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{d.nom}</td>
                  <td style={{ color: 'var(--color-muted)' }}>{d.responsable || '—'}</td>
                  <td style={{ color: 'var(--color-muted)' }}>{d.localisation || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {d.total_articles ?? 0}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--color-muted)' }}>
                    {d.valeur_totale
                      ? `${Number(d.valeur_totale).toLocaleString('fr-DZ')} DA`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}