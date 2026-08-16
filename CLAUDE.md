# Proovio — instructions projet

Outil de **collecte et vérification de preuves terrain**. Un agent se déplace, photographie une
réalisation, et l'outil certifie automatiquement que la photo a bien été prise sur place et qu'elle
n'a pas été générée par une IA.

## Structure

```
proovio/
├── src/index.html            ← TOUTE l'application (HTML + CSS + JS dans un seul fichier)
├── src/import-logic.js       ← logique pure de l'import en masse (voir « Import en masse » ci-dessous)
├── src/import-logic.test.js  ← ses tests (`node --test src/import-logic.test.js`)
├── docs/               ← modèles de fichiers d'import (CSV)
├── DESIGN.md           ← système de design et spécifications d'écrans
├── DEPLOIEMENT.md      ← mise en ligne, prérequis, limites connues
└── CLAUDE.md           ← ce fichier
```

**Il n'y a ni build, ni `npm install`, ni dépendance à installer.** `src/index.html` s'ouvre tel quel
dans un navigateur. C'est volontaire : le fichier se transmet par email et se déploie sur n'importe
quel hébergement statique.

Ne pas découper le fichier en modules sans raison forte : l'autonomie du fichier unique est une
caractéristique du produit, pas un accident. **Seule exception assumée** : `src/import-logic.js`,
chargé par `<script src="import-logic.js">` juste avant le script principal. Il ne contient que de la
logique pure (aucun DOM, aucun réseau, aucun `localStorage`) pour rester testable avec `node --test`
sans navigateur — voir « Import en masse » plus bas. Ne pas y ajouter d'appel réseau ou DOM ; ce genre
de code reste dans `index.html`.

## Lancer et tester

```bash
cd src && python -m http.server 8642
```

Puis ouvrir `http://localhost:8642/index.html`.

Ouvrir en `file://` fonctionne pour l'essentiel, mais **la géolocalisation et l'appareil photo
exigent `localhost` ou HTTPS**. Toujours tester via le serveur local.

Après une modification du modèle de données, cliquer sur **« ↻ Réinitialiser les données de
démonstration »** sur l'écran d'accueil : `seedData()` ne s'exécute que si le stockage est vide et ne
migre pas les anciennes données.

Vérifier la syntaxe avant de livrer :

```bash
node --check <(sed -n '/DATA STORE/,/<\/script>/p' src/index.html | sed '$d')
```

Le `sed '$d'` final retire la ligne `</script>` elle-même (le motif de fin de plage l'inclut), qui
ferait sinon échouer `node --check` sur un `<` isolé même quand le JS est valide.

Pour la logique d'import en masse (`src/import-logic.js`), lancer ses tests :

```bash
node --test src/import-logic.test.js
```

## Données

Tout est en `localStorage`, **préfixe `md_`** (`md_installations`, `md_campagnes`, `md_clients`,
`md_installateurs`, `md_session`). Ce préfixe vient du premier nom du produit ; le changer casserait
les données existantes des utilisateurs, donc on le garde.

Vocabulaire interne ≠ vocabulaire affiché. À l'écran on dit :

| Clé technique     | Libellé affiché      |
|-------------------|----------------------|
| `installations`   | Preuves d'opération  |
| `campagnes`       | Opérations           |
| `installateurs`   | Agents terrain       |
| `clients`         | Clients              |

Champs d'une preuve : `photo1` (avant), `photo2` (après/preuve), `photo2Lat/Lng/Alt`,
`photo2DateTime`, `photo2Analyse` (résultat de l'analyse d'image), `photosPlus[]` (mini dossier).

## Rôles

Deux profils, choisis à l'accueil **sans mot de passe** (décision produit assumée pour la phase de
test) :

- **Donneur d'ordre** (`role: 'client'`) — accès complet à toutes les vues et à toutes les données.
- **Agent terrain** (`role: 'agent'`) — ne voit que ses propres preuves ; vues Clients, Opérations
  et Agents inaccessibles.

Le cloisonnement passe par `ROLE_VIEWS`, `scopedInstallations()` et `scopedCampagnes()`. Toute
nouvelle vue doit être déclarée dans `ROLE_VIEWS`, sinon `nav()` la refuse.

⚠️ C'est un cloisonnement **d'affichage**, pas une sécurité. Voir DEPLOIEMENT.md.

## Fonctionnement hors connexion

Les librairies externes (Leaflet, jsPDF, SheetJS) sont chargées **après** l'affichage de l'interface
par `loadOptionalLibs()`, jamais en `<head>`. Une coupure réseau ne doit jamais produire une page
blanche.

Chaque fonctionnalité qui dépend d'une librairie a un repli :

| Sans connexion | Repli automatique                          |
|----------------|--------------------------------------------|
| Carte Leaflet  | liste géolocalisée (`renderMapFallback`)   |
| Export `.xlsx` | CSV point-virgule + BOM (`downloadCSV`)    |
| PDF jsPDF      | page imprimable (`printOperationReport`)   |
| Géocodage BAN  | ligne importable, marquée « à positionner manuellement » (`impGeocodeRows`) |
| Mini-carte de repositionnement | deux champs latitude/longitude (`impOpenGeoModal`) |

