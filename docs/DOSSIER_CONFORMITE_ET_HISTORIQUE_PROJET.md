# DOSSIER D'AUDIT, DE CONFORMITÉ ET D'HISTORIQUE TECHNIQUE — PROJET PROOVIO

**Date de consolidation :** 15 Août 2026  
**Document officiel de traçabilité & conformité technique**  
**Classification :** Référence Maîtrise d'Ouvrage & Maîtrise d'Œuvre (MOA / MOE)  
**Projet :** PROOVIO — Plateforme de Collecte & Certification de Preuves Terrain  

---

## 1. Fiche Signalétique & Contexte du Projet

### 1.1. Objet et Mission
Proovio est une solution logicielle conçue pour certifier, horodater et géolocaliser les preuves de réalisations terrain (affichage publicitaire, pose d'enseignes, interventions techniques, audits physiques). Elle résout la problématique de la falsification d'images (génération par Intelligence Artificielle, retouche photo, photographies hors-site) et remplace les circuits informels et non vérifiables (canaux WhatsApp, emails épars) par un pipeline certifié et auditable.

### 1.2. Environnement & Contraintes Architecturales Fondamentales
*   **Architecture "Zero-Build / Single-File" :** L'application centrale réside dans `src/index.html` (HTML + CSS + JavaScript vanilla). Elle s'exécute directement dans le navigateur sans chaîne de compilation (`npm`, `webpack`, `vite`), permettant une distribution immédiate et une exploitation sans serveur lourd.
*   **Résilience Hors-Connexion (Offline-First) :** Aucune ressource bloquante n'est requise au démarrage. Les bibliothèques tierces (Leaflet pour la cartographie, SheetJS pour la manipulation tabulaire, jsPDF pour la génération contractuelle) sont chargées de manière différée (`loadOptionalLibs`) avec des mécanismes de repli automatiques (fallback en listes textuelles et exports CSV).
*   **Persistance Locale :** Stockage dans le `localStorage` du navigateur avec isolation sous le préfixe strict `md_*` (`md_installations`, `md_campagnes`, `md_clients`, `md_installateurs`, `md_import_batches`, `md_column_mappings`, `md_session`).

---

## 2. Chronologie Intégrale des Échanges, Demandes & Itérations

Ce registre retrace fidèlement l'ensemble des interventions, arbitrages et validations intervenus tout au long du développement.

### Itération 1 — Modernisation de la Landing Page Marketing
*   **Demande utilisateur initiale :** Remplacement de la landing page par la version maquettée (`SOURCE /proovio-landing-v2.html`), modernisation du design et intégration du logo officiel (`src/logo-proovio.png`).
*   **Mise en œuvre :**
    *   Refonte de `src/landing.html` en adoptant un design monochrome ("noir et blanc" épuré et contrasté) aligné sur le design system Proovio.
    *   Remplacement des pictogrammes génériques par le logo Proovio PNG en haute résolution dans la barre de navigation et le pied de page.
    *   Intégration d'un panneau comparatif visuel ("Avant / Après") opposant le chaos des photos WhatsApp non certifiées aux cartes d'opération Proovio avec verdict d'authenticité.

### Itération 2 — Ajustements Ergonomiques & Identité Visuelle de la Landing
*   **Demandes d'ajustements utilisateur :**
    1.  *Design Noir et Blanc :* Harmonisation stricte des variables CSS (`:root`) pour éliminer les teintes vertes résiduelles sur les blocs principaux au profit d'une palette contrastée (`--bg: #F8F8F8`, `--surface: #FFFFFF`, `--border: #E5E7EB`, `--text: #1A1A1A`).
    2.  *Suppression de badge :* Retrait du badge d'en-tête « Collecte de preuve terrain, en temps réel » jugé redondant dans la section héro.
    3.  *Dimensionnement du logo :* Agrandissement de la surface d'affichage du logo de marque dans le bandeau supérieur.
    4.  *Section FAQ pleine largeur :* Extension du conteneur accordéon des « Questions fréquentes » sur 100 % de la largeur du bloc conteneur pour maximiser la lisibilité.
    5.  *Bouton d'accès plateforme :* Implémentation d'un bouton d'action directe « Accéder à la plateforme » dans le menu de navigation, positionné immédiatement à côté du CTA « Demander une démo » pour basculer directement vers l'application `index.html`.
    6.  *Description d'entreprise en pied de page :* Ajout sous le logo du footer d'un texte synthétique résumant le rôle de tiers de confiance et de certification terrain de Proovio.

### Itération 3 — Cadrage & Architecture de l'Import en Masse Excel/CSV
*   **Spécification du besoin métier par l'utilisateur :**
    *   Implantation d'une fonction d'importation de fichiers tabulaires (.xlsx, .xls, .csv) dans l'onglet « Preuves d'opération » afin de créer massivement des points de vérification injectés au statut « En attente ».
    *   **Contrainte forte :** Aucune contrainte de reformatage pour le donneur d'ordre. L'application doit s'adapter au fichier du client (noms de colonnes libres, structure hétérogène, lignes de préambule, cellules vides) sans template imposé.
    *   **Exigence de cadrage préalable :** Proposition formelle du schéma de données étendu et de l'architecture du flux avant tout développement applicatif.
*   **Validation du dossier d'architecture :**
    *   Acceptation de la modélisation 100% client-side (SheetJS, Géoplateforme IGN, LocalStorage).
    *   Validation du pipeline en 6 étapes interactives (Dépôt -> Auto-Mapping -> Paramètres du lot -> Vérification -> Importation -> Rapport & Rollback).

### Itération 4 — Développement du Wizard d'Importation Universel
*   Création de l'interface en assistant par étapes (`view-import-points`).
*   Intégration du moteur d'heuristique de détection de ligne d'en-tête.
*   Implémentation du moteur d'auto-mapping basé sur la distance de Sørensen-Dice.
*   Ajout des normalisations de données (zéros de code postal, formats téléphoniques, dates séries Excel, gestion UTF-8 / Windows-1252).
*   Mise en place de la traçabilité des lots via `import_batch_id` et du mécanisme d'annulation atomique.

---

## 3. Spécifications Fonctionnelles Détaillées

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FLUX GLOBAL DE CERTIFICATION                       │
│                                                                             │
│  [Donneur d'Ordre] ──(Dépôt Excel/CSV)──> [Wizard d'Import Universel]       │
│                                                   │                         │
│                                        (Auto-Mapping & Normalisation)       │
│                                                   │                         │
│                                                   ▼                         │
│                                       [Points « En Attente »]               │
│                                                   │                         │
│                                       (Affectation terrain)                 │
│                                                   ▼                         │
│  [Agent Terrain]   ──(Capture Photo)───> [Moteur d'Analyse EXIF/C2PA]       │
│                                                   │                         │
│                                          (Contrôle GPS & IA)                │
│                                                   ▼                         │
│                                       [Verdict de Certification]            │
│                                                   │                         │
│  [Restitution]     <──(Rapport / PDF)─── [Rapport Contractuel Validé]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1. Rôles et Cloisonnement de Sécurité
L'application applique un partitionnement strict des vues et des périmètres d'accès :
*   **Donneur d'ordre (`role: 'client'`) :**
    *   Accès à l'ensemble du cycle de vie : Carte globale, Preuves d'opération, Clients, Opérations (Campagnes), Agents terrain, Formulaire de création unitaire et Wizard d'importation de masse.
    *   Droits d'administration, création d'opérations et extraction des rapports consolidés.
*   **Agent terrain (`role: 'agent'`) :**
    *   Accès restreint aux fonctionnalités opérationnelles : Carte filtrée sur son périmètre, liste de ses points d'intervention assignés et formulaire de prise de vue / soumission de preuve.
    *   Vues Clients, Opérations et Gestion des équipes inaccessibles.

### 3.2. Moteur d'Analyse & Certification des Preuves
Le verdict d'intégrité (`getVerification`) repose sur le croisement direct des métadonnées du fichier image avec la localisation physique :
1.  **Vérification de l'Appareil & Matériel :** Extraction des tags EXIF (`Make`, `Model`, `DateTimeOriginal`).
2.  **Détection IA & Synthèse :** Détection des signatures C2PA/IPTC (`trainedAlgorithmicMedia`) et des générateurs connus (Midjourney, DALL-E, Stable Diffusion).
3.  **Détection de Retouche :** Identification des logiciels d'édition (`OUTILS_RETOUCHE` : Photoshop, GIMP, Lightroom).
4.  **Écart Géométrique GPS :** Calcul de la distance haversine entre les coordonnées GPS de la prise de vue et l'adresse déclarée du point. **Seuil d'incohérence : > 500 mètres.**

#### Matrice des Verdicts de Certification :
| Verdict | Statut Visuel | Badge CSS | Signification Technique & Métier |
| :--- | :---: | :---: | :--- |
| **Authentique** | Conforme | `badge-green` | Appareil physique authentifié + GPS photo ≤ 500 m de l'adresse cible. |
| **Position vérifiée** | Conforme | `badge-green` | GPS photo ≤ 500 m, métadonnées matérielles partielles mais intègres. |
| **Retouchée** | À vérifier | `badge-yellow` | Présence avérée d'un outil de retouche logicielle dans les métadonnées. |
| **Indéterminé** | À vérifier | `badge-yellow` | Métadonnées dépouillées ou inaccessibles (ex: capture d'écran). |
| **Générée par IA** | Alerte / Rejet | `badge-red` | Marqueur IPTC/C2PA IA ou signature de synthétiseur d'images détectée. |
| **Position incohérente** | Alerte / Rejet | `badge-red` | Écart supérieur à 500 mètres entre la prise de vue réelle et le site déclaré. |

---

## 4. Architecture du Pipeline d'Importation Universel

Le module d'import de masse résout la contrainte de variabilité totale des fichiers fournis par les donneurs d'ordre.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PIPELINE D'IMPORT EN 6 ÉTAPES                         │
│                                                                             │
│  [1. Dépôt]       ─ Drag & Drop, SheetJS / CSV, Détection d'en-tête         │
│         │                                                                   │
│  [2. Mapping]     ─ Algorithme Sørensen-Dice, Alias multilingues, Mémoire   │
│         │                                                                   │
│  [3. Paramètres]  ─ Opération cible, Valeurs par défaut sans écrasement     │
│         │                                                                   │
│  [4. Validation]  ─ Nettoyage CP/Tél, Déduplication, Grille éditable        │
│         │                                                                   │
│  [5. Ingestion]   ─ Écriture localStorage par lots de 500, Progress bar     │
│         │                                                                   │
│  [6. Bilan]       ─ Traçabilité batch, Rejets CSV, Rollback atomique        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.1. Étape 1 — Dépôt & Détection Structurelle
*   **Formats supportés :** Classeurs Excel (`.xlsx`, `.xls`) via SheetJS, fichiers texte délimités (`.csv`).
*   **Détection du délimiteur CSV :** Évaluation dynamique de la fréquence des séparateurs (virgule `,`, point-virgule `;`, tabulation `\t`) sur la première ligne utile.
*   **Détection de l'encodage :** Traitement natif UTF-8 avec repli automatique sur `windows-1252` (ANSI) en présence d'anomalies de décodage de caractères accentués.
*   **Algorithme de détection de l'en-tête (Header Detection Engine) :**
    *   Analyse des 20 premières lignes du classeur.
    *   Calcul d'un score heuristique : proportion de cellules textuelles courtes (longueur < 50 car.), présence de mots-clés sémantiques (`nom`, `adresse`, `ville`, `cp`, `site`, `enseigne`), pénalisation des nombres isolés et des blocs descriptifs longs (> 60 car.).
    *   Sélection automatique de la ligne optimale tout en laissant un contrôle d'ajustement manuel à l'utilisateur.
*   **Prise en charge multi-feuilles :** Détection du nombre d'onglets du classeur Excel et mise à disposition d'un sélecteur dédié.

### 4.2. Étape 2 — Correspondance Automatique des Colonnes (Auto-Mapping)
*   **Normalisation sémantique :** Décomposition Unicode NFD (`\u0300-\u036f`), passage en minuscules et élimination des espaces et caractères de ponctuation superflus.
*   **Dictionnaire d'alias étendu :**
    *   `nom` : `nom`, `enseigne`, `name`, `point de vente`, `site`, `raison sociale`, `pdv`, `magasin`, `commerce`
    *   `adresse` : `adresse`, `adr`, `address`, `rue`, `voie`, `adresse postale`, `adresse complete`
    *   `code_postal` : `code postal`, `cp`, `zip`, `code_postal`, `postal code`, `zipcode`
    *   `ville` : `ville`, `commune`, `city`, `localite`, `localité`
    *   `type` : `type`, `type de cadre`, `support`, `type support`
    *   `taille` : `format`, `taille`, `size`, `dimension`
    *   `contact_tel` : `telephone`, `téléphone`, `tel`, `phone`, `mobile`, `portable`
*   **Calcul de proximité :** Application du coefficient de similarité de Sørensen-Dice sur bigrammes. Un seuil de confiance $\ge 0.60$ déclenche l'association automatique.
*   **Apprentissage & Mémoire :** Mémorisation de la configuration de mapping validée par profil donneur d'ordre dans `md_column_mappings`.

### 4.3. Étape 3 — Paramètres & Valeurs par Défaut du Lot
*   Attribution à une opération (campagne) existante ou sélection neutre.
*   Définition des attributs de lot (Type de support, Format/Taille, Durée contractuelle, Date d'échéance, Agent terrain assigné).
*   **Règle d'or :** Les valeurs par défaut renseignées ne s'appliquent qu'aux cellules vides du fichier source et n'écrasent jamais les données explicites présentes dans le classeur.

### 4.4. Étape 4 — Validation, Normalisation & Déduplication
*   **Normalisation des Codes Postaux :** Reconstitution des zéros non significatifs omis par les logiciels tableurs (ex: `1000` $\rightarrow$ `01000`, `7500` $\rightarrow$ `07500`) via `padStart(5, '0')`.
*   **Normalisation Téléphonique :** Conversion des formats numériques Excel bruts en chaînes téléphoniques françaises standard (reconstitution du préfixe `0` pour les nombres à 9 chiffres, conversion du préfixe `33`).
*   **Conversion des Dates Séries Excel :** Traduction des entiers de dates issus du moteur SSF d'Excel vers la norme ISO-8601.
*   **Moteur de Déduplication :**
    *   *Déduplication externe (base existante) :* Comparaison lexicale du nom ($\text{Dice} \ge 0.80$) combinée à la proximité géographique (distance haversine < 50 m ou similarité d'adresse $> 0.60$).
    *   *Déduplication interne (intra-fichier) :* Marquage des occurrences répétées au sein du même jeu de données.
*   **Grille Éditable Inline :** Tableau interactif permettant la modification directe des cellules textuelles erronées ou incomplètes avant l'injection en base.

### 4.5. Étape 5 — Ingestion & Traitement Asynchrone
*   Découpage de l'écriture en micro-lots (batches de 500 enregistrements) avec temporisation asynchrone pour éviter tout gel du thread principal du navigateur.
*   Génération d'un identifiant unique de lot : `IMP_[UID]`.
*   Injection des entités dans `md_installations` avec le statut initial `En attente`.

### 4.6. Étape 6 — Bilan, Restitution & Droit au Rollback
*   Tableau de bord de synthèse : nombre de points créés, avertissements levés, lignes rejetées.
*   **Export des anomalies :** Génération et téléchargement immédiat d'un fichier CSV récapitulant les lignes exclues avec le motif détaillé de non-conformité.
*   **Annulation Atomique (Rollback) :** Possibilité d'annuler l'intégralité d'un lot d'import en un clic via `impCancelBatch()`. La suppression en cascade de toutes les installations associées à l'`import_batch_id` est exécutée, sous réserve qu'aucune preuve terrain n'ait déjà été capturée sur l'une des lignes du lot.

---

## 5. Schéma de Données Référentiel (Data Dictionary)

### 5.1. Collection `installations` (`md_installations`)
Représente l'entité centrale de point de contrôle / preuve terrain.

| Champ | Type | Obligatoire | Origine | Description technique & métier |
| :--- | :--- | :---: | :--- | :--- |
| `id` | String | Oui | Système | Identifiant unique (ex: `INST_K8Z2A1B9`). |
| `nom` | String | Oui | Fichier / Form | Dénomination commerciale ou nom de l'enseigne. |
| `ville` | String | Oui | Fichier / Form | Commune d'implantation. |
| `adresse` | String | Non | Fichier / Form | Adresse postale (numéro et voie). |
| `code_postal` | String | Non | Fichier / Form | Code postal à 5 chiffres (avec zéro initial préservé). |
| `lat` | Float | Non | Fichier / BAN | Latitude de référence du point physique. |
| `lng` | Float | Non | Fichier / BAN | Longitude de référence du point physique. |
| `campagne` | String | Non | Default / Form | Clé étrangère pointant vers `md_campagnes.id`. |
| `installateur` | String | Non | Default / Form | Clé étrangère pointant vers `md_installateurs.id`. |
| `statut` | String | Oui | Système | `En attente` (à réaliser) ou `Réalisé` (prouvé). |
| `type` | String | Non | Fichier / Default| Type de support (`SOUPLE`, `DUR`, `AIMANTÉ`). |
| `taille` | String | Non | Fichier / Default| Format du cadre (`Small`, `Medium`, `Large`). |
| `duree` | String | Non | Fichier / Default| Durée d'affichage contractuelle (ex: `3 ans`). |
| `contact_nom` | String | Non | Fichier | Nom du référent ou gestionnaire du site. |
| `contact_tel` | String | Non | Fichier | Numéro de téléphone de contact. |
| `commentaire` | String | Non | Fichier / Form | Notes internes ou consignes spécifiques. |
| `tags` | Array[Str] | Non | Fichier | Étiquettes de catégorisation libre. |
| `metadata` | Object | Non | Fichier | Données non mappées préservées au format JSON clé/valeur. |
| `geo_score` | Float | Non | Géocodage | Indice de confiance de géolocalisation (0.00 à 1.00). |
| `geo_source` | String | Non | Système | Origine des coordonnées (`ban`, `file`, `manual`). |
| `import_batch_id`| String | Non | Système | Identifiant de traçabilité du lot d'importation. |
| `date_echeance`| String | Non | Default / Form | Date limite de réalisation (format `YYYY-MM-DD`). |
| `photo1` | String | Non | Agent | Photo de la façade (devanture avant intervention). |
| `photo2` | String | Non | Agent | Photo de la réalisation (preuve principale). |
| `photo2Lat` | Float | Non | Agent EXIF | Latitude capturée lors de la prise de vue. |
| `photo2Lng` | Float | Non | Agent EXIF | Longitude capturée lors de la prise de vue. |
| `photo2Alt` | Float | Non | Agent EXIF | Altitude capturée lors de la prise de vue. |
| `photo2DateTime`| String | Non | Agent EXIF | Horodatage certifié ISO-8601 de la photo preuve. |
| `photo2Analyse` | Object | Non | Système | Résultat brut du moteur d'analyse forensique d'image. |
| `photosPlus` | Array[Obj] | Non | Agent | Mini-dossier de prises de vue complémentaires du site. |
| `cadres` | Array[Obj] | Non | Système | Décomposition détaillée des cadres rattachés. |

### 5.2. Collection `import_batches` (`md_import_batches`)
Registre de traçabilité des imports de masse réalisés sur la plateforme.

| Champ | Type | Description technique & métier |
| :--- | :--- | :--- |
| `id` | String | Identifiant unique du lot (`IMP_xxxxxxxx`). |
| `fichier` | String | Nom du fichier d'origine téléversé. |
| `auteur` | String | Identifiant de l'utilisateur ayant déclenché l'import. |
| `date` | String | Horodatage ISO-8601 de l'opération d'ingestion. |
| `lignes_total` | Integer | Nombre total de lignes lues dans le fichier source. |
| `lignes_importees`| Integer | Nombre effectif d'enregistrements créés en base. |
| `lignes_doublons` | Integer | Nombre de lignes ayant soulevé une alerte de doublon. |
| `lignes_erreurs` | Integer | Nombre de lignes rejetées pour anomalie bloquante. |
| `campagne` | String | ID de l'opération de rattachement global. |
| `defaults` | Object | Instantané des valeurs par défaut appliquées lors du traitement. |
| `statut` | String | État d'intégrité du lot (`terminé`, `annulé`). |
| `annulable` | Boolean | Indicateur de révocabilité du lot. |
| `erreurs` | Array[Obj] | Journal détaillé des lignes rejetées et des motifs d'erreur. |

### 5.3. Collection `column_mappings` (`md_column_mappings`)
Mémoire des associations de colonnes personnalisées par donneur d'ordre.

| Champ | Type | Description technique & métier |
| :--- | :--- | :--- |
| `id` | String | Identifiant de la règle de mapping (`MAP_xxxxxxxx`). |
| `client_id` | String | Donneur d'ordre propriétaire de la règle. |
| `colonnes_source`| Array[Str] | Liste ordonnée des en-têtes du fichier d'origine. |
| `mapping` | Object | Table de conversion (`{ 'col_source': 'champ_cible' }`). |
| `date` | String | Date de dernière mise à jour de la règle. |

---

## 6. Registre des Décisions d'Architecture (Architecture Decision Records — ADR)

### ADR-01 : Conservation du Modèle Monolithique Client-Side ("Single-File")
*   **Statut :** Validé.
*   **Contexte :** L'application a été initialement conçue dans un fichier unique `src/index.html` combinant balisage, styles et logique métier.
*   **Décision :** Maintien absolu de cette architecture sans introduction de bundler ou de dépendance serveur.
*   **Justification :** Portabilité maximale, facilité de déploiement sur tout CDN statique, possibilité d'utilisation en environnement local déconnecté sans configuration technique.

### ADR-02 : Thème Visuel Monochrome & Système de Design Glassmorphism
*   **Statut :** Validé.
*   **Contexte :** La landing page et l'application doivent refléter l'autorité, la rigueur et la neutralité d'un organisme de certification.
*   **Décision :** Refonte selon une charte contrastée noir/blanc/niveaux de gris, rehaussée de bordures subtiles et de surfaces translucides en verre dépoli (glassmorphism), réservant les teintes vertes, jaunes et rouges exclusivement aux statuts d'intégrité des preuves.
*   **Justification :** Clarté de lecture pour les donneurs d'ordre et respect strict des règles d'accessibilité visuelle.

### ADR-03 : Import Universel Sans Modèle Rigide Imposé
*   **Statut :** Validé.
*   **Contexte :** Les donneurs d'ordre exploitent des logiciels de gestion disparates et refusent de devoir ressaisir ou reconditionner leurs exports dans un modèle unique.
*   **Décision :** Implémentation d'un moteur d'ingestion tolérant capable d'analyser la structure de n'importe quel fichier tabulaire, d'identifier les en-têtes et de proposer une association sémantique intelligente.
*   **Justification :** Élimination totale de la friction à l'embarquement (onboarding) et réduction drastique du temps de déploiement des campagnes.

### ADR-04 : Traçabilité et Révocabilité des Ingestions Massives
*   **Statut :** Validé.
*   **Contexte :** Une erreur de manipulation lors d'un import de plusieurs milliers de lignes peut corrompre la base de travail des équipes terrain.
*   **Décision :** Tagging systématique de chaque entité créée avec un `import_batch_id` et mise à disposition d'une fonction de rollback atomique protégée contre l'effacement de preuves déjà collectées.
*   **Justification :** Sécurité opérationnelle et conformité aux standards d'audit d'intégrité des données.

---

## 7. Matrice de Conformité & Validation Technique

| Domaine d'Audit | Critère d'Exigence | Mécanisme Validé | Statut de Conformité |
| :--- | :--- | :--- | :---: |
| **Intégrité de Code** | Validité syntaxique pure de l'interpréteur JS | `node --check` sur les blocs applicatifs | **CONFORME** |
| **Résilience Réseau** | Disponibilité intégrale sans dépendances CDN bloquantes | `loadOptionalLibs` avec fallbacks natifs | **CONFORME** |
| **Sécurité d'Accès** | Partitionnement fonctionnel Donneur d'ordre vs Agent | `ROLE_VIEWS` & `scopedInstallations()` | **CONFORME** |
| **Tolérance Fichiers** | Ingestion de formats Excel (`.xlsx`, `.xls`) et CSV | Moteur SheetJS & Détection automatique de séparateurs | **CONFORME** |
| **Qualité des Données**| Préservation des codes postaux avec zéro initial | Algorithme `padStart(5, '0')` | **CONFORME** |
| **Normalisation Tél.**| Conversion des entiers Excel en numéros français | Détection regex des longueurs et préfixes | **CONFORME** |
| **Traçabilité** | Historisation de chaque point créé via son lot source | Clé `import_batch_id` et table `md_import_batches` | **CONFORME** |
| **Droit au Rollback** | Annulation sécurisée d'un lot d'import erroné | `impCancelBatch()` avec verrou anti-suppression si photo | **CONFORME** |

---

*Le présent document constitue l'état officiel des spécifications, décisions et réalisations architecturales du projet Proovio à la date du 15 août 2026.*
