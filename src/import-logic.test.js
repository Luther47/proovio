// Tests de la logique pure de l'import en masse (src/import-logic.js).
// Exécution : node --test src/import-logic.test.js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const IL = require('./import-logic.js');

// ── 1. Fichier vide, ou sans aucune colonne exploitable ──
test('fichier CSV vide -> aucune ligne', () => {
  assert.deepEqual(IL.parseCsvText(''), []);
  assert.deepEqual(IL.parseCsvText('   \n  \n'), []);
});

test('fichier sans colonne exploitable -> mapping tout ignoré', () => {
  const { mapping } = IL.autoMapColumns(['Colonne A', 'Colonne B', 'Référence interne']);
  assert.equal(Object.values(mapping).every(v => v === '__ignore__'), true);
});

// ── 2. Lignes vides au milieu, lignes de total en bas ──
test('lignes entièrement vides au milieu sont ignorées', () => {
  const rawRows = [
    ['Nom', 'Adresse'],
    ['Boulangerie Dupont', '1 rue de Paris'],
    ['', ''],
    ['Boucherie Martin', '2 rue de Lyon'],
  ];
  const { headers, dataRows } = IL.buildDataRows(rawRows, 0);
  assert.deepEqual(headers, ['Nom', 'Adresse']);
  assert.equal(dataRows.length, 2);
  assert.equal(dataRows[1].Nom, 'Boucherie Martin');
});

test('ligne de total en bas de fichier est ignorée', () => {
  const rawRows = [
    ['Nom', 'Adresse'],
    ['Boulangerie Dupont', '1 rue de Paris'],
    ['Total', ''],
  ];
  const { dataRows } = IL.buildDataRows(rawRows, 0);
  assert.equal(dataRows.length, 1);
});

test("l'en-tête n'est pas en ligne 1 (titres/logos au-dessus)", () => {
  const rawRows = [
    ['Export du 12/03/2026', '', ''],
    ['', '', ''],
    ['Nom', 'Adresse', 'Ville'],
    ['Boulangerie Dupont', '1 rue de Paris', 'Paris'],
  ];
  const idx = IL.detectHeaderRow(rawRows);
  assert.equal(idx, 2);
});

// ── 3. Adresse en une seule cellule vs. éclatée sur plusieurs colonnes ──
test('adresse en une seule cellule est éclatée en adresse/CP/ville', () => {
  const r = IL.splitFullAddress('12 Place de la Garonne, 31000 Toulouse');
  assert.deepEqual(r, { adresse: '12 Place de la Garonne', code_postal: '31000', ville: 'Toulouse' });
});

test('adresse déjà éclatée sur plusieurs colonnes reste inchangée (pas de CP à extraire)', () => {
  const r = IL.splitFullAddress('12 Place de la Garonne');
  assert.equal(r.adresse, '12 Place de la Garonne');
  assert.equal(r.code_postal, '');
  assert.equal(r.ville, '');
});

// ── 4. Codes postaux ayant perdu leur zéro initial ──
test('code postal sans zéro initial est repadded', () => {
  assert.equal(IL.normalizePostalCode('1000'), '01000');
  assert.equal(IL.normalizePostalCode(1000), '01000');
  assert.equal(IL.normalizePostalCode('75015'), '75015');
});

// ── 5. Numéros de téléphone au format numérique Excel ──
test('téléphone numérique Excel (sans le 0 initial) est corrigé', () => {
  assert.equal(IL.normalizePhone('612345678'), '0612345678');
  assert.equal(IL.normalizePhone(612345678), '0612345678');
});

test('téléphone au format international +33 est ramené au format national', () => {
  assert.equal(IL.normalizePhone('33612345678'), '0612345678');
});

// ── 6. Dates au format série Excel (nombre) plutôt que texte ──
test('date série Excel est convertie en ISO', () => {
  // 45000 = 2023-03-15 (référence Excel 1899-12-30)
  assert.equal(IL.excelSerialToISODate(45000), '2023-03-15');
});

test('valeur non plausible comme date série renvoie null', () => {
  assert.equal(IL.excelSerialToISODate('12/03/2026'), null);
  assert.equal(IL.excelSerialToISODate(0), null);
});

// ── 7. Accents et caractères spéciaux ──
test('normalisation texte tolère les accents pour le rapprochement', () => {
  assert.equal(IL.diceCoeff('Général de Gaulle', 'General de Gaulle'), 1);
  const { mapping } = IL.autoMapColumns(['Téléphone', 'Adresse Complète']);
  assert.equal(mapping['Téléphone'], 'contact_tel');
  assert.equal(mapping['Adresse Complète'], 'adresse');
});

test('séparateur CSV auto-détecté : virgule, point-virgule, tabulation', () => {
  assert.equal(IL.detectSeparator('a,b,c'), ',');
  assert.equal(IL.detectSeparator('a;b;c'), ';');
  assert.equal(IL.detectSeparator('a\tb\tc'), '\t');
});

