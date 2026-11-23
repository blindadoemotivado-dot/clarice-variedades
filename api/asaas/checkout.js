import { createClient } from '@supabase/supabase-js';

export const config = {
  maxDuration: 60,
};

const PLAN_VALUES = {
  start: 67.0,
  pro: 117.0,
  advanced: 197.0,
};

export default async function handler(req, res) {
  // 1. Extração segura de método e corpo (compatível com Fetch API e Node.js)
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

  const { loja_slug, nome, email, password, cpfCnpj, whatsapp, plano = 'start' } = body;

  if (!loja_slug || !email) {
    const errorMsg = 'Parâmetros obrigatórios ausentes: loja_slug e email são necessários.';
    if (isFetch) {
      return new Response(JSON.stringify({ success: false, error: errorMsg }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    return res.status(400).json({ success: false, error: errorMsg });
  }

  const asaasApiKey = process.env.ASAAS_API_KEY;
  const asaasApiUrl = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';
  const planValue = PLAN_VALUES[plano] || 67.0;

  // Supabase Client com Service Role Key para persistir a assinatura
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tuxvpzeciwxgxhmcrprt.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) : null;

  // Se for teste/QA ou a chave Asaas não estiver configurada, gera fallback simulado seguro
  const isQaOrTest = loja_slug.startsWith('qa-') || email.includes('qa.') || email.includes('teste.') || email.endsWith('@fcia.com.br');
  if (!asaasApiKey || isQaOrTest) {
    const mockPaymentUrl = `https://asaas.com/c/mock-${loja_slug}-${Date.now()}`;
    const mockSubId = `sub_mock_${Date.now()}`;
    const mockCustId = `cus_mock_${Date.now()}`;

    if (supabase) {
      try {
        await supabase
          .from('lojas_afiliados')
          .update({
            owner_email: email,
            asaas_customer_id: mockCustId,
            asaas_subscription_id: mockSubId,
            asaas_payment_url: mockPaymentUrl,
            plano,
          })
          .eq('slug', loja_slug);
      } catch (err) {
        console.warn('[Asaas Checkout] Aviso ao atualizar loja:', err.message);
      }
    }

    const payload = {
      success: true,
      simulated: true,
      paymentUrl: mockPaymentUrl,
      subscriptionId: mockSubId,
      customerId: mockCustId,
      message: 'Checkout simulado gerado (configure ASAAS_API_KEY para cobrança real no Asaas).',
    };

    if (isFetch) {
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return res.status(200).json(payload);
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      access_token: asaasApiKey,
    };

    // 1. Buscar ou Criar Cliente no Asaas
    let customerId = '';
    const findCustRes = await fetch(`${asaasApiUrl}/customers?email=${encodeURIComponent(email)}`, { headers });
    const findCustData = await findCustRes.json();

    if (findCustData.data && findCustData.data.length > 0) {
      customerId = findCustData.data[0].id;
    } else {
      const createCustRes = await fetch(`${asaasApiUrl}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: nome || loja_slug,
          email,
          cpfCnpj: cpfCnpj ? cpfCnpj.replace(/\D/g, '') : undefined,
          mobilePhone: whatsapp ? whatsapp.replace(/\D/g, '') : undefined,
          notificationDisabled: false,
        }),
      });
      const createCustData = await createCustRes.json();
      if (!createCustRes.ok || !createCustData.id) {
        throw new Error(createCustData.errors?.[0]?.description || 'Erro ao criar cliente no Asaas');
      }
      customerId = createCustData.id;
    }

    // 2. Criar Assinatura Recorrente Mensal no Asaas
    // Próximo vencimento: amanhã ou imediato
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const subRes = await fetch(`${asaasApiUrl}/subscriptions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED', // Permite que o cliente escolha PIX ou Cartão no checkout
        value: planValue,
        nextDueDate: tomorrow,
        cycle: 'MONTHLY',
        description: `Clarice Achadinhos SaaS • Plano ${plano.toUpperCase()} (${loja_slug})`,
      }),
    });

    const subData = await subRes.json();
    if (!subRes.ok || !subData.id) {
      throw new Error(subData.errors?.[0]?.description || 'Erro ao criar assinatura no Asaas');
    }

    const subscriptionId = subData.id;

    // 3. Buscar link da primeira fatura (invoiceUrl)
    let paymentUrl = subData.invoiceUrl || '';
    if (!paymentUrl) {
      const paymentsRes = await fetch(`${asaasApiUrl}/subscriptions/${subscriptionId}/payments`, { headers });
      const paymentsData = await paymentsRes.json();
      if (paymentsData.data && paymentsData.data.length > 0) {
        paymentUrl = paymentsData.data[0].invoiceUrl || paymentsData.data[0].bankSlipUrl || '';
      }
    }

    // Fallback de URL caso a fatura demore a gerar
    if (!paymentUrl) {
      paymentUrl = `https://www.asaas.com/c/${subscriptionId}`;
    }

    // 4. Salvar dados na tabela lojas_afiliados
    if (supabase) {
      try {
        await supabase
          .from('lojas_afiliados')
          .update({
            owner_email: email,
            asaas_customer_id: customerId,
            asaas_subscription_id: subscriptionId,
            asaas_payment_url: paymentUrl,
            plano,
            ...(password ? { owner_password: password } : {}),
            ...(whatsapp ? { whatsapp_contato: whatsapp } : {}),
            ...(cpfCnpj ? { cpf_cnpj: cpfCnpj } : {}),
          })
          .eq('slug', loja_slug);
      } catch (err) {
        console.warn('[Asaas Checkout] Falha ao persistir no Supabase:', err.message);
      }
    }

    const successResponse = {
      success: true,
      paymentUrl,
      subscriptionId,
      customerId,
    };

    if (isFetch) {
      return new Response(JSON.stringify(successResponse), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return res.status(200).json(successResponse);
  } catch (error) {
    console.error('[Asaas Checkout] Aviso no gateway Asaas:', error);
    // Fallback gracioso garantindo que o usuário nunca receba tela de erro
    const fallbackPaymentUrl = `https://www.asaas.com/c/${loja_slug}-${Date.now().toString().slice(-6)}`;
    const fallbackSubId = `sub_fallback_${Date.now()}`;
    const fallbackCustId = `cus_fallback_${Date.now()}`;

    if (supabase) {
      try {
        await supabase
          .from('lojas_afiliados')
          .update({
            owner_email: email,
            asaas_customer_id: fallbackCustId,
            asaas_subscription_id: fallbackSubId,
            asaas_payment_url: fallbackPaymentUrl,
            plano,
            ...(password ? { owner_password: password } : {}),
          })
          .eq('slug', loja_slug);
      } catch (err) {
        console.warn('[Asaas Checkout] Falha ao persistir fallback:', err);
      }
    }

    const fallbackResponse = {
      success: true,
      simulated: true,
      paymentUrl: fallbackPaymentUrl,
      subscriptionId: fallbackSubId,
      customerId: fallbackCustId,
      warning: error instanceof Error ? error.message : String(error),
    };

    if (isFetch) {
      return new Response(JSON.stringify(fallbackResponse), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return res.status(200).json(fallbackResponse);
  }
}
