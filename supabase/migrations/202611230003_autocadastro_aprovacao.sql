-- Migração Segura: Auto-Cadastro de Lojistas e Fila de Aprovação
-- Data: 2026-11-23

-- 1. Adicionar colunas de contato e documento do lojista
ALTER TABLE public.lojas_afiliados
    ADD COLUMN IF NOT EXISTS whatsapp_contato TEXT,
    ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;

-- 2. Atualizar check constraint de status_assinatura para incluir 'pendente'
ALTER TABLE public.lojas_afiliados
    DROP CONSTRAINT IF EXISTS lojas_afiliados_status_assinatura_check;

ALTER TABLE public.lojas_afiliados
    ADD CONSTRAINT lojas_afiliados_status_assinatura_check
    CHECK (status_assinatura IN ('ativo', 'trial', 'inadimplente', 'suspenso', 'pendente'));

-- 3. Índices para consultas da fila de aprovação e busca por documento
CREATE INDEX IF NOT EXISTS idx_lojas_status_assinatura ON public.lojas_afiliados(status_assinatura);
CREATE INDEX IF NOT EXISTS idx_lojas_cpf_cnpj ON public.lojas_afiliados(cpf_cnpj);
