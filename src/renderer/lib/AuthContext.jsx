import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Récupère la session depuis sessionStorage si elle existe
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  function login(userData) {
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    sessionStorage.removeItem('user');
    setUser(null);
  }

  // Vérifie si l'utilisateur a un rôle suffisant
  // Hiérarchie : admin > gestionnaire > lecteur
  function hasRole(required) {
    const hierarchy = { admin: 3, gestionnaire: 2, lecteur: 1 };
    return (hierarchy[user?.role] || 0) >= (hierarchy[required] || 0);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook d'accès au contexte
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}