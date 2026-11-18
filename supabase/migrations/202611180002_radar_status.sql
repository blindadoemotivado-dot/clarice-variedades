-- Migration: 202611180002_radar_status.sql
ALTER TABLE public.produtos_clarice ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';

DROP POLICY IF EXISTS "Permitir leitura publica de produtos ativos" ON public.produtos_clarice;
CREATE POLICY "Permitir leitura geral de produtos" ON public.produtos_clarice FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir modificacao de produtos" ON public.produtos_clarice;
CREATE POLICY "Permitir modificacao de produtos" ON public.produtos_clarice FOR ALL USING (true) WITH CHECK (true);
