-- Migration: 202611180001_clarice_schema.sql
-- Clarice Variedades Database Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabela produtos_clarice
CREATE TABLE IF NOT EXISTS public.produtos_clarice (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mlb_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    original_price NUMERIC(10,2) NOT NULL,
    current_price NUMERIC(10,2) NOT NULL,
    discount_percent INT DEFAULT 0,
    installments_text TEXT,
    image_url TEXT NOT NULL,
    affiliate_url TEXT NOT NULL,
    category TEXT NOT NULL,
    badge_text TEXT,
    free_shipping BOOLEAN DEFAULT false,
    is_full BOOLEAN DEFAULT false,
    rating NUMERIC(2,1) DEFAULT 5.0,
    reviews_count INT DEFAULT 0,
    featured BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela configuracoes_loja
CREATE TABLE IF NOT EXISTS public.configuracoes_loja (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    ml_affiliate_tag TEXT DEFAULT 'clarice-variedades',
    ml_master_url TEXT DEFAULT '',
    whatsapp_number TEXT DEFAULT '5511999999999',
    ai_model TEXT DEFAULT 'claude-3-5-haiku-latest',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INSERT inicial configuracoes_loja
INSERT INTO public.configuracoes_loja (id, ml_affiliate_tag, ml_master_url, whatsapp_number, ai_model)
VALUES (1, 'clarice-variedades', '', '5511999999999', 'claude-3-5-haiku-latest')
ON CONFLICT (id) DO NOTHING;

-- 3. Tabela ai_response_cache
CREATE TABLE IF NOT EXISTS public.ai_response_cache (
    cache_key TEXT PRIMARY KEY,
    intent_type TEXT,
    response_payload JSONB NOT NULL,
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- 4. Tabela ai_token_ledger
CREATE TABLE IF NOT EXISTS public.ai_token_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model TEXT NOT NULL,
    input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    cached_tokens INT DEFAULT 0,
    intent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.produtos_clarice ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_loja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_token_ledger ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Permitir leitura publica de produtos ativos" ON public.produtos_clarice;
CREATE POLICY "Permitir leitura publica de produtos ativos"
ON public.produtos_clarice FOR SELECT
USING (active = true);

DROP POLICY IF EXISTS "Permitir leitura publica de configuracoes" ON public.configuracoes_loja;
CREATE POLICY "Permitir leitura publica de configuracoes"
ON public.configuracoes_loja FOR SELECT
USING (true);

-- Indices para otimização
CREATE INDEX IF NOT EXISTS idx_produtos_clarice_active_category ON public.produtos_clarice(active, category);
CREATE INDEX IF NOT EXISTS idx_produtos_clarice_mlb_id ON public.produtos_clarice(mlb_id);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires_at ON public.ai_response_cache(expires_at);
