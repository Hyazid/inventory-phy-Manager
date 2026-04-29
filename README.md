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
git clone https://github.com/Hyazid/inventaire-physique.git
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



GitHub Actions buildera automatiquement pour Linux, Windows . Les artifacts sont disponibles dans **Releases**.

---

## Base de données

La DB SQLite est stockée dans le dossier userData de l'OS :

| OS | Chemin |
|----|--------|
| Linux | `~/.config/inventaire-physique/inventaire.db` |
| Windows | `%APPDATA%\inventaire-physique\inventaire.db` |


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

## Screenshots
<img width="1330" height="600" alt="Screenshot_2026-04-02_14-10-07" src="https://github.com/user-attachments/assets/7942b491-45b6-413c-a93d-5842127f53ff" />
<br>
<img width="1325" height="601" alt="Screenshot_2026-04-05_15-19-00" src="https://github.com/user-attachments/assets/24eb85d3-a7a8-4c77-a306-9d6ec7169c92" />
<br>
<img width="1326" height="396" alt="Screenshot_2026-04-05_15-18-26" src="https://github.com/user-attachments/assets/9ef5194e-427d-488b-8330-08df119e9573" />
<br>
<img width="1331" height="554" alt="Screenshot_2026-04-05_15-17-53" src="https://github.com/user-attachments/assets/8b365885-c4c2-4103-a10f-ac8f170b4c57" />
<br>
<img width="1319" height="515" alt="Screenshot_2026-04-05_15-17-25" src="https://github.com/user-attachments/assets/aea0e543-3716-420c-8bc2-756ba7d2939a" />
<br>
<img width="1351" height="450" alt="Screenshot_2026-04-05_15-16-54" src="https://github.com/user-attachments/assets/639e8568-7229-441c-999b-7e20927d6abf" />
<br>
<img width="1329" height="644" alt="Screenshot_2026-04-05_15-16-22" src="https://github.com/user-attachments/assets/4950a4f3-dcbc-49b9-a1e4-325dd9758c49" />

<img width="1326" height="583" alt="Screenshot_2026-04-02_14-11-01" src="https://github.com/user-attachments/assets/8ca3ffdf-6a73-4482-9782-fa69ae79327a" />
