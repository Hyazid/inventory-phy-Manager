import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [depts, setDepts]       = useState([]);
  const [articles, setArticles] = useState([]);
  const [decharges, setDecharges] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.departements.getAll(),
      api.articles.getAll({}),
      api.decharges.getAll(),
    ]).then(([d, a, dc]) => {
      setDepts(d);
      setArticles(a);
      setDecharges(dc);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalValeur    = articles.reduce((s, a) => s + (a.valeur_achat || 0), 0);
  const parEtat        = articles.reduce((acc, a) => { acc[a.etat] = (acc[a.etat] || 0) + 1; return acc; }, {});
  const dechargesPending = decharges.filter(d => d.statut === 'brouillon').length;

  if (loading) return <div className="page"><p>Chargement...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>
          {new Date().toLocaleDateString('fr-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiRow}>
        <KpiCard
          label="Total articles"
          value={articles.length}
          icon="📦"
          onClick={() => navigate('/inventaire')}
        />
        <KpiCard
          label="Valeur totale"
          value={`${totalValeur.toLocaleString('fr-DZ')} DA`}
          icon="💰"
        />
        <KpiCard
          label="Départements"
          value={depts.length}
          icon="🏢"
          onClick={() => navigate('/departements')}
        />
        <KpiCard
          label="Décharges en attente"
          value={dechargesPending}
          icon="📋"
          onClick={() => navigate('/decharges')}
          accent={dechargesPending > 0}
        />
      </div>

      <div style={styles.row}>
        {/* État du parc */}
        <div className="card" style={{ flex: 1 }}>
          <h2 style={styles.sectionTitle}>État du parc</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {[
              { key: 'bon',        label: 'Bon état',    color: '#16a34a' },
              { key: 'usage',      label: 'Usagé',       color: '#d97706' },
              { key: 'defectueux', label: 'Défectueux',  color: '#dc2626' },
              { key: 'reforme',    label: 'Réformé',     color: '#6b7280' },
            ].map(({ key, label, color }) => {
              const count = parEtat[key] || 0;
              const pct   = articles.length ? Math.round(count / articles.length * 100) : 0;
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{label}</span>
                    <span style={{ fontWeight: 600 }}>{count} <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: 'var(--color-border)' }}>
                    <div style={{ height: 6, borderRadius: 99, background: color, width: `${pct}%`, transition: 'width .4s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Articles par département */}
        <div className="card" style={{ flex: 1 }}>
          <h2 style={styles.sectionTitle}>Articles par département</h2>
          <div className="table-wrapper" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Département</th>
                  <th style={{ textAlign: 'right' }}>Articles</th>
                  <th style={{ textAlign: 'right' }}>Valeur (DA)</th>
                </tr>
              </thead>
              <tbody>
                {depts.map(d => (
                  <tr
                    key={d.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/inventaire')}
                  >
                    <td>
                      <span style={styles.deptBadge}>{d.code}</span>
                      {' '}{d.nom}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{d.total_articles ?? 0}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-muted)' }}>
                      {d.valeur_totale ? Number(d.valeur_totale).toLocaleString('fr-DZ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dernières décharges */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={styles.sectionTitle}>Dernières décharges</h2>
        {decharges.length === 0 ? (
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginTop: 8 }}>Aucune décharge.</p>
        ) : (
          <div className="table-wrapper" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Date</th>
                  <th>De → Vers</th>
                  <th style={{ textAlign: 'center' }}>Articles</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {decharges.slice(0, 5).map(d => (
                  <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/decharges')}>
                    <td><code style={{ fontSize: 12 }}>{d.numero}</code></td>
                    <td style={{ color: 'var(--color-muted)' }}>
                      {new Date(d.date_decharge).toLocaleDateString('fr-DZ')}
                    </td>
                    <td>
                      <span style={styles.deptBadge}>{d.dept_source_code}</span>
                      {' → '}
                      <span style={styles.deptBadge}>{d.dept_dest_code}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{d.nb_articles}</td>
                    <td>
                      <span style={{
                        ...styles.badge,
                        background: { brouillon: '#fef9c3', validee: '#dcfce7', annulee: '#f1f5f9' }[d.statut],
                        color:      { brouillon: '#92400e', validee: '#15803d', annulee: '#475569' }[d.statut],
                      }}>
                        {{ brouillon: 'Brouillon', validee: 'Validée', annulee: 'Annulée' }[d.statut]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, onClick, accent }) {
  return (
    <div
      className="card"
      style={{
        flex: 1, cursor: onClick ? 'pointer' : 'default',
        borderColor: accent ? '#fbbf24' : undefined,
        background: accent ? '#fffbeb' : undefined,
      }}
      onClick={onClick}
    >
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

const styles = {
  kpiRow: {
    display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap',
  },
  row: {
    display: 'flex', gap: 16, flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: 14, fontWeight: 600,
  },
  deptBadge: {
    background: '#eef2ff', color: '#4f46e5',
    padding: '1px 7px', borderRadius: 99,
    fontSize: 11, fontWeight: 600,
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px', borderRadius: 99,
    fontSize: 12, fontWeight: 600,
  },
};