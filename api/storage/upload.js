/**
 * API Serverless de Upload de Imagens no Supabase Storage
 * Executa upload com Service Role Key para garantir que mesmo com RLS ativo o upload seja realizado com sucesso.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  const isFetch = req && typeof req.headers?.get === 'function';
  const method = isFetch ? req.method : req?.method;

  if (method !== 'POST') {
    if (isFetch) {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'content-type': 'application/json' },
      });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = {};
  try {
    if (isFetch) {
      body = await req.json();
    } else {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    }
  } catch {
    body = {};
  }

  const { base64Data, folder = 'produtos', lojaSlug = 'clarice', fileName } = body;

  if (!base64Data) {
    const errorMsg = 'Campo base64Data é obrigatório.';
    if (isFetch) {
      return new Response(JSON.stringify({ success: false, error: errorMsg }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    return res.status(400).json({ success: false, error: errorMsg });
  }

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase Storage não configurado no servidor.');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Remove prefixo data:image/...;base64,
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const contentType = matches ? matches[1] : 'image/webp';
    const rawBase64 = matches ? matches[2] : base64Data;
    const fileBuffer = Buffer.from(rawBase64, 'base64');

    const cleanLoja = (lojaSlug || 'clarice').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const safeName = fileName || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const filePath = `${cleanLoja}/${folder}/${safeName}`;

    // Garante bucket store-assets
    const { error: uploadError } = await supabase.storage
      .from('store-assets')
      .upload(filePath, fileBuffer, {
        contentType,
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicData } = supabase.storage.from('store-assets').getPublicUrl(filePath);
    const publicUrl = publicData.publicUrl;

    const responsePayload = { success: true, url: publicUrl, path: filePath };
    if (isFetch) {
      return new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return res.status(200).json(responsePayload);
  } catch (err) {
    console.error('[Upload API Error]', err.message);
    const responsePayload = { success: false, error: err.message, fallbackUrl: base64Data };
    if (isFetch) {
      return new Response(JSON.stringify(responsePayload), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
    return res.status(500).json(responsePayload);
  }
}
