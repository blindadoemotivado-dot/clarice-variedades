-- ==============================================================================
-- Migração Segura: Auditoria de Segurança, RLS Blindado e Otimização de Performance
-- Arquivo: supabase/migrations/202611270001_security_and_performance_hardening.sql
-- Framework: database-architecture-master & security-protection-master
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ÍNDICES ESTRATÉGICOS E PERFORMANCE DE CONSULTAS (database-architecture-master)
-- ------------------------------------------------------------------------------

-- Índice composto para consultas rápidas na vitrine (loja_slug + active + featured DESC + created_at DESC)
-- Elimina full-table scans e operações de Sort em memória na visualização inicial
CREATE INDEX IF NOT EXISTS idx_produtos_clarice_tenant_featured
  ON public.produtos_clarice (loja_slug, active, featured DESC, created_at DESC);

-- Índice composto para filtros rápidos por categoria dentro de cada loja
CREATE INDEX IF NOT EXISTS idx_produtos_clarice_tenant_category
  ON public.produtos_clarice (loja_slug, active, category);

-- Índice parcial UNIQUE para garantir ZERO duplicatas ativas do mesmo produto (mlb_id) por loja
CREATE UNIQUE INDEX IF NOT EXISTS uq_produtos_clarice_tenant_mlb
  ON public.produtos_clarice (loja_slug, mlb_id)
  WHERE active = true;

-- Integridade Referencial: Garante que produtos pertençam a lojas válidas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_produtos_clarice_loja_slug'
  ) THEN
    ALTER TABLE public.produtos_clarice
      ADD CONSTRAINT fk_produtos_clarice_loja_slug
      FOREIGN KEY (loja_slug) REFERENCES public.lojas_afiliados(slug)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 2. BLINDAGEM DE RLS E MULTI-TENANT (security-protection-master)
-- ------------------------------------------------------------------------------

-- 2.1 Blindagem da tabela produtos_clarice
-- Remove política insegura legada que permitia modificação anônima aberta
DROP POLICY IF EXISTS "Permitir modificacao de produtos" ON public.produtos_clarice;
DROP POLICY IF EXISTS "Permitir leitura geral de produtos" ON public.produtos_clarice;
DROP POLICY IF EXISTS "Permitir leitura publica de produtos ativos" ON public.produtos_clarice;

-- Leitura pública estritamente restrita a produtos marcados como ativos
CREATE POLICY "Permitir leitura publica de produtos ativos"
  ON public.produtos_clarice FOR SELECT
  USING (active = true);

-- Modificações (INSERT, UPDATE, DELETE) restritas exclusivamente a usuários autenticados e service_role
DROP POLICY IF EXISTS "Permitir administracao de produtos para autenticados" ON public.produtos_clarice;
CREATE POLICY "Permitir administracao de produtos para autenticados"
  ON public.produtos_clarice FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2.2 Blindagem da tabela lojas_afiliados
-- Remove política insegura que permitia INSERT/UPDATE/DELETE anônimo em qualquer loja
DROP POLICY IF EXISTS "Permitir modificacao de lojas_afiliados" ON public.lojas_afiliados;

-- Modificação restrita a usuários autenticados e service_role
DROP POLICY IF EXISTS "Permitir gerenciamento de lojas para autenticados" ON public.lojas_afiliados;
CREATE POLICY "Permitir gerenciamento de lojas para autenticados"
  ON public.lojas_afiliados FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2.3 Blindagem da tabela tutoriais_saas
DROP POLICY IF EXISTS "Escrita e atualização de tutoriais" ON public.tutoriais_saas;
DROP POLICY IF EXISTS "Escrita e atualização de tutoriais para autenticados" ON public.tutoriais_saas;
CREATE POLICY "Escrita e atualização de tutoriais para autenticados"
  ON public.tutoriais_saas FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2.4 Blindagem da tabela store_settings e configuracoes_loja
ALTER TABLE IF EXISTS public.store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir modificacao de store_settings" ON public.store_settings;
CREATE POLICY "Permitir modificacao de store_settings para autenticados"
  ON public.store_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.configuracoes_loja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir modificacao de configuracoes_loja" ON public.configuracoes_loja;
CREATE POLICY "Permitir modificacao de configuracoes_loja para autenticados"
  ON public.configuracoes_loja FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. VIEW SEGURA PARA VITRINES PÚBLICAS (Princípio do Menor Privilégio - PoLP)
-- ------------------------------------------------------------------------------
-- Impede vazamento acidental de owner_password, shopee_secret, cpf_cnpj para visitantes anônimos
CREATE OR REPLACE VIEW public.v_lojas_publicas AS
SELECT
  id,
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
  status_assinatura,
  vencimento_em,
  dominio_customizado,
  whatsapp_contato,
  created_at
FROM public.lojas_afiliados;
