import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

const ROLE_STYLE = {
  admin:         { background: '#fef3c7', color: '#92400e', label: 'Admin'        },
  gestionnaire:  { background: '#eef2ff', color: '#3730a3', label: 'Gestionnaire' },
  lecteur:       { background: '#f1f5f9', color: '#475569', label: 'Lecteur'      },
};

const EMPTY_FORM = {
  nom: '', prenom: '', login: '', password: '', role: 'gestionnaire',
};

export default function Utilisateurs() {
  const { user: currentUser, hasRole } = useAuth();

  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [error,    setError]    = useState(null);
  const [saving,   setSaving]   = useState(false);

  // Changement de mot de passe
  const [pwdOpen,  setPwdOpen]  = useState(false);
  const [pwdForm,  setPwdForm]  = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [pwdError, setPwdError] = useState(null);

  function load() {
    setLoading(true);
    api.utilisateurs.getAll()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(u) {
    setEditing(u);
    setForm({ nom: u.nom, prenom: u.prenom, login: u.login, password: '', role: u.role });
    setError(null);
    setFormOpen(true);
  }

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit() {
    if (!form.nom.trim() || !form.prenom.trim() || !form.login.trim()) {
      return setError('Nom, prénom et login sont obligatoires.');
    }
    if (!editing && !form.password.trim()) {
      return setError('Le mot de passe est obligatoire pour un nouvel utilisateur.');
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.utilisateurs.update(editing.id, form);
      } else {
        await api.utilisateurs.create(form);
      }
      setFormOpen(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id) {
    try {
      await api.utilisateurs.toggle(id);
      load();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleChangePassword() {
    if (!pwdForm.newPassword.trim())               return setPwdError('Nouveau mot de passe obligatoire.');
    if (pwdForm.newPassword !== pwdForm.confirm)   return setPwdError('Les mots de passe ne correspondent pas.');
    if (pwdForm.newPassword.length < 4)            return setPwdError('Minimum 4 caractères.');
    setSaving(true);
    setPwdError(null);
    try {
      await api.utilisateurs.changePassword(currentUser.id, pwdForm.oldPassword, pwdForm.newPassword);
      setPwdOpen(false);
      setPwdForm({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (e) {
      setPwdError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // Seul l'admin peut gérer les utilisateurs
  if (!hasRole('admin')) {
    return (
      <div className="page">
        <h1 className="page-title">Accès refusé</h1>
        <p style={{ color: 'var(--color-muted)', marginTop: 8 }}>
          Vous n'avez pas les droits pour accéder à cette page.
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Utilisateurs</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setPwdOpen(true)}>🔑 Mon mot de passe</button>
          <button className="btn-primary" onClick={openNew}>+ Nouvel utilisateur</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          {loading ? (
            <p style={{ padding: 20, color: 'var(--color-muted)' }}>Chargement...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Login</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const rs = ROLE_STYLE[u.role] || ROLE_STYLE.lecteur;
                  return (
                    <tr key={u.id} style={{ opacity: u.actif ? 1 : 0.5 }}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{u.prenom} {u.nom}</div>
                        {u.id === currentUser.id && (
                          <span style={{ fontSize: 11, color: '#4f46e5' }}>← vous</span>
                        )}
                      </td>
                      <td><code style={{ fontSize: 12 }}>{u.login}</code></td>
                      <td>
                        <span style={{
                          ...styles.badge,
                          background: rs.background,
                          color: rs.color,
                        }}>
                          {rs.label}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          ...styles.badge,
                          background: u.actif ? '#dcfce7' : '#f1f5f9',
                          color:      u.actif ? '#15803d' : '#475569',
                        }}>
                          {u.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td>
                        <div style={styles.actions}>
                          <button onClick={() => openEdit(u)} title="Modifier">✏️</button>
                          {u.id !== currentUser.id && (
                            <button
                              onClick={() => handleToggle(u.id)}
                              title={u.actif ? 'Désactiver' : 'Activer'}
                              style={{ color: u.actif ? 'var(--color-danger)' : 'var(--color-success)' }}
                            >
                              {u.actif ? '🔒' : '🔓'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal formulaire utilisateur */}
      {formOpen && (
        <div style={styles.overlay} onClick={() => setFormOpen(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>
                {editing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h2>
              <button style={styles.closeBtn} onClick={() => setFormOpen(false)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              {error && <div style={styles.errorBox}>{error}</div>}
              <div style={styles.grid}>
                <div className="form-group">
                  <label className="form-label">Prénom *</label>
                  <input value={form.prenom} onChange={set('prenom')} placeholder="Prénom" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nom *</label>
                  <input value={form.nom} onChange={set('nom')} placeholder="Nom" />
                </div>
                <div className="form-group">
                  <label className="form-label">Login *</label>
                  <input value={form.login} onChange={set('login')} placeholder="identifiant" />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    {editing ? 'Nouveau mot de passe (laisser vide = inchangé)' : 'Mot de passe *'}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={set('password')}
                    placeholder="••••••••"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Rôle</label>
                  <select value={form.role} onChange={set('role')}>
                    <option value="admin">Admin — accès complet</option>
                    <option value="gestionnaire">Gestionnaire — créer/modifier</option>
                    <option value="lecteur">Lecteur — consultation uniquement</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setFormOpen(false)} disabled={saving}>Annuler</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal changement mot de passe */}
      {pwdOpen && (
        <div style={styles.overlay} onClick={() => setPwdOpen(false)}>
          <div style={{ ...styles.modal, width: 380 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Changer mon mot de passe</h2>
              <button style={styles.closeBtn} onClick={() => setPwdOpen(false)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              {pwdError && <div style={styles.errorBox}>{pwdError}</div>}
              <div className="form-group">
                <label className="form-label">Ancien mot de passe</label>
                <input
                  type="password"
                  value={pwdForm.oldPassword}
                  onChange={e => setPwdForm(p => ({ ...p, oldPassword: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={pwdForm.newPassword}
                  onChange={e => setPwdForm(p => ({ ...p, newPassword: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirmer</label>
                <input
                  type="password"
                  value={pwdForm.confirm}
                  onChange={e => setPwdForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setPwdOpen(false)}>Annuler</button>
              <button className="btn-primary" onClick={handleChangePassword} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Changer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  badge: {
    display: 'inline-block', padding: '2px 8px',
    borderRadius: 99, fontSize: 12, fontWeight: 600,
  },
  actions: { display: 'flex', gap: 4, justifyContent: 'center' },
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'var(--color-surface)',
    borderRadius: 10, width: 560,
    maxWidth: '95vw', maxHeight: '90vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: '1px solid var(--color-border)',
  },
  modalFooter: {
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    padding: '12px 20px', borderTop: '1px solid var(--color-border)',
  },
  closeBtn: {
    background: 'none', border: 'none',
    fontSize: 18, cursor: 'pointer', color: 'var(--color-muted)',
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' },
  errorBox: {
    background: '#fee2e2', color: '#991b1b',
    padding: '10px 14px', borderRadius: 6,
    marginBottom: 14, fontSize: 13,
  },
};