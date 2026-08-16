# Proovio — système de design

Interface d'outil professionnel : dense, sobre, lisible sur un écran de bureau comme sur un téléphone en extérieur. Aucune fioriture — l'information doit être vérifiable d'un coup d'œil, parce que le produit sert à certifier et prouver la conformité des réalisations terrain auprès des donneurs d'ordre.

---

## 1. Principes fondamentaux

1. **La preuve d'abord** : Photos avant/après, date, heure et position GPS sont toujours associées et visibles conjointement. Aucune donnée de vérification n'est masquée derrière des sous-menus complexes.
2. **Verdict explicite** : Combinaison systématique d'une couleur, d'une icône et d'un libellé clair. Aucun résultat ne s'appuie uniquement sur la couleur (accessibilité daltonienne).
3. **Résilience et fonctionnement hors-ligne** : L'interface s'affiche instantanément sans aucune ressource bloquante au démarrage. Les replis visuels s'activent automatiquement sans réseau (ex: liste géolocalisée à la place de la carte Leaflet).
4. **Densité d'information maîtrisée** : Présentation sous forme de tableaux denses avec filtres par colonne, typographie régulière, défilement horizontal fluide et panneaux latéraux contextuels.

---

## 2. Palette de couleurs (Design Tokens)

Déclarées en variables CSS dans `:root` au sein de `src/index.html` :

```css
:root {
  --bg: #F8F8F8;
  --surface: #FFFFFF;
  --border: #E5E7EB;
  --text: #1A1A1A;
  --muted: #6B7280;
  --primary: #1A1A1A;
  --green: #22C55E;
  --red: #EF4444;
  --yellow: #F59E0B;
  --blue: #3B82F6;
  --sidebar: 56px;
  --radius: 8px;
}
```

### Usages des teintes :

| Variable     | Hex       | Usage principal                                                    |
|--------------|-----------|--------------------------------------------------------------------|
| `--bg`       | `#F8F8F8` | Fond neutre de l'application                                       |
| `--surface`  | `#FFFFFF` | Cartes, tableaux, panneaux de formulaire, modales                  |
| `--border`   | `#E5E7EB` | Bordures, séparateurs et contours de composants                    |
| `--text`     | `#1A1A1A` | Titres, corps de texte et éléments à fort contraste                |
| `--muted`    | `#6B7280` | Métadonnées, libellés secondaires, sous-titres                     |
| `--primary`  | `#1A1A1A` | Boutons d'action principaux, éléments actifs, icônes d'en-tête     |
| `--green`    | `#22C55E` | Preuve conforme, image authentique, statut actif (`#DCFCE7`/`#15803D`) |
| `--red`      | `#EF4444` | Alerte : détection IA, position incohérente (>500m) (`#FEE2E2`/`#B91C1C`) |
| `--yellow`   | `#F59E0B` | À vérifier : image retouchée, origine indéterminée (`#FEF9C3`/`#854D0E`) |
| `--blue`     | `#3B82F6` | Informations neutres, rôles, filtres sélectionnés (`#DBEAFE`/`#1D4ED8`) |

---

## 3. Typographie & Hiérarchie

Font-stack purement système (aucun appel réseau externe Google Fonts / CDN) pour garantir un chargement immédiat hors-ligne :
`'Inter', 'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif`

| Niveau                | Taille   | Graisse | Casse / Style | Variable / Couleur |
|-----------------------|----------|---------|---------------|--------------------|
| Titre de page (`h1`)  | 16 px    | 600     | Sentence case | `--text`           |
| Titre de section      | 12–13 px | 600     | Sentence case | `--text`           |
| Corps / Cellules      | 12 px    | 400     | Normal        | `--text`           |
| Libellés de formulaire| 10 px    | 500     | Majuscules, `letter-spacing .05em` | `--muted` |
| En-têtes de tableau   | 10 px    | 500     | Majuscules, `letter-spacing .05em` | `--muted` |
| Métadonnées & aides   | 10–11 px | 400     | Normal        | `--muted`          |
| Badges de statut      | 10 px    | 600     | Majuscules, `letter-spacing .04em` | Variable dédiée |

---

## 4. Grille, espacements & composabilité

- **Système modulaire** : Multiples de 4 px (padding 4px, 8px, 12px, 16px, 20px).
- **Rayon de bordure (`--radius`)** : `8px` par défaut pour les conteneurs et modales ; `4-6px` pour les champs de saisie, filtres et badges.
- **Barre latérale (Sidebar)** : Largeur fixe `56px`, icône logo `34x34px`, boutons de navigation `38x38px` avec tooltips au survol.
- **Panneau latéral de formulaire (`.split-panel`)** : Largeur `280px` avec défilement vertical autonome.

---

## 5. Bibliothèque de composants

### Boutons (`.btn`)
- `.btn-primary` : Fond noir `#1A1A1A`, texte blanc, pour l'action principale par écran.
- `.btn-secondary` : Fond transparent, bordure `--border`, pour les actions secondaires.
- `.btn-danger` : Bordure rouge `#FCA5A5`, texte `--red`, fond rosé au survol pour la suppression.
- `.btn-green` : Fond `--green`, texte blanc pour la validation explicite.
- `.btn-icon` : Carré `28x28px`, centré avec icône SVG.
- `.btn-sm` : Format compact (`padding: 4px 9px`, `font-size: 11px`).

