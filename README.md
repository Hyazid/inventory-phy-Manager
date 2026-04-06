# 📦 Inventaire Physique

Application desktop de gestion d'inventaire physique pour entreprise, développée avec Electron, React et SQLite.

---

## Fonctionnalités

- **Inventaire complet** — ajout, modification, suppression (soft) d'articles avec codes-barres CODE128
- **Départements** — affectation de chaque article à un département, suivi des affectations
- **Décharges** — transfert d'articles entre départements avec workflow brouillon → validation
- **Rapports** — export PDF et Excel de l'inventaire et des décharges
- **Utilisateurs** — multi-utilisateurs avec rôles (admin / gestionnaire / lecteur)
- **Backup** — sauvegarde manuelle et automatique de la base de données

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Framework desktop | Electron 29 |
| Interface utilisateur | React 18 + Vite 5 |
| Base de données | SQLite via better-sqlite3 (WAL mode) |
| Codes-barres | bwip-js (pur JS) |
| Export PDF | pdfkit |
| Export Excel | xlsx |
| Routing | react-router-dom (HashRouter) |
| IPC | contextBridge + preload sécurisé |
| CI/CD | GitHub Actions |

---

## Prérequis

- Node.js >= 18
- npm >= 9
- Linux (développement principal) / Windows / macOS

---

## Installation

```bash
# Cloner le repo
git clone https://github.com/TON_USERNAME/inventaire-physique.git
cd inventaire-physique

# Installer les dépendances
npm install
```

---

## Développement

```bash
npm run dev
```

Lance Vite sur `localhost:5173` et Electron en mode développement avec DevTools ouverts.

**Compte par défaut :** `admin` / `admin123`

---

## Structure du projet

```
inventaire-physique/
├── src/
│   ├── main/                    # Electron Main Process (Node.js)
│   │   ├── index.js             # Entry point
│   │   ├── preload.js           # contextBridge IPC sécurisé
│   │   ├── db/
│   │   │   └── database.js      # Init SQLite, schema, migrations, seed
│   │   ├── ipc/                 # Handlers IPC
│   │   │   ├── articles.ipc.js
│   │   │   ├── departements.ipc.js
│   │   │   ├── decharges.ipc.js
│   │   │   ├── rapports.ipc.js
│   │   │   ├── utilisateurs.ipc.js
│   │   │   └── backup.ipc.js
│   │   └── services/            # Services métier
│   │       ├── barcode.service.js
│   │       ├── pdf.service.js
│   │       ├── excel.service.js
│   │       └── backup.service.js
│   └── renderer/                # React App
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── lib/
│       │   ├── api.js           # Wrapper IPC
│       │   └── AuthContext.jsx  # Gestion session utilisateur
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Inventaire/
│       │   ├── Departements/
│       │   ├── Decharges/
│       │   ├── Rapports/
│       │   ├── Utilisateurs/
│       │   ├── Parametres/
│       │   └── Login.jsx
│       └── components/
│           ├── StatusBadge.jsx
│           ├── BarcodeModal.jsx
│           └── ArticleForm.jsx
├── assets/
│   └── icons/
│       ├── icon.png             # Linux (512x512)
│       ├── icon.ico             # Windows
│       └── icon.icns            # macOS
├── .github/
│   └── workflows/
│       └── build.yml            # CI/CD multi-plateforme
├── electron-builder.yml         # Config build
└── vite.config.js
```

---

## Build

### Linux (local)

```bash
npm run build:linux
# Génère : release/*.AppImage et release/*.deb
```

### Toutes plateformes (GitHub Actions)

```bash
# Crée un tag pour déclencher le build automatique
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions buildera automatiquement pour Linux, Windows et macOS. Les artifacts sont disponibles dans **Releases**.

---

## Base de données

La DB SQLite est stockée dans le dossier userData de l'OS :

| OS | Chemin |
|----|--------|
| Linux | `~/.config/inventaire-physique/inventaire.db` |
| Windows | `%APPDATA%\inventaire-physique\inventaire.db` |
| macOS | `~/Library/Application Support/inventaire-physique/inventaire.db` |

### Tables principales

| Table | Description |
|-------|-------------|
| `articles` | Matériels avec code-barre, état, affectation |
| `departements` | Départements / services |
| `categories` | Catégories d'articles |
| `affectations` | Historique des affectations par article |
| `decharges` | Documents de transfert inter-départements |
| `decharge_articles` | Lignes d'une décharge |
| `historique` | Journal d'audit des actions |
| `utilisateurs` | Comptes avec rôles et mots de passe hashés SHA256 |

---

## Rôles utilisateurs

| Rôle | Accès |
|------|-------|
| `lecteur` | Dashboard, Inventaire, Départements (lecture seule) |
| `gestionnaire` | + Décharges, Rapports |
| `admin` | Accès complet + Utilisateurs + Paramètres/Backup |

---

## Backup

Les sauvegardes utilisent la méthode native `.backup()` de better-sqlite3 — atomique et sûre pendant que la DB est en cours d'utilisation.

- **Manuel** : via Paramètres → choisir un dossier
- **Automatique** : planifiable (1h à 1 semaine)
- **Rétention** : 10 derniers backups conservés automatiquement

---

## Licence

Usage interne — tous droits réservés.