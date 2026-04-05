import { useState } from 'react';
import { api } from '../lib/api';

export default function Login({ onLogin }) {
  const [login,    setLogin]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit() {
    if (!login.trim() || !password.trim()) {
      return setError('Login et mot de passe obligatoires.');
    }
    setLoading(true);
    setError(null);
    try {
      const user = await api.auth.login(login.trim(), password);
      onLogin(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleSubmit();
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Logo */}
        <div style={styles.logo}>
          <span style={{ fontSize: 40 }}>📦</span>
          <h1 style={styles.title}>Inventaire Physique</h1>
          <p style={styles.subtitle}>Connectez-vous pour continuer</p>
        </div>

        {/* Formulaire */}
        <div style={styles.form}>
          {error && (
            <div style={styles.errorBox}>{error}</div>
          )}

          <div className="form-group">
            <label className="form-label">Login</label>
            <input
              value={login}
              onChange={e => setLogin(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Votre identifiant"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKey}
              placeholder="••••••••"
            />
          </div>

          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '10px 0', marginTop: 8 }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </div>

        <p style={styles.hint}>
          Compte par défaut : <code>admin</code> / <code>admin123</code>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-bg)',
  },
  card: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 12,
    padding: '40px 36px',
    width: 380,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  logo: {
    textAlign: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginTop: 10,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--color-muted)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  errorBox: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '10px 14px',
    borderRadius: 6,
    marginBottom: 14,
    fontSize: 13,
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: 'var(--color-muted)',
    marginTop: 20,
  },
};