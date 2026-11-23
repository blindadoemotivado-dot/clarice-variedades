-- Migração: Criação do Bucket Público 'store-assets' e Políticas RLS
-- Data: 2026-11-23

-- 1. Cria o bucket público se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'store-assets',
    'store-assets',
    true,
    5242880,
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

-- 2. Políticas RLS para visualização pública e upload
DROP POLICY IF EXISTS "Public Access store-assets" ON storage.objects;
CREATE POLICY "Public Access store-assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'store-assets');

DROP POLICY IF EXISTS "Public Upload store-assets" ON storage.objects;
CREATE POLICY "Public Upload store-assets"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'store-assets');

DROP POLICY IF EXISTS "Public Update store-assets" ON storage.objects;
CREATE POLICY "Public Update store-assets"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'store-assets')
    WITH CHECK (bucket_id = 'store-assets');

DROP POLICY IF EXISTS "Public Delete store-assets" ON storage.objects;
CREATE POLICY "Public Delete store-assets"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'store-assets');