// ── 8. Adresse introuvable par le géocodeur ──
test('réponse BAN sans coordonnées laisse la ligne géocodable plus tard (latitude/longitude null)', () => {
  const csv = 'id,adresse,code_postal,ville,latitude,longitude,result_score,result_label\n0,Adresse inexistante,,,,,,\n';
  const [row] = IL.parseGeocodeCsvResponse(csv);
  assert.equal(row.latitude, null);
  assert.equal(row.longitude, null);
  assert.equal(row.score, null);
});

test('score de géocodage sous le seuil de confiance est détecté', () => {
  const csv = 'id,latitude,longitude,result_score,result_label\n0,48.85,2.35,0.42,Rue approx\n';
  const [row] = IL.parseGeocodeCsvResponse(csv);
  assert.ok(row.score < IL.GEOCODE_CONFIDENCE_THRESHOLD);
});

test('score de géocodage au-dessus du seuil est accepté', () => {
  const csv = 'id,latitude,longitude,result_score,result_label\n0,48.85,2.35,0.91,Rue exacte\n';
  const [row] = IL.parseGeocodeCsvResponse(csv);
  assert.ok(row.score >= IL.GEOCODE_CONFIDENCE_THRESHOLD);
});

test('construction du payload CSV pour l\'API BAN', () => {
  const payload = IL.buildGeocodeCsvPayload([{ id: 0, adresse: '1 rue de Paris', code_postal: '75001', ville: 'Paris' }]);
  const rows = IL.parseCsvText(payload);
  assert.deepEqual(rows[0], ['id', 'adresse', 'code_postal', 'ville']);
  assert.deepEqual(rows[1], ['0', '1 rue de Paris', '75001', 'Paris']);
});

// ── 9. Deux lignes strictement identiques dans le fichier ──
test('deux lignes strictement identiques dans le fichier sont détectées comme doublon interne', () => {
  const rows = [
    { nom: 'Boulangerie Dupont', adresse: '1 rue de Paris' },
    { nom: 'Boulangerie Dupont', adresse: '1 rue de Paris' },
  ];
  assert.equal(IL.findInternalDuplicateIndex(rows, 0), -1);
  assert.equal(IL.findInternalDuplicateIndex(rows, 1), 0);
});

test("lignes clairement différentes ne sont pas signalées comme doublon interne", () => {
  const rows = [
    { nom: 'Boulangerie Dupont', adresse: '1 rue de Paris' },
    { nom: 'Boucherie Martin', adresse: '2 rue de Lyon' },
  ];
  assert.equal(IL.findInternalDuplicateIndex(rows, 1), -1);
});

// ── 10. Import lancé deux fois de suite avec le même fichier ──
test('import répété du même fichier est détecté via les points déjà existants', () => {
  const existing = [{ id: 'INST_1', nom: 'Boulangerie Dupont', adresse: '1 rue de Paris' }];
  const dup = IL.findExistingDuplicate(existing, { nom: 'Boulangerie Dupont', adresse: '1 rue de Paris' });
  assert.equal(dup.id, 'INST_1');
});

test('correspondance approchante (accents/variantes) reste détectée comme doublon existant', () => {
  const existing = [{ id: 'INST_1', nom: 'Boulangerie Dupont', adresse: '1 Rue de Paris' }];
  const dup = IL.findExistingDuplicate(existing, { nom: 'boulangerie dupont', adresse: '1 rue de paris' });
  assert.ok(dup);
});

test('point suffisamment différent n\'est pas un doublon existant', () => {
  const existing = [{ id: 'INST_1', nom: 'Boulangerie Dupont', adresse: '1 rue de Paris' }];
  const dup = IL.findExistingDuplicate(existing, { nom: 'Garage Renault', adresse: '99 avenue de Nice' });
  assert.equal(dup, null);
});

// ── Mapping automatique : intitulés libres variés (pas de template imposé) ──
test('mapping automatique reconnaît des intitulés libres variés', () => {
  const { mapping } = IL.autoMapColumns(['Enseigne', 'Adresse', 'CP', 'Ville', 'Contact', 'N° Tel']);
  assert.equal(mapping['Enseigne'], 'nom');
  assert.equal(mapping['Adresse'], 'adresse');
  assert.equal(mapping['CP'], 'code_postal');
  assert.equal(mapping['Ville'], 'ville');
  assert.equal(mapping['Contact'], 'contact_nom');
  assert.equal(mapping['N° Tel'], 'contact_tel');
});

test('une même colonne cible n\'est utilisée qu\'une seule fois par le mapping auto', () => {
  const { mapping } = IL.autoMapColumns(['Nom', 'Nom du site', 'Adresse']);
  const mappedToNom = Object.values(mapping).filter(v => v === 'nom').length;
  assert.equal(mappedToNom, 1);
});
