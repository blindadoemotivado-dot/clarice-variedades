CREATE TABLE IF NOT EXISTS public.saas_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  loja_slug TEXT NOT NULL,
  actor_role TEXT NOT NULL DEFAULT 'lojista',
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_id TEXT,
  entity_title TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_saas_audit_logs_slug_date
  ON public.saas_audit_logs (loja_slug, created_at DESC);

ALTER TABLE public.saas_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'saas_audit_logs' AND policyname = 'Allow authenticated insert audit logs'
  ) THEN
    CREATE POLICY "Allow authenticated insert audit logs"
      ON public.saas_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'saas_audit_logs' AND policyname = 'Allow authenticated read audit logs'
  ) THEN
    CREATE POLICY "Allow authenticated read audit logs"
      ON public.saas_audit_logs FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
