/**
 * Script Idempotente de População da Loja de Demonstração FCIA
 * Garante que a 'loja-demo' esteja cadastrada e ativa em public.lojas_afiliados,
 * e insere 8 produtos demonstrativos exclusivos na tabela public.produtos_clarice.
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
  console.log('🚀 Iniciando seed da Loja de Demonstração (loja-demo)...');

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
    cor_destaque: '#10B981', // Verde esmeralda moderno da demo
    logo_url: null,
    hero_mascote_url: null,
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

  console.log(`✅ Loja teste "${storeData.nome_loja}" configurada com sucesso!`);
  console.log(`   Slug: ${storeData.slug} | Plano: ${storeData.plano.toUpperCase()} | Status: ${storeData.status_assinatura.toUpperCase()}`);

  // 2. Verificar quantos produtos já existem para 'loja-demo'
  const { data: existingProducts, error: countError } = await supabase
    .from('produtos_clarice')
    .select('id, mlb_id')
    .eq('loja_slug', 'loja-demo');

  if (countError) {
    console.error('❌ Erro ao consultar produtos existentes:', countError.message);
    process.exit(1);
  }

  const existingCount = existingProducts?.length || 0;
  console.log(`ℹ️ Produtos existentes para 'loja-demo': ${existingCount}`);

  // 3. Os 8 produtos demonstrativos exclusivos
  const demoProducts = [
    {
      mlb_id: 'MLB-DEMO-001',
      title: 'Fritadeira Sem Óleo Air Fryer Digital 4.5L Antiaderente Inox 1500W',
      original_price: 499.9,
      current_price: 279.9,
      discount_percent: 44,
      installments_text: 'em 10x sem juros',
      image_url:
        'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=600&q=80',
      affiliate_url: 'https://mercadolivre.com/sec/demo-airfryer',
      category: 'Eletroportáteis',
      badge_text: 'Oferta Relâmpago',
      free_shipping: true,
      is_full: true,
      rating: 4.9,
      reviews_count: 840,
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
      reviews_count: 1420,
      featured: true,
      active: true,
      marketplace: 'shopee',
      loja_slug: 'loja-demo',
    },
    {
      mlb_id: 'MLB-DEMO-003',
      title: 'Fone de Ouvido Sem Fio Bluetooth 5.3 com Cancelamento Ativo de Ruído',
      original_price: 249.9,
      current_price: 119.9,
      discount_percent: 52,
      installments_text: 'em 6x sem juros',
      image_url:
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
      affiliate_url: 'https://mercadolivre.com/sec/demo-fone',
      category: 'Eletrônicos',
      badge_text: 'Menor Preço',
      free_shipping: true,
      is_full: true,
      rating: 4.7,
      reviews_count: 980,
      featured: false,
      active: true,
      marketplace: 'mercadolivre',
      loja_slug: 'loja-demo',
    },
    {
      mlb_id: 'SHP-DEMO-004',
      title: 'Kit Jogo de Panelas Antiaderente Cerâmica 5 Peças com Tampas de Vidro',
      original_price: 389.9,
      current_price: 199.9,
      discount_percent: 48,
      installments_text: 'em 6x sem juros',
      image_url:
        'https://images.unsplash.com/photo-1584990347449-a2d4c2c044c9?auto=format&fit=crop&w=600&q=80',
      affiliate_url: 'https://s.shopee.com.br/demo-panelas',
      category: 'Casa & Cozinha',
      badge_text: 'Oferta Relâmpago',
      free_shipping: true,
      is_full: false,
      rating: 4.9,
      reviews_count: 512,
      featured: false,
      active: true,
      marketplace: 'shopee',
      loja_slug: 'loja-demo',
    },
    {
      mlb_id: 'MLB-DEMO-005',
      title: 'Smartwatch Relógio Inteligente com Monitor Cardíaco e Oxímetro Pro',
      original_price: 299.0,
      current_price: 139.9,
      discount_percent: 53,
      installments_text: 'em 5x sem juros',
      image_url:
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
      affiliate_url: 'https://mercadolivre.com/sec/demo-smartwatch',
      category: 'Eletrônicos',
      badge_text: 'Mais Vendido',
      free_shipping: true,
      is_full: true,
      rating: 4.6,
      reviews_count: 730,
      featured: true,
      active: true,
      marketplace: 'mercadolivre',
      loja_slug: 'loja-demo',
    },
    {
      mlb_id: 'MLB-DEMO-006',
      title: 'Kit Parafusadeira e Furadeira de Impacto Bivolt com Maleta e 24 Acessórios',
      original_price: 349.9,
      current_price: 189.9,
      discount_percent: 45,
      installments_text: 'em 6x sem juros',
      image_url:
        'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80',
      affiliate_url: 'https://mercadolivre.com/sec/demo-parafusadeira',
      category: 'Ferramentas',
      badge_text: 'Oferta Relâmpago',
      free_shipping: true,
      is_full: true,
      rating: 4.8,
      reviews_count: 410,
      featured: false,
      active: true,
      marketplace: 'mercadolivre',
      loja_slug: 'loja-demo',
    },
    {
      mlb_id: 'SHP-DEMO-007',
      title: 'Secador de Cabelo Iônico Profissional 2200W com 3 Temperaturas e Bico',
      original_price: 219.9,
      current_price: 109.9,
      discount_percent: 50,
      installments_text: 'em 4x sem juros',
      image_url:
        'https://images.unsplash.com/photo-1522338140262-f46f5913618a?auto=format&fit=crop&w=600&q=80',
      affiliate_url: 'https://s.shopee.com.br/demo-secador',
      category: 'Beleza & Saúde',
      badge_text: 'Menor Preço',
      free_shipping: true,
      is_full: false,
      rating: 4.9,
      reviews_count: 670,
      featured: false,
      active: true,
      marketplace: 'shopee',
      loja_slug: 'loja-demo',
    },
    {
      mlb_id: 'MLB-DEMO-008',
      title: 'Aspirador de Pó Robô Inteligente 3 em 1 Passa Pano e Varre Bivolt',
      original_price: 599.9,
      current_price: 329.9,
      discount_percent: 45,
      installments_text: 'em 10x sem juros',
      image_url:
        'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&w=600&q=80',
      affiliate_url: 'https://mercadolivre.com/sec/demo-aspirador',
      category: 'Eletroportáteis',
      badge_text: 'Mais Vendido',
      free_shipping: true,
      is_full: true,
      rating: 4.7,
      reviews_count: 530,
      featured: true,
      active: true,
      marketplace: 'mercadolivre',
      loja_slug: 'loja-demo',
    },
  ];

  for (const item of demoProducts) {
    const { error: upsertError } = await supabase
      .from('produtos_clarice')
      .upsert(item, { onConflict: 'mlb_id' });

    if (upsertError) {
      console.warn(`⚠️ Erro ao salvar produto ${item.mlb_id}:`, upsertError.message);
    } else {
      console.log(`  + Produto sincronizado: [${item.marketplace.toUpperCase()}] ${item.title.slice(0, 40)}...`);
    }
  }

  console.log('\n🎉 Sincronização da loja-demo concluída com sucesso!');
}

run().catch((err) => {
  console.error('❌ Falha fatal no script seed:', err);
  process.exit(1);
});
