-- Migração: Credenciais Permanentes de Afiliado por Loja (Mercado Livre + Shopee)
-- Data: 2026-11-24

ALTER TABLE public.lojas_afiliados
    ADD COLUMN IF NOT EXISTS ml_affiliate_tag TEXT,
    ADD COLUMN IF NOT EXISTS shopee_affiliate_id TEXT;
