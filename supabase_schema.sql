-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SCHÉMA SUPABASE PROOVIO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Activer l'extension pgcrypto pour les UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CLient (Donneur d'ordre)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    contact_nom TEXT,
    contact_email TEXT,
    contact_tel TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Campagnes (Opérations)
CREATE TABLE IF NOT EXISTS campagnes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    statut TEXT DEFAULT 'En cours',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Installateurs (Agents terrain)
CREATE TABLE IF NOT EXISTS installateurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT,
    tel TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Installations (Points de contrôle / Preuves)
CREATE TABLE IF NOT EXISTS installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    ville TEXT NOT NULL,
    adresse TEXT,
    code_postal TEXT,
    lat FLOAT8,
    lng FLOAT8,
    campagne_id UUID REFERENCES campagnes(id) ON DELETE SET NULL,
    installateur_id UUID REFERENCES installateurs(id) ON DELETE SET NULL,
    statut TEXT DEFAULT 'En attente',
    type TEXT,
    taille TEXT,
    duree TEXT,
    contact_nom TEXT,
    contact_tel TEXT,
    commentaire TEXT,
    tags TEXT[],
    metadata JSONB,
    geo_score FLOAT8,
    geo_source TEXT,
    import_batch_id TEXT,
    date_echeance DATE,
    photo1 TEXT,
    photo2 TEXT,
    photo2_lat FLOAT8,
    photo2_lng FLOAT8,
    photo2_alt FLOAT8,
    photo2_datetime TIMESTAMP WITH TIME ZONE,
    photo2_analyse JSONB,
    cadres JSONB,
    cadre_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Lots d'importation (Import Batches)
CREATE TABLE IF NOT EXISTS import_batches (
    id TEXT PRIMARY KEY,
    fichier TEXT,
    auteur TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    lignes_total INT,
    lignes_importees INT,
    lignes_doublons INT,
    lignes_erreurs INT,
    campagne TEXT,
    defaults JSONB,
    statut TEXT,
    annulable BOOLEAN,
    erreurs JSONB
);

-- 6. Règles de mapping (Column Mappings)
CREATE TABLE IF NOT EXISTS column_mappings (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    colonnes_source TEXT[],
    mapping JSONB,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
