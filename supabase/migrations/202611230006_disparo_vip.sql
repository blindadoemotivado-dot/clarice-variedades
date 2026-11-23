-- Migração: Suporte a registro de Disparos VIP no WhatsApp
ALTER TABLE public.produtos_clarice 
ADD COLUMN IF NOT EXISTS ultimo_disparo_em TIMESTAMPTZ;

-- Índice para consultas rápidas de produtos por último disparo
CREATE INDEX IF NOT EXISTS idx_produtos_ultimo_disparo 
ON public.produtos_clarice(loja_slug, ultimo_disparo_em);
