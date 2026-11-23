-- Migração Segura: Expansão do SaaS Multi-Tenant para Lojistas e Cobrança Asaas
-- Data: 2026-11-23

ALTER TABLE public.lojas_afiliados
    ADD COLUMN IF NOT EXISTS owner_email TEXT,
    ADD COLUMN IF NOT EXISTS owner_user_id UUID,
    ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS asaas_payment_url TEXT,
    ADD COLUMN IF NOT EXISTS dominio_customizado TEXT;

-- Restrição UNIQUE para dominio_customizado se ainda não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lojas_afiliados_dominio_customizado_key'
    ) THEN
        ALTER TABLE public.lojas_afiliados
            ADD CONSTRAINT lojas_afiliados_dominio_customizado_key UNIQUE (dominio_customizado);
    END IF;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Índices para buscas rápidas por lojista, assinatura e domínio próprio
CREATE INDEX IF NOT EXISTS idx_lojas_owner_email ON public.lojas_afiliados(owner_email);
CREATE INDEX IF NOT EXISTS idx_lojas_asaas_sub ON public.lojas_afiliados(asaas_subscription_id);
CREATE INDEX IF NOT EXISTS idx_lojas_asaas_cust ON public.lojas_afiliados(asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_lojas_dominio ON public.lojas_afiliados(dominio_customizado);
