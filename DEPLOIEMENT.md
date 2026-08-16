# Proovio — déploiement

## Ce que c'est

Une application **entièrement côté navigateur**. Un seul fichier, `src/index.html`, contenant le
HTML, le CSS et le JavaScript. Pas de serveur applicatif, pas de base de données, pas de build.

Déployer revient donc à **servir un fichier statique**.

## Prérequis, dans l'ordre d'importance

### 1. HTTPS est obligatoire

Les navigateurs refusent la géolocalisation et l'accès à l'appareil photo sur une origine non
sécurisée. Or ce sont les deux fonctions centrales du produit.

- ✅ `https://votre-domaine.fr` — fonctionne
- ✅ `http://localhost` — fonctionne (développement uniquement)
- ❌ `http://192.168.1.20` ou `http://serveur-interne` — **la capture GPS échouera**
- ⚠️ `file://` (double-clic sur le fichier) — l'interface s'affiche, mais pas de GPS fiable

Tout hébergeur statique moderne fournit HTTPS gratuitement.

### 2. Accès sortant vers `unpkg.com`

Trois librairies sont chargées à l'exécution : Leaflet (carte), jsPDF (PDF), SheetJS (Excel).
Si le réseau de l'entreprise bloque `unpkg.com`, l'application **fonctionne quand même** et bascule
automatiquement : carte → liste, Excel → CSV, PDF → page imprimable. Un bandeau l'indique.

Pour un environnement fermé, télécharger les trois fichiers, les placer dans `src/vendor/` et
remplacer la constante `U` dans `loadOptionalLibs()` par `'vendor/'`.

### 3. Navigateurs

Chrome, Edge, Firefox et Safari récents. Pas de support Internet Explorer.

## Mise en ligne

**Netlify / Vercel / Cloudflare Pages** — glisser le dossier `src/` dans l'interface, ou connecter
le dépôt Git en indiquant `src` comme répertoire de publication. Aucune commande de build.

**GitHub Pages** — pousser le contenu de `src/` sur la branche `gh-pages`.

**nginx**

```nginx
server {
    listen 443 ssl;
    server_name proovio.exemple.fr;
    root /var/www/proovio;
    index index.html;
}
```

**IIS** — copier `src/` dans le répertoire du site, définir `index.html` comme document par défaut.

Vérification après mise en ligne : ouvrir l'URL, cliquer sur **Entrer**, ajouter une photo de preuve
et confirmer que le navigateur demande l'autorisation de géolocalisation.

## Limites connues — à lire avant toute mise en production

Ces points ne sont pas des bugs mais des choix assumés de la phase prototype. Ils déterminent le
travail restant.

### Aucune authentification

L'écran d'accueil laisse choisir librement son profil, sans mot de passe. C'est une demande
explicite pour la phase de test. Le cloisonnement entre donneur d'ordre et agent terrain est un
filtre d'affichage : n'importe qui peut ouvrir la console du navigateur et tout lire.

**À prévoir** : une vraie authentification serveur avant d'ouvrir l'outil à des utilisateurs
externes.

### Les données ne sortent pas du navigateur

Tout est dans le `localStorage` du poste. Concrètement :

- deux personnes qui ouvrent l'outil ne voient **pas** les mêmes données ;
- vider le cache du navigateur **efface tout** ;
- rien n'est sauvegardé ni synchronisé ;
- le quota est d'environ **5 Mo**, soit une trentaine de photos. Au-delà, l'enregistrement échoue.

**À prévoir** : c'est le chantier principal. Une API et une base de données, avec les photos
stockées en objet (S3 ou équivalent) plutôt qu'en base64.

### L'analyse d'image porte sur les métadonnées

L'outil lit réellement l'EXIF et les marqueurs IPTC/C2PA du fichier : c'est fiable pour repérer une
image générée par Midjourney ou DALL·E qui a conservé sa signature, ou pour confirmer qu'une photo
vient d'un iPhone.

En revanche, une image dont les métadonnées ont été effacées (capture d'écran, ré-enregistrement)
sera classée « Indéterminé », pas « Générée par IA ». Une détection sur les pixels demande un
service serveur spécialisé.

**À prévoir** : brancher une API de détection dans `analyserImage()` — la fonction est déjà `async`
et son résultat est stocké tel quel dans `photo2Analyse`.

### Envoi d'email

Le bouton d'envoi ouvre le logiciel de messagerie du poste via `mailto:`. Aucun email n'est envoyé
par le serveur.

## Feuille de route suggérée

1. **Backend et base de données** — condition de tout usage réel multi-utilisateurs.
2. **Authentification** avec mots de passe hachés et sessions serveur.
3. **Stockage objet des photos**, avec redimensionnement à l'envoi.
4. **API de détection IA** sur les pixels, en complément des métadonnées.
5. Envoi des rapports par email depuis le serveur.
6. Journal d'audit horodaté, pour rendre les preuves opposables.

## Contenu du dossier

```
proovio/
├── src/index.html                  L'application complète
├── docs/modele-agents.csv          Modèle d'import des agents terrain
├── docs/modele-clients.csv         Modèle d'import des clients
├── CLAUDE.md                       Instructions pour reprendre le code
├── DESIGN.md                       Système de design et écrans
└── DEPLOIEMENT.md                  Ce fichier
```
