-- Migração Segura: Senha de Acesso do Lojista
-- Data: 2026-11-23

ALTER TABLE public.lojas_afiliados
    ADD COLUMN IF NOT EXISTS owner_password TEXT;
