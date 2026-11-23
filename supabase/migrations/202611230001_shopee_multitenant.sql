-- ==============================================================================
-- Migração Segura: Híbrido Mercado Livre + Shopee + Multi-Tenant SaaS
-- Arquivo: supabase/migrations/202611230001_shopee_multitenant.sql
-- ==============================================================================

-- 1. Evolução da tabela produtos_clarice
ALTER TABLE public.produtos_clarice
    ADD COLUMN IF NOT EXISTS marketplace TEXT NOT NULL DEFAULT 'mercadolivre',
    ADD COLUMN IF NOT EXISTS loja_slug TEXT NOT NULL DEFAULT 'clarice';

-- Garantir que todos os registros existentes estejam vinculados à Clarice e Mercado Livre
UPDATE public.produtos_clarice
SET
    marketplace = COALESCE(marketplace, 'mercadolivre'),
    loja_slug = COALESCE(loja_slug, 'clarice')
WHERE marketplace IS NULL OR loja_slug IS NULL;

-- Índice composto para consultas rápidas multi-tenant por loja, status ativo e marketplace
CREATE INDEX IF NOT EXISTS idx_produtos_clarice_tenant
    ON public.produtos_clarice (loja_slug, active, marketplace);

-- 2. Criação da tabela lojas_afiliados (Gestão de Clientes SaaS)
CREATE TABLE IF NOT EXISTS public.lojas_afiliados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    nome_loja TEXT NOT NULL,
    subtitulo TEXT,
    cor_primaria TEXT DEFAULT '#0F172A',
    cor_destaque TEXT DEFAULT '#FFE600',
    logo_url TEXT,
    hero_mascote_url TEXT,
    whatsapp_vip_url TEXT,
    instagram_url TEXT,
    plano TEXT NOT NULL DEFAULT 'start' CHECK (plano IN ('start', 'pro', 'advanced')),
    status_assinatura TEXT NOT NULL DEFAULT 'ativo' CHECK (status_assinatura IN ('ativo', 'trial', 'inadimplente', 'suspenso')),
    vencimento_em TIMESTAMPTZ,
    shopee_app_id TEXT,
    shopee_secret TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS em lojas_afiliados
ALTER TABLE public.lojas_afiliados ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para lojas_afiliados
DROP POLICY IF EXISTS "Permitir leitura geral de lojas_afiliados" ON public.lojas_afiliados;
CREATE POLICY "Permitir leitura geral de lojas_afiliados"
    ON public.lojas_afiliados FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Permitir modificacao de lojas_afiliados" ON public.lojas_afiliados;
CREATE POLICY "Permitir modificacao de lojas_afiliados"
    ON public.lojas_afiliados FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. Inserir/garantir o registro mestre da loja 'clarice'
INSERT INTO public.lojas_afiliados (
    slug,
    nome_loja,
    subtitulo,
    cor_primaria,
    cor_destaque,
    logo_url,
    hero_mascote_url,
    whatsapp_vip_url,
    instagram_url,
    plano,
    status_assinatura
) VALUES (
    'clarice',
    'Clarice Achadinhos',
    'Curadoria diária de achadinhos com desconto real no Mercado Livre e Shopee',
    '#0F172A',
    '#FFE600',
    '/icons/icon-192x192.png',
    '/brand/clarice-hero.png',
    'https://chat.whatsapp.com/IXxtNFu9ZppJkYFx1Jdk7o',
    'https://instagram.com/clariceachadinhos',
    'advanced',
    'ativo'
)
ON CONFLICT (slug) DO UPDATE SET
    nome_loja = EXCLUDED.nome_loja,
    whatsapp_vip_url = 'https://chat.whatsapp.com/IXxtNFu9ZppJkYFx1Jdk7o',
    plano = 'advanced',
    status_assinatura = 'ativo';
