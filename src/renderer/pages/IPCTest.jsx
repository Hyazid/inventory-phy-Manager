import { useState } from 'react';
import { api } from '../lib/api';

export default function IPCTest() {
  const [log, setLog] = useState([]);

  function addLog(label, result, isError = false) {
    setLog(prev => [
      { label, result: JSON.stringify(result, null, 2), isError, ts: Date.now() },
      ...prev,
    ]);
  }

  async function run(label, fn) {
    try {
      const res = await fn();
      addLog(label, res);
    } catch (err) {
      addLog(label, err.message, true);
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>🧪 IPC Bridge Test</h1>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <button onClick={() => run('departements:getAll', () => api.departements.getAll())}>
          GET départements
        </button>
        <button onClick={() => run('articles:getAll', () => api.articles.getAll())}>
          GET articles
        </button>
        <button onClick={() => run('articles:create', () =>
          api.articles.create({
            designation: 'PC Test IPC',
            marque: 'Dell',
            modele: 'Latitude 5520',
            categorie_id: 1,
            dept_actuel_id: 2,
            etat: 'bon',
            valeur_achat: 75000,
            operateur: 'test',
          })
        )}>
          CREATE article test
        </button>
        <button onClick={() => run('dept:create', () =>
          api.departements.create({
            code: 'TEST',
            nom: 'Département Test',
            responsable: 'M. Test',
            localisation: 'Bâtiment Test',
          })
        )}>
          CREATE département test
        </button>
      </div>

      <div style={{ fontFamily: 'monospace', fontSize: '13px' }}>
        {log.map(entry => (
          <div
            key={entry.ts}
            style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              borderRadius: '6px',
              background: entry.isError ? '#fff0f0' : '#f0fff4',
              border: `1px solid ${entry.isError ? '#ffcccc' : '#b7ebc0'}`,
            }}
          >
            <strong style={{ color: entry.isError ? '#c00' : '#080' }}>
              {entry.isError ? '✗' : '✓'} {entry.label}
            </strong>
            <pre style={{ margin: '0.5rem 0 0', overflowX: 'auto' }}>{entry.result}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}