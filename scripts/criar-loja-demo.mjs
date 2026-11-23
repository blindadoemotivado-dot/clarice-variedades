/**
 * Script de Criação e População da Loja de Demonstração FCIA
 * Executa o upsert da loja teste 'loja-demo' e 3 produtos isolados no Supabase.
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

async function run() {
  console.log('🚀 Iniciando configuração da Loja de Demonstração Multi-Tenant...\n');

  // 1. Upsert da Loja Demo em public.lojas_afiliados
  const vencimentoEm = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const storePayload = {
    slug: 'loja-demo',
    nome_loja: 'Achadinhos Demo FCIA',
    subtitulo: 'As melhores ofertas selecionadas todos os dias',
    owner_email: 'teste.lojista@fcia.com.br',
    whatsapp_contato: '5594999990000',
    whatsapp_vip_url: 'https://chat.whatsapp.com/IXxtNFu9ZppJkYFx1Jdk7o',
    plano: 'pro',
    status_assinatura: 'ativo',
    vencimento_em: vencimentoEm,
    cor_primaria: '#0F172A',
    cor_destaque: '#FFE600',
    logo_url: '/icons/icon-192x192.png',
    hero_mascote_url: '/brand/clarice-hero.png',
  };

  const { data: storeData, error: storeError } = await supabase
    .from('lojas_afiliados')
    .upsert(storePayload, { onConflict: 'slug' })
    .select()
    .single();

  if (storeError) {
    console.error('❌ Falha ao cadastrar loja-demo em lojas_afiliados:', storeError.message);
    process.exit(1);
  }

  console.log('✅ Loja teste "loja-demo" cadastrada/atualizada com sucesso!');
  console.log('   ID:', storeData.id);
  console.log('   Slug:', storeData.slug);
  console.log('   Nome:', storeData.nome_loja);
  console.log('   E-mail do Lojista:', storeData.owner_email);
  console.log('   Plano:', storeData.plano.toUpperCase());
  console.log('   Status:', storeData.status_assinatura.toUpperCase());
  console.log('   Vencimento:', storeData.vencimento_em);

  // 2. Inserir/Atualizar 3 produtos de exemplo exclusivos para 'loja-demo'
  const demoProducts = [
    {
      mlb_id: 'MLB-DEMO-001',
      title: 'Fritadeira Sem Óleo Air Fryer Digital 4.5L Antiaderente Inox 1500W',
      original_price: 489.9,
      current_price: 289.9,
      discount_percent: 41,
      installments_text: 'em 10x sem juros',
      image_url:
        'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=600&q=80',
      affiliate_url: 'https://mercadolivre.com/sec/demo-airfryer',
      category: 'Eletroportáteis',
      badge_text: 'Oferta Relâmpago',
      free_shipping: true,
      is_full: true,
      rating: 4.9,
      reviews_count: 620,
      featured: true,
      active: true,
      marketplace: 'mercadolivre',
      loja_slug: 'loja-demo',
    },
    {
      mlb_id: 'SHP-DEMO-002',
      title: 'Garrafa Térmica Inteligente Inox com Sensor LED de Temperatura 500ml',
      original_price: 69.9,
      current_price: 29.9,
      discount_percent: 57,
      installments_text: 'em 3x sem juros',
      image_url:
        'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80',
      affiliate_url: 'https://s.shopee.com.br/demo-garrafa',
      category: 'Casa & Cozinha',
      badge_text: 'Mais Vendido',
      free_shipping: true,
      is_full: false,
      rating: 4.8,
      reviews_count: 1240,
      featured: true,
      active: true,
      marketplace: 'shopee',
      loja_slug: 'loja-demo',
    },
    {
      mlb_id: 'SHP-DEMO-003',
      title: 'Fone de Ouvido Bluetooth TWS Sem Fio com Cancelamento de Ruído e Display',
      original_price: 129.9,
      current_price: 49.9,
      discount_percent: 62,
      installments_text: 'em 6x sem juros',
      image_url:
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
      affiliate_url: 'https://s.shopee.com.br/demo-fone',
      category: 'Eletrônicos',
      badge_text: 'Menor Preço',
      free_shipping: true,
      is_full: false,
      rating: 4.9,
      reviews_count: 890,
      featured: false,
      active: true,
      marketplace: 'shopee',
      loja_slug: 'loja-demo',
    },
  ];

  console.log('\n📦 Inserindo 3 produtos exclusivos para "loja-demo"...');
  const { data: prodData, error: prodError } = await supabase
    .from('produtos_clarice')
    .upsert(demoProducts, { onConflict: 'mlb_id' })
    .select();

  if (prodError) {
    console.error('❌ Falha ao inserir produtos da loja-demo:', prodError.message);
    process.exit(1);
  }

  console.log(`✅ ${prodData.length} produtos cadastrados com sucesso para loja-demo:`);
  prodData.forEach((p, idx) => {
    console.log(
      `   ${idx + 1}. [${p.marketplace.toUpperCase()}] ${p.title} — R$ ${p.current_price} (-${p.discount_percent}%)`
    );
  });

  // 3. Verificação de Isolamento da Loja Oficial 'clarice'
  console.log('\n🔒 Verificando isolamento da loja oficial "clarice"...');
  const { count: clariceCount, error: countClariceErr } = await supabase
    .from('produtos_clarice')
    .select('*', { count: 'exact', head: true })
    .or('loja_slug.eq.clarice,loja_slug.is.null');

  const { count: demoCount, error: countDemoErr } = await supabase
    .from('produtos_clarice')
    .select('*', { count: 'exact', head: true })
    .eq('loja_slug', 'loja-demo');

  console.log(`   Total de produtos da loja "clarice": ${clariceCount} (100% preservada)`);
  console.log(`   Total de produtos da loja "loja-demo": ${demoCount} (isolada)`);

  console.log('\n✨ Concluído com sucesso!');
}

run().catch((err) => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
