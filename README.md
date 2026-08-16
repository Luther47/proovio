# Proovio

**Collecte et vérification de preuves terrain.**

Un agent se rend sur place, photographie la réalisation, et l'outil certifie automatiquement que la
photo a bien été prise à cet endroit, à ce moment, et qu'elle n'a pas été générée par une IA. Le
donneur d'ordre reçoit un rapport PDF ou Excel directement vérifiable par son client.

## Démarrer en une minute

```bash
cd src && python -m http.server 8642
```

Ouvrir `http://localhost:8642/index.html`, choisir un profil, cliquer sur **Entrer**.

Ni installation, ni dépendance : toute l'application tient dans `src/index.html`.

## Ce que fait l'outil

- **Vérification automatique des photos** — lecture des métadonnées réelles du fichier : appareil
  photo d'origine, logiciel de retouche, marqueur officiel IPTC/C2PA d'image générée par IA,
  coordonnées GPS. Aucune validation humaine n'intervient.
- **Horodatage et géolocalisation** capturés au moment du dépôt de la photo, comparés à l'adresse
  déclarée (tolérance 500 m).
- **Deux profils** — donneur d'ordre (accès complet) et agent terrain (ses propres preuves).
- **Reporting client** — PDF avec synthèse, récapitulatif et fiches photo avant/après ; export Excel
  en deux onglets.
- **Import Excel/CSV** des clients et des agents, avec modèles fournis dans `docs/`.
- **Cartographie** des preuves validées, avec regroupement des marqueurs.
- **Fonctionne sans connexion** : la carte bascule en liste, l'Excel en CSV, le PDF en page
  imprimable.

## Documentation

| Fichier            | Pour qui                                                          |
|--------------------|-------------------------------------------------------------------|
| `DEPLOIEMENT.md`   | Mettre en ligne — **prérequis HTTPS** et limites connues           |
| `DESIGN.md`        | Système de design, écrans, codes visuels de la vérification        |
| `CLAUDE.md`        | Reprendre le code — structure, modèle de données, pièges           |

## À savoir avant d'aller plus loin

Il s'agit d'un **prototype fonctionnel**, pas encore d'un produit multi-utilisateurs :

- les données restent dans le navigateur (`localStorage`), rien n'est synchronisé ni sauvegardé ;
- l'accès se fait sans mot de passe, par simple choix de profil ;
- HTTPS est indispensable, sinon la géolocalisation ne fonctionne pas.

Le détail et la feuille de route sont dans `DEPLOIEMENT.md`.
