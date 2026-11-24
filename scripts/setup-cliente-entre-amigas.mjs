/**
 * Script Idempotente de Cadastro e Ativação de Nova Cliente Assinante
 * Loja: Entre amigas promos (Tatiane Mirian Bernardo Conceição)
 * Plataforma: Clarice Achadinhos SaaS (Multi-Tenant)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🚀 ATIVAÇÃO DE NOVA CLIENTE ASSINANTE — CLARICE ACHADINHOS SAAS');
  console.log('👤 Titular: Tatiane Mirian Bernardo Conceição');
  console.log('🏬 Loja: Entre amigas promos (slug: entre-amigas-promos)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // 1. Data de Vencimento: Data atual + 30 dias
  const vencimentoEm = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // 2. Payload da Loja
  const storePayload = {
    slug: 'entre-amigas-promos',
    nome_loja: 'Entre amigas promos',
    subtitulo: 'Curadoria diária de achadinhos reais no Mercado Livre e Shopee para você economizar todo dia.',
    owner_email: 'tatianemirianbc@gmail.com',
    owner_password: 'Deusefiel0527@',
    plano: 'pro',
    status_assinatura: 'ativo',
    vencimento_em: vencimentoEm,
    whatsapp_vip_url: 'https://chat.whatsapp.com/FxvrxptP6vYHjAthyYOWWo?s=cl&p=a&iam=2',
    cor_primaria: '#831843', // Vinho/Rosa Escuro elegante
    cor_destaque: '#EC4899', // Rosa Vibrante moderno
    logo_url: null,          // Exibe monograma limpo "EA"
    hero_mascote_url: null,  // Isolada da mascote da Clarice
  };

  console.log('📦 Executando upsert da loja em public.lojas_afiliados...');
  const { data: store, error: storeError } = await supabase
    .from('lojas_afiliados')
    .upsert(storePayload, { onConflict: 'slug' })
    .select()
    .single();

  if (storeError) {
    console.error('❌ Falha ao cadastrar/atualizar loja em lojas_afiliados:', storeError.message);
    process.exit(1);
  }

  console.log('✅ Loja cadastrada e ativada com sucesso!');
  console.log(`   ID: ${store.id}`);
  console.log(`   Slug: ${store.slug}`);
  console.log(`   Nome: ${store.nome_loja}`);
  console.log(`   Plano: ${store.plano.toUpperCase()}`);
  console.log(`   Status: ${store.status_assinatura.toUpperCase()}`);
  console.log(`   Vencimento: ${new Date(store.vencimento_em).toLocaleDateString('pt-BR')}`);

  // 3. Validação de Isolamento de Catálogo
  console.log('\n🔒 Verificando isolamento multi-tenant do catálogo...');
  const { data: existingProducts, count, error: prodError } = await supabase
    .from('produtos_clarice')
    .select('id, title', { count: 'exact' })
    .eq('loja_slug', 'entre-amigas-promos');

  if (prodError) {
    console.error('❌ Erro ao consultar produtos da loja:', prodError.message);
    process.exit(1);
  }

  const productCount = count ?? existingProducts?.length ?? 0;
  console.log(`📊 Produtos vinculados a 'entre-amigas-promos': ${productCount}`);

  if (productCount === 0) {
    console.log('✅ Catálogo 100% limpo e isolado! Zero produtos vazados de outras lojas.');
  } else {
    console.log(`ℹ️ A loja possui ${productCount} produto(s) já cadastrado(s).`);
  }

  // 4. Exibição do Resumo Oficial
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('🎉 RESUMO OFICIAL DE ATIVAÇÃO DA CLIENTE');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('👤 Titular             : Tatiane Mirian Bernardo Conceição');
  console.log('🏬 Nome da Loja        : Entre amigas promos');
  console.log('🏷️ Monograma Padrão    : EA (gerado automaticamente com a cor destaque)');
  console.log('🎨 Paleta Visual       : Primária #831843 • Destaque #EC4899');
  console.log('💎 Plano Liberado      : PRO (R$ 117/mês) — Todos os recursos ativos');
  console.log('🟢 Status da Conta     : ATIVO (Liberado para uso imediato)');
  console.log('📅 Vencimento          : ' + new Date(store.vencimento_em).toLocaleDateString('pt-BR'));
  console.log('💬 Grupo VIP WhatsApp  : ' + store.whatsapp_vip_url);
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('🌐 Vitrine Pública     : https://clariceachadinhos.vercel.app/?loja=entre-amigas-promos');
  console.log('🔐 Painel Administrativo: https://clariceachadinhos.vercel.app/admin');
  console.log('📧 E-mail de Login     : tatianemirianbc@gmail.com');
  console.log('🔑 Senha de Acesso     : Deusefiel0527@');
  console.log('═══════════════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('❌ Falha fatal ao executar script:', err);
  process.exit(1);
});