**Toute nouvelle dépendance externe doit suivre ce schéma.** Ne jamais ajouter de `<script src>`
bloquant dans le `<head>`.

## Import en masse de points de vérification

Assistant en 6 étapes (Fichier → Mapping → Paramètres → Vérification → Import → Rapport), fonctions
préfixées `imp*`, état dans l'objet global `IMP`. La logique pure (mapping automatique par alias,
coefficient de Dice, détection d'en-tête/séparateur CSV, normalisation CP/téléphone, éclatement d'une
adresse en une seule cellule, dédoublonnage texte, construction/lecture du CSV BAN) vit dans
`src/import-logic.js` — voir « Structure » plus haut pour pourquoi ce fichier existe à part.

**Géocodage** : à l'entrée de l'étape 4, `impGeocodeRows()` résout par lot (500 lignes, endpoint CSV
de `api-adresse.data.gouv.fr`, gratuit, sans clé, **adresses françaises uniquement**) les lignes sans
latitude/longitude. Résultat mis en cache dans `IMP.geocoded` (clé = adresse normalisée). Score de
confiance sous `ImportLogic.GEOCODE_CONFIDENCE_THRESHOLD` (0,6) ou adresse introuvable → ligne
`warn`, repositionnable à la main via le bouton 📍 (`impOpenGeoModal`, mini-carte Leaflet ou repli
deux champs numériques hors connexion). Éditer manuellement adresse/CP/ville dans le tableau
(`impEditCell`) invalide le géocodage précédent de la ligne, qui repasse « à placer ».

## Analyse d'image

`analyserImage(file)` lit les métadonnées réelles du fichier — lecteur EXIF et PNG écrit à la main,
sans librairie (`lireJPEG`, `lirePNG`, `lireTIFF`). Il cherche :

- le marqueur IPTC/C2PA `trainedAlgorithmicMedia` (standard des images générées) ;
- une signature de générateur (`OUTILS_IA`) ;
- la marque et le modèle d'appareil photo (EXIF `Make` / `Model`) ;
- un logiciel de retouche (`OUTILS_RETOUCHE`) ;
- les coordonnées GPS inscrites dans la photo.

`getVerification(inst)` croise ce résultat avec l'écart entre la position de la photo et l'adresse
déclarée, et rend un des six verdicts de `VERIF_OPTIONS`.

**Limite à connaître** : l'analyse porte sur les métadonnées. Elle est fiable quand elles existent,
mais une image dont les métadonnées ont été effacées tombe en « Indéterminé », pas en « IA ».
Détecter une IA à partir des pixels demande un service serveur ; le point de branchement est
`analyserImage`, qui doit rester `async`.

## Conventions de code

- Français partout : libellés, commentaires, noms de fonctions métier.
- Pas de framework, pas de JSX, pas de build. `document.getElementById` et template literals.
- Les commentaires expliquent le **pourquoi métier**, pas le comment technique.
- Le filtrage des preuves passe par `installationsFiltrees()`, utilisée à la fois par le tableau et
  par les exports : ce qui est affiché est exactement ce qui est exporté. Ne pas dupliquer.
- Les colonnes d'export (`ligneExportPreuve`) sont alignées sur les colonnes d'import.
- Chaque rendu de vue est enveloppé dans un `try/catch` par `nav()` : une vue en erreur ne doit pas
  bloquer l'application.

## Pièges vérifiés

- `analyserImage` ne lit que les **512 premiers Ko** du fichier ; les métadonnées y sont toujours.
- Les photos sont stockées en base64 dans `localStorage`, plafonné à ~5 Mo par navigateur. Au-delà
  d'une trentaine de preuves photographiées, l'écriture échoue silencieusement. C'est la première
  chose à corriger avec un vrai stockage serveur.
- `navigator.geolocation.coords.altitude` est presque toujours `null` sur ordinateur ; c'est normal.
- Ne jamais écrire d'accents combinants en clair dans une classe de regex : toujours passer par
  les échappements `\u0300-\u036f` (voir `pickField`), sinon les éditeurs corrompent le fichier.
- Dans `ImportLogic.autoMapColumns`, le rapprochement par inclusion de sous-chaine n'est applique
  qu'aux alias d'au moins 4 caracteres normalises. Sans ce garde-fou, un alias court comme `x`, `y`,
  `cp`, `tel` ou `lon` matche quasiment n'importe quel intitule libre (`"Colonne A"` contient `lon`)
  et mappe une colonne au hasard sur `longitude`/`code_postal`/etc. Trouve par les tests
  (`src/import-logic.test.js`), pas en relecture -- utile de le savoir avant d'y retoucher.
- En test navigateur (Playwright ou autre), les objets declares en `const`/`let` au premier niveau du
  script principal (`IMP`, `LS`, `SESSION`...) ne sont **pas** des proprietes de `window` : acceder a
  `window.IMP` depuis `page.evaluate()` renvoie toujours `undefined` et fait echouer silencieusement
  toute attente dessus. Utiliser l'identifiant nu (`IMP`, pas `window.IMP`) dans le code evalue.
