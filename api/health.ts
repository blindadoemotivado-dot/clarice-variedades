/**
 * Health Check & Keep-Alive Endpoint para Supabase
 * Rota Serverless Vercel: /api/health
 *
 * Executa uma consulta real e leve (SELECT limit 1) no Postgres do Supabase
 * para impedir a pausa automática por inatividade no plano gratuito.
 */

import { createClient } from '@supabase/supabase-js';

export const config = {
  maxDuration: 10,
};

export default async function handler(req?: any, res?: any) {
  const isFetch = req && typeof req.headers?.get === 'function';

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://tuxvpzeciwxgxhmcrprt.supabase.co';

  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';

  const timestamp = new Date().toISOString();

  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials (URL/Key) not configured in environment');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // 1. Tenta consulta mínima na tabela principal de produtos (produtos_clarice)
    let { error } = await supabase
      .from('produtos_clarice')
      .select('id')
      .limit(1);

    // 2. Fallback para lojas_afiliados caso produtos_clarice não responda
    if (error) {
      const fallback = await supabase
        .from('lojas_afiliados')
        .select('id')
        .limit(1);

      if (fallback.error) {
        throw new Error(error.message || fallback.error.message);
      }
    }

    const payload = {
      status: 'ok',
      project: 'clarice-achadinhos',
      timestamp,
    };

    if (isFetch) {
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    if (res && typeof res.status === 'function') {
      return res.status(200).json(payload);
    }

    return payload;
  } catch (err: any) {
    const errorPayload = {
      status: 'error',
      project: 'clarice-achadinhos',
      timestamp,
      message: err instanceof Error ? err.message : String(err),
    };

    if (isFetch) {
      return new Response(JSON.stringify(errorPayload), {
        status: 500,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    if (res && typeof res.status === 'function') {
      return res.status(500).json(errorPayload);
    }

    throw err;
  }
}
