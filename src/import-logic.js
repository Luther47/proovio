// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IMPORT LOGIC — fonctions pures de l'assistant d'import en masse
// Aucun accès DOM, réseau ou localStorage ici : uniquement des transformations
// de données, pour pouvoir les tester avec `node --test` sans navigateur.
// Chargé dans le navigateur via <script src="import-logic.js"> (window.ImportLogic)
// et importé tel quel dans les tests Node (module.exports).
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (root) {
  'use strict';

  // ── Dictionnaire de correspondances approchantes pour le mapping automatique ──
  const FIELD_ALIASES = {
    nom:           ['nom', 'enseigne', 'name', 'point de vente', 'site', 'nom du site', 'raison sociale', 'pdv', 'magasin', 'commerce', 'nom du point', 'nom site', 'designation'],
    adresse:       ['adresse', 'adr', 'address', 'rue', 'voie', 'adresse postale', 'adresse complete', 'adresse du site', 'adresse 1', 'adresse1'],
    code_postal:   ['code postal', 'cp', 'zip', 'code_postal', 'postal code', 'zipcode', 'code', 'codepostal'],
    ville:         ['ville', 'commune', 'city', 'localite', 'localité', 'municipality'],
    latitude:      ['latitude', 'lat', 'y'],
    longitude:     ['longitude', 'lng', 'lon', 'long', 'x'],
    type:          ['type', 'type de cadre', 'support', 'type support', 'type de support'],
    taille:        ['format', 'taille', 'size', 'dimension', 'format cadre'],
    duree:         ['duree', 'durée', 'duration', 'contrat', 'duree contrat'],
    contact_nom:   ['contact', 'contact nom', 'responsable', 'interlocuteur', 'gérant', 'gerant', 'nom contact', 'nom du contact'],
    contact_tel:   ['telephone', 'téléphone', 'tel', 'phone', 'mobile', 'portable', 'contact tel', 'n° tel', 'tel contact'],
    commentaire:   ['commentaire', 'comment', 'note', 'notes', 'remarque', 'observation', 'remarques'],
    tags:          ['tags', 'étiquettes', 'labels', 'categories', 'catégorie', 'tag'],
  };

  const FIELD_LABELS = {
    nom: 'Nom / Enseigne', adresse: 'Adresse', code_postal: 'Code postal', ville: 'Ville',
    latitude: 'Latitude', longitude: 'Longitude', type: 'Type', taille: 'Format / Taille',
    duree: 'Durée', contact_nom: 'Contact (nom)', contact_tel: 'Contact (tél.)',
    commentaire: 'Commentaire', tags: 'Tags',
  };

  // Score de confiance du géocodage en-dessous duquel une ligne est marquée « à vérifier »
  const GEOCODE_CONFIDENCE_THRESHOLD = 0.6;
  const GEOCODE_BATCH_SIZE = 500;

  // ── Normalisation texte : minuscules, sans accents, sans espaces superflus ──
  function impNorm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  // ── Coefficient de Dice (similarité de bigrammes) pour rapprochement approché ──
  function diceCoeff(a, b) {
    a = impNorm(a); b = impNorm(b);
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;
    const biA = new Set(), biB = new Set();
    for (let i = 0; i < a.length - 1; i++) biA.add(a.slice(i, i + 2));
    for (let i = 0; i < b.length - 1; i++) biB.add(b.slice(i, i + 2));
    let inter = 0;
    for (const bi of biA) if (biB.has(bi)) inter++;
    return (2 * inter) / (biA.size + biB.size);
  }

  // ── Détection du séparateur CSV sur la première ligne : ; , ou tabulation ──
  function detectSeparator(firstLine) {
    const line = String(firstLine || '');
    const counts = { ';': (line.match(/;/g) || []).length, ',': (line.match(/,/g) || []).length, '\t': (line.match(/\t/g) || []).length };
    if (counts['\t'] > counts[';'] && counts['\t'] > counts[',']) return '\t';
    return counts[';'] >= counts[','] ? ';' : ',';
  }

  // ── Découpe une ligne CSV en tenant compte des guillemets ──
  function splitCsvLine(line, sep) {
    const out = [];
    let cur = '', inQ = false;
    for (let k = 0; k < line.length; k++) {
      const ch = line[k];
      if (ch === '"') { (inQ && line[k + 1] === '"') ? (cur += '"', k++) : (inQ = !inQ); }
      else if (ch === sep && !inQ) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(s => s.trim());
  }

  // ── Parse un texte CSV complet en tableau de tableaux (BOM et fins de ligne gérés) ──
  function parseCsvText(text) {
    const clean = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim();
    if (!clean) return [];
    const lines = clean.split('\n').filter(l => l.trim());
    if (!lines.length) return [];
    const sep = detectSeparator(lines[0]);
    const rows = lines.map(l => splitCsvLine(l, sep));
    while (rows.length && rows[rows.length - 1].every(c => !c)) rows.pop();
    return rows;
  }

  // ── Détection automatique de la ligne d'en-tête parmi les 20 premières lignes ──
  function detectHeaderRow(rawRows) {
    let bestIdx = 0, bestScore = -1;
    const limit = Math.min(rawRows.length, 20);
    const headerWords = ['nom', 'adresse', 'ville', 'code', 'type', 'format', 'tel', 'mail', 'contact', 'enseigne', 'site', 'cp', 'address', 'name'];
    for (let i = 0; i < limit; i++) {
      const row = rawRows[i];
      if (!row || !row.length) continue;
      let score = 0, textCells = 0;
      const vals = new Set();
      for (const cell of row) {
        const s = String(cell || '').trim();
        if (!s) continue;
        if (s.length > 0 && s.length < 50 && isNaN(Number(s))) { textCells++; score += 3; }
        if (s.length > 60) score -= 2;
        if (!isNaN(Number(s)) && s.length > 0) score -= 1;
        vals.add(s.toLowerCase());
      }
      score += vals.size;
      for (const v of vals) if (headerWords.some(h => v.includes(h))) score += 5;
      if (textCells >= 2 && score > bestScore) { bestScore = score; bestIdx = i; }
    }
    return bestIdx;
  }

  // ── Construit les en-têtes + lignes de données à partir des lignes brutes et de l'index d'en-tête ──
  // Ignore les lignes entièrement vides et les lignes de total.
  function buildDataRows(rawRows, headerRow) {
    if (!rawRows.length) return { headers: [], dataRows: [] };
    const headers = rawRows[headerRow].map((h, i) => String(h || `Colonne_${i + 1}`).trim());
    const dataRows = [];
    for (let i = headerRow + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.every(c => !String(c || '').trim())) continue;
      const first = String(row[0] || '').trim().toLowerCase();
      if (/^(total|sous[- ]total|somme|sum)$/i.test(first)) continue;
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = row[idx] !== undefined ? String(row[idx] ?? '').trim() : ''; });
      dataRows.push(obj);
    }
    return { headers, dataRows };
  }

  // ── Mapping automatique des colonnes source vers les champs Proovio, par alias + Dice ──
  function autoMapColumns(headers) {
    const mapping = {}, mappingAuto = {}, usedFields = new Set();
    for (const col of headers) {
      const normCol = impNorm(col);
      let bestField = null, bestScore = 0;
      for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
        if (usedFields.has(field)) continue;
        for (const alias of aliases) {
          const normAlias = impNorm(alias);
          if (normAlias === normCol) { bestField = field; bestScore = 1; break; }
          // Le rapprochement par inclusion n'est fiable que pour des alias assez longs :
          // un alias court ("x", "cp", "tel", "lon") apparaît comme sous-chaîne d'à peu près
          // n'importe quel intitulé et produirait des faux positifs sur des en-têtes libres.
          if (normAlias.length >= 4 && (normCol.includes(normAlias) || normAlias.includes(normCol))) {
            const s = 0.85;
            if (s > bestScore) { bestField = field; bestScore = s; }
          }
          const d = diceCoeff(col, alias);
          if (d > bestScore && d >= 0.6) { bestField = field; bestScore = d; }
        }
        if (bestScore === 1) break;
      }
      if (bestField && bestScore >= 0.6) {
        mapping[col] = bestField;
        mappingAuto[col] = bestField;
        usedFields.add(bestField);
      } else {
        mapping[col] = '__ignore__';
      }
    }
    return { mapping, mappingAuto };
  }

  // ── Code postal : retire tout ce qui n'est pas un chiffre puis rétablit le zéro initial perdu ──
  function normalizePostalCode(raw) {
    let cp = String(raw || '').replace(/\D/g, '');
    if (cp.length > 0 && cp.length < 5) cp = cp.padStart(5, '0');
    return cp;
  }

  // ── Téléphone : réintègre le 0 initial perdu (format numérique Excel) ou le préfixe +33 ──
  function normalizePhone(raw) {
    let tel = String(raw || '').replace(/\s/g, '');
    if (!tel) return '';
    if (/^\d{9}$/.test(tel)) tel = '0' + tel;
    if (/^33\d{9}$/.test(tel)) tel = '0' + tel.slice(2);
    return tel;
  }

  // ── Éclate une adresse en une seule cellule ("12 Place de la Garonne, 31000 Toulouse")
  //    en {adresse, code_postal, ville}. Laisse tel quel si aucun code postal n'est détecté
  //    (cas d'une adresse déjà éclatée sur plusieurs colonnes, gérée en amont). ──
  function splitFullAddress(raw) {
    const full = String(raw || '').trim();
    if (!full) return { adresse: '', code_postal: '', ville: '' };
    const m = full.match(/^(.*?),?\s*(\d{5})\s+([A-Za-zÀ-ÿ' -]+?)\s*$/);
    if (m) {
      return { adresse: m[1].replace(/,\s*$/, '').trim(), code_postal: m[2], ville: m[3].trim() };
    }
    return { adresse: full, code_postal: '', ville: '' };
  }

  // ── Date au format série Excel (nombre de jours depuis 1899-12-30) → ISO "YYYY-MM-DD".
  //    Renvoie null si la valeur ne ressemble pas à un numéro de série plausible. ──
  function excelSerialToISODate(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1 || n > 100000) return null;
    const ms = Date.UTC(1899, 11, 30) + n * 86400000;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  // ── Recherche une ligne quasi-identique (nom + adresse) déjà présente avant l'index donné ──
  function findInternalDuplicateIndex(mappedRows, index, threshold = 0.9) {
    const current = mappedRows[index];
    if (!current || !current.nom) return -1;
    for (let j = 0; j < index; j++) {
      const prev = mappedRows[j];
      if (prev && prev.nom && diceCoeff(prev.nom, current.nom) >= threshold) return j;
    }
    return -1;
  }

  // ── Recherche un point déjà existant proche par nom + adresse (correspondance approchante) ──
  function findExistingDuplicate(existing, mapped, nameThreshold = 0.8, addrThreshold = 0.6) {
    if (!mapped.nom) return null;
    return existing.find(inst => {
      const nameSim = diceCoeff(inst.nom, mapped.nom);
      if (nameSim < nameThreshold) return false;
      const addrSim = diceCoeff(inst.adresse || '', mapped.adresse || '');
      return addrSim > addrThreshold;
    }) || null;
  }

  // ── Clé de cache de géocodage : adresse complète normalisée ──
  function geocodeCacheKey(adresse, code_postal, ville) {
    return impNorm([adresse, code_postal, ville].filter(Boolean).join(' '));
  }

  // ── Construit le CSV multipart à envoyer à l'API BAN (search/csv) ──
  // Colonnes: id, adresse, code_postal, ville — id permet de retrouver la ligne dans la réponse.
  function csvEscape(v) {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function buildGeocodeCsvPayload(rows) {
    const lines = ['id,adresse,code_postal,ville'];
    rows.forEach((r, i) => {
      lines.push([r.id != null ? r.id : i, r.adresse, r.code_postal, r.ville].map(csvEscape).join(','));
    });
    return lines.join('\n');
  }

  // ── Parse la réponse CSV de l'API BAN (result_score, latitude, longitude, result_label) ──
  function parseGeocodeCsvResponse(csvText) {
    const rows = parseCsvText(csvText);
    if (!rows.length) return [];
    const headers = rows[0];
    const idx = name => headers.indexOf(name);
    const iId = idx('id'), iScore = idx('result_score'), iLat = idx('latitude'), iLng = idx('longitude'), iLabel = idx('result_label');
    const out = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const lat = iLat >= 0 ? parseFloat(row[iLat]) : NaN;
      const lng = iLng >= 0 ? parseFloat(row[iLng]) : NaN;
      out.push({
        id: iId >= 0 ? row[iId] : String(i - 1),
        score: iScore >= 0 && row[iScore] !== '' ? parseFloat(row[iScore]) : null,
        latitude: isNaN(lat) ? null : lat,
        longitude: isNaN(lng) ? null : lng,
        label: iLabel >= 0 ? row[iLabel] : '',
      });
    }
    return out;
  }

  const ImportLogic = {
    FIELD_ALIASES, FIELD_LABELS, GEOCODE_CONFIDENCE_THRESHOLD, GEOCODE_BATCH_SIZE,
    impNorm, diceCoeff,
    detectSeparator, splitCsvLine, parseCsvText,
    detectHeaderRow, buildDataRows, autoMapColumns,
    normalizePostalCode, normalizePhone, splitFullAddress, excelSerialToISODate,
    findInternalDuplicateIndex, findExistingDuplicate,
    geocodeCacheKey, buildGeocodeCsvPayload, parseGeocodeCsvResponse,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ImportLogic;
  else root.ImportLogic = ImportLogic;
})(typeof window !== 'undefined' ? window : globalThis);
