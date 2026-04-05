import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Login        from './pages/Login';
import Dashboard    from './pages/Dashboard';
import Inventaire   from './pages/Inventaire';
import Departements from './pages/Departements';
import Decharges    from './pages/Decharges';
import Rapports     from './pages/Rapports';
import Utilisateurs from './pages/Utilisateurs';
import Parametres from './pages/Parametres';

const NAV = [
  { to: '/',             label: 'Dashboard',    icon: '▦',  role: 'lecteur'      },
  { to: '/inventaire',   label: 'Inventaire',   icon: '☰',  role: 'lecteur'      },
  { to: '/departements', label: 'Départements', icon: '⊞',  role: 'lecteur'      },
  { to: '/decharges',    label: 'Décharges',    icon: '📋', role: 'gestionnaire' },
  { to: '/rapports',     label: 'Rapports',     icon: '📊', role: 'gestionnaire' },
  { to: '/utilisateurs', label: 'Utilisateurs', icon: '👥', role: 'admin'        },
  { to: '/parametres', label: 'Paramètres', icon: '⚙️', role: 'admin' }
];

// Shell principal — affiché uniquement si connecté
function AppShell() {
  const { user, logout, hasRole } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">📦</span>
          <span className="logo-text">Inventaire</span>
        </div>

        <nav>
          {NAV.filter(n => hasRole(n.role)).map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={styles.userBox}>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{user.prenom} {user.nom}</div>
            <div style={styles.userRole}>{user.role}</div>
          </div>
          <button style={styles.logoutBtn} onClick={logout} title="Déconnexion">⏻</button>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/"             element={<Dashboard />}    />
          <Route path="/inventaire/*" element={<Inventaire />}   />
          <Route path="/departements" element={<Departements />} />
          <Route path="/parametres" element={
            hasRole('admin') ? <Parametres /> : <Navigate to="/" />
          } />
          <Route path="/decharges"    element={
            hasRole('gestionnaire') ? <Decharges /> : <Navigate to="/" />
          } />
          <Route path="/rapports"     element={
            hasRole('gestionnaire') ? <Rapports /> : <Navigate to="/" />
          } />
          <Route path="/utilisateurs" element={
            hasRole('admin') ? <Utilisateurs /> : <Navigate to="/" />
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

// Point d'entrée — gère login/logout
function AppShellWrapper() {
  const { user, login } = useAuth();
  if (!user) return <Login onLogin={login} />;
  return <AppShell />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppShellWrapper />
    </AuthProvider>
  );
}

const styles = {
  userBox: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px',
    borderTop: '1px solid var(--color-border)',
    marginTop: 'auto',
  },
  userInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  userName: { fontSize: 13, fontWeight: 600 },
  userRole: { fontSize: 11, color: 'var(--color-muted)', textTransform: 'capitalize' },
  logoutBtn: {
    background: 'none', border: 'none',
    fontSize: 18, cursor: 'pointer',
    color: 'var(--color-muted)', padding: 4,
  },
};