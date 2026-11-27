import { createClient } from '@supabase/supabase-js';

export const config = {
  maxDuration: 60,
};

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

  // Validação opcional de token webhook
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (webhookToken) {
    const receivedToken = isFetch
      ? req.headers.get('asaas-access-token')
      : req?.headers?.['asaas-access-token'];
    if (receivedToken !== webhookToken) {
      if (isFetch) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
      return res.status(401).json({ error: 'Unauthorized' });
    }
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

  const { event, payment } = body;
  console.log(`[Asaas Webhook] Evento recebido: ${event}`);

  if (!event || !payment) {
    const okResponse = { received: true, ignored: true, reason: 'Payload sem event ou payment' };
    if (isFetch) return new Response(JSON.stringify(okResponse), { status: 200, headers: { 'content-type': 'application/json' } });
    return res.status(200).json(okResponse);
  }

  const subscriptionId = payment.subscription;
  const customerId = payment.customer;

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tuxvpzeciwxgxhmcrprt.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabase = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) : null;

  if (!supabase) {
    const noDbResponse = { received: true, warning: 'Supabase não conectado' };
    if (isFetch) return new Response(JSON.stringify(noDbResponse), { status: 200, headers: { 'content-type': 'application/json' } });
    return res.status(200).json(noDbResponse);
  }

  try {
    // 1. Pagamento Confirmado ou Recebido: Ativa e estende vencimento por 30 dias
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      const nextDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      let query = supabase.from('lojas_afiliados').update({
        status_assinatura: 'ativo',
        vencimento_em: nextDue,
      });

      if (subscriptionId) {
        query = query.eq('asaas_subscription_id', subscriptionId);
      } else if (customerId) {
        query = query.eq('asaas_customer_id', customerId);
      }

      const { data, error } = await query.select('slug, status_assinatura, vencimento_em');
      console.log('[Asaas Webhook] Loja ativada com sucesso:', data || error?.message);
    }

    // 2. Pagamento Vencido ou Assinatura Cancelada: Marca como Inadimplente
    if (event === 'PAYMENT_OVERDUE' || event === 'SUBSCRIPTION_DELETED') {
      let query = supabase.from('lojas_afiliados').update({
        status_assinatura: 'inadimplente',
      });

      if (subscriptionId) {
        query = query.eq('asaas_subscription_id', subscriptionId);
      } else if (customerId) {
        query = query.eq('asaas_customer_id', customerId);
      }

      const { data, error } = await query.select('slug, status_assinatura');
      console.log('[Asaas Webhook] Loja marcada como inadimplente:', data || error?.message);
    }
  } catch (err) {
    console.error('[Asaas Webhook] Erro ao processar:', err);
  }

  const ok = { received: true, event };
  if (isFetch) {
    return new Response(JSON.stringify(ok), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return res.status(200).json(ok);
}