### Badges (`.badge`)
Pastilles arrondies (`border-radius: 999px`), texte en majuscules `10px`, graisse `600` :
- `badge-green` : Fond `#DCFCE7`, Texte `#15803D`
- `badge-red`   : Fond `#FEE2E2`, Texte `#B91C1C`
- `badge-yellow`: Fond `#FEF9C3`, Texte `#854D0E`
- `badge-blue`  : Fond `#DBEAFE`, Texte `#1D4ED8`
- `badge-gray`  : Fond `#F3F4F6`, Texte `#6B7280`

### Tableaux interactifs (`.tbl-wrap`)
- Conteneur avec défilement horizontal fluide et barre personnalisée.
- Ligne d'en-tête principale en majuscules `10px`.
- **Seconde ligne d'en-tête (`.filter-row`)** : Champs d'entrée `<input>` et `<select>` intégrés par colonne pour le filtrage instantané.
- Effet de survol sur la ligne : `#FAFAFA`.

### Graphiques SVG faits main (0 dépendance)
- **Camembert statistique (Donut chart)** : Rayon SVG avec `stroke-dasharray`, épaisseur `15px`, total centré au milieu de l'anneau.
- **Barres horizontales (`.chart-bar`)** : Piste neutre `#F3F4F6`, barre de progression colorée proportionnelle au maximum.

### Bloc d'analyse d'image (`.analyse-box`)
- Cadre d'analyse d'image teinté en fonction du verdict (vert / ambre / rouge).
- Affiche l'intitulé du verdict, l'indice de confiance, la marque/modèle de l'appareil et les signaux EXIF/C2PA détectés.

---

## 6. Écrans & Vues principales

| Vue | Structure & Composants clés | Accessibilité Rôles |
|---|---|---|
| **Connexion / Choix profil** | Onglets Donneur d'ordre / Agent terrain, réinitialisation de démonstration | Accessible à tous |
| **Carte des preuves** | Carte Leaflet interactive avec popups riches, filtre par opération, repli en liste hors-ligne | Accessible à tous |
| **Preuves d'opération** | Tableau principal dense, colonnes filtrables, accès direct aux PDF individuels | Donneur d'ordre & Agent (filtré) |
| **Opérations (Campagnes)** | Cartes d'indicateurs (KPIs), ruban des dernières photos, export global (PDF / Excel) | Donneur d'ordre uniquement |
| **Clients** | Graphiques SVG par ville et secteur, tableau des comptes, formulaire d'ajout | Donneur d'ordre uniquement |
| **Agents terrain** | Tableau des agents, attribution de clients, import de fichiers CSV agences | Donneur d'ordre uniquement |
| **Saisie de preuve** | Formulaire en 6 blocs numérotés : Métadonnées, GPS, Photo Avant, Photo Preuve analysée, Mini-dossier, Cadres | Accessible à tous |

---

## 7. Codes visuels & Logique de vérification

Le moteur de vérification (`getVerification()`) croise les données EXIF/C2PA avec l'écart GPS par rapport à l'adresse déclarée (Seuil de tolérance : **500 mètres**).

| Verdict | Badge | Icône | Motif & Critères |
|---|---|---|---|
| **Authentique** | Vert (`badge-green`) | ✅ | Appareil photo / smartphone identifié + position GPS ≤ 500m |
| **Position vérifiée** | Vert (`badge-green`) | ✅ | GPS photo ≤ 500m de l'adresse, origine fichier non certifiée EXIF |
| **Retouchée** | Ambre (`badge-yellow`) | ✏️ | Présence d'un logiciel de retouche (Photoshop, GIMP, etc.) |
| **Générée par IA** | Rouge (`badge-red`) | 🤖 | Balise IPTC/C2PA `trainedAlgorithmicMedia` ou signature de générateur IA |
| **Position incohérente** | Rouge (`badge-red`) | ❌ | Écart GPS > 500m entre la prise de vue et l'adresse déclarée |
| **Indéterminé** | Ambre (`badge-yellow`) | ⚠️ | Métadonnées effacées ou indisponibles |

---

## 8. Exportation & Restitution Client

### Rapport PDF (jsPDF)
- **Format** : Document contractuel et imprimable.
- **En-tête** : Bandeau sombre avec référence de l'opération, nom du client et horodatage.
- **Synthèse** : 4 indicateurs KPI (Total, Conformes, À vérifier, Alertes).
- **Fiches preuves** : Photos Avant / Après en vis-à-vis, coordonnées GPS, adresse et verdict motivé.

### Export Excel (SheetJS)
- Onglet *Synthèse* : Statistiques globales et répartition des verdicts.
- Onglet *Détail des preuves* : Structure identique aux colonnes d'importation CSV.

---

## 9. Conception Adaptative (Responsive Design)

- **Sidebar** : Reste ancrée à `56px` sur le côté gauche.
- **Tableaux** : Défilement horizontal précalculé (`min-width: max-content`) sans tronquer les données textuelles ou métadonnées.
- **Capture Mobile** : L'attribut `capture="environment"` active directement l'appareil photo du smartphone lors de la prise de vue terrain.
