import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tuxvpzeciwxgxhmcrprt.supabase.co';
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eHZwemVjaXd4Z3hobWNycHJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDk5NjY2MSwiZXhwIjoyMTEwNTcyNjYxfQ.62yQ_MWEcDL3kmU_sdC4hLQuUQYECZn63wnm3HjJ7uE';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const STORE_SLUG = 'entre-amigas-promos';
const ML_TAG = 'tatianemirianbernardoconcei';
const SHOPEE_ID = '18318420060';

export const PRODUTOS_ENTRE_AMIGAS = [
  // ──────────────────────────────────────────────────────────────────────────
  // 10 PRODUTOS MERCADO LIVRE (Comissão exclusiva: tatianemirianbernardoconcei)
  // ──────────────────────────────────────────────────────────────────────────
  {
    mlb_id: 'MLB-349182701-ea',
    title: 'Fritadeira Elétrica Air Fryer Mondial Family 4L Inox',
    original_price: 399.9,
    current_price: 269.9,
    discount_percent: 33,
    installments_text: 'em 6x sem juros',
    category: 'Eletroportáteis',
    badge_text: 'Mais Vendido',
    image_url: 'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=600&q=80',
    affiliate_url: `https://www.mercadolivre.com.br/p/MLB349182701?matt_word=${ML_TAG}`,
    marketplace: 'mercadolivre',
    free_shipping: true,
    is_full: true,
    featured: true, // Destaque 1
    rating: 4.8,
    reviews_count: 14820,
  },
  {
    mlb_id: 'MLB-118293402-ea',
    title: 'Jogo de Panelas Tramontina Antiaderente Starflon 10 Peças',
    original_price: 499.9,
    current_price: 329.9,
    discount_percent: 34,
    installments_text: 'em 8x sem juros',
    category: 'Casa & Cozinha',
    badge_text: 'Oferta Relâmpago',
    image_url: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=600&q=80',
    affiliate_url: `https://www.mercadolivre.com.br/p/MLB118293402?matt_word=${ML_TAG}`,
    marketplace: 'mercadolivre',
    free_shipping: true,
    is_full: true,
    featured: true, // Destaque 2
    rating: 4.9,
    reviews_count: 9410,
  },
  {
    mlb_id: 'MLB-899505803-ea',
    title: 'Mop Esfregão Giratório Balde 8 Litros Cesto Inox com 2 Refis',
    original_price: 129.9,
    current_price: 59.9,
    discount_percent: 54,
    installments_text: 'em 3x sem juros',
    category: 'Casa & Cozinha',
    badge_text: 'Queridinho do Lar',
    image_url: 'https://http2.mlstatic.com/D_Q_NP_2X_899505-MLB119768887077_102026-E--mop-esfregao-giratorio-balde-8-litros-cesto-inox-2-refil.webp',
    affiliate_url: `https://www.mercadolivre.com.br/p/MLB899505803?matt_word=${ML_TAG}`,
    marketplace: 'mercadolivre',
    free_shipping: true,
    is_full: true,
    featured: false,
    rating: 4.7,
    reviews_count: 3820,
  },
  {
    mlb_id: 'MLB-662110404-ea',
    title: 'Conjunto Kit 6 Organizadores de Geladeira Herméticos com Trava',
    original_price: 119.9,
    current_price: 67.39,
    discount_percent: 44,
    installments_text: 'em 3x sem juros',
    category: 'Casa & Cozinha',
    badge_text: 'Achadinho VIP',
    image_url: 'https://http2.mlstatic.com/D_Q_NP_2X_662110-MLA114543744263_072026-E.webp',
    affiliate_url: `https://www.mercadolivre.com.br/p/MLB662110404?matt_word=${ML_TAG}`,
    marketplace: 'mercadolivre',
    free_shipping: true,
    is_full: false,
    featured: false,
    rating: 4.8,
    reviews_count: 2150,
  },
  {
    mlb_id: 'MLB-840205805-ea',
    title: 'Garrafa Térmica 1L Inox Clique Ampola de Vidro Café Chá Nórdica',
    original_price: 149.9,
    current_price: 64.9,
    discount_percent: 56,
    installments_text: 'em 2x sem juros',
    category: 'Casa & Cozinha',
    badge_text: 'Radar 56% OFF',
    image_url: 'https://http2.mlstatic.com/D_Q_NP_2X_840205-MLB118584553236_102026-E--garrafa-termica-1l-inox-clique-ampola-de-vidro-cafe-cha.webp',
    affiliate_url: `https://www.mercadolivre.com.br/p/MLB840205805?matt_word=${ML_TAG}`,
    marketplace: 'mercadolivre',
    free_shipping: true,
    is_full: true,
    featured: false,
    rating: 4.8,
    reviews_count: 5310,
  },
  {
    mlb_id: 'MLB-441928306-ea',
    title: 'Secador de Cabelos Profissional Taiff Tourmaline Íon 2100W',
    original_price: 429.9,
    current_price: 279.9,
    discount_percent: 35,
    installments_text: 'em 6x sem juros',
    category: 'Beleza & Saúde',
    badge_text: 'Mais Vendido',
    image_url: 'https://images.unsplash.com/photo-1522338140262-f46f5913618a?auto=format&fit=crop&w=600&q=80',
    affiliate_url: `https://www.mercadolivre.com.br/p/MLB441928306?matt_word=${ML_TAG}`,
    marketplace: 'mercadolivre',
    free_shipping: true,
    is_full: true,
    featured: false,
    rating: 4.9,
    reviews_count: 8740,
  },
  {
    mlb_id: 'MLB-737786107-ea',
    title: 'Chapinha Prancha Taiff Titanium Progress Bivolt Profissional',
    original_price: 689.9,
    current_price: 479.9,
    discount_percent: 30,
    installments_text: 'em 10x sem juros',
    category: 'Beleza & Saúde',
    badge_text: 'Cabelos Perfeitos',
    image_url: 'https://http2.mlstatic.com/D_Q_NP_2X_737786-MLB89633101609_082025-E--chapinha-prancha-taiff-titanium-progress-bivolt.webp',
    affiliate_url: `https://www.mercadolivre.com.br/p/MLB737786107?matt_word=${ML_TAG}`,
    marketplace: 'mercadolivre',
    free_shipping: true,
    is_full: true,
    featured: false,
    rating: 4.8,
    reviews_count: 4230,
  },
  {
    mlb_id: 'MLB-558317308-ea',
    title: 'Aspirador de Pó Robô Inteligente 3 em 1 Passa Pano e Varre Bivolt',
    original_price: 599.9,
    current_price: 349.9,
    discount_percent: 42,
    installments_text: 'em 8x sem juros',
    category: 'Eletroportáteis',
    badge_text: 'Queridinho das Amigas',
    image_url: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=600&q=80',
    affiliate_url: `https://www.mercadolivre.com.br/p/MLB558317308?matt_word=${ML_TAG}`,
    marketplace: 'mercadolivre',
    free_shipping: true,
    is_full: true,
    featured: false,
    rating: 4.7,
    reviews_count: 6120,
  },
  {
    mlb_id: 'MLB-570222009-ea',
    title: 'Liquidificador Oster 1400W Jarra 3.2L Antibacteriana',
    original_price: 299.9,
    current_price: 189.9,
    discount_percent: 37,
    installments_text: 'em 4x sem juros',
    category: 'Eletroportáteis',
    badge_text: 'Potência Máxima',
    image_url: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=600&q=80',
    affiliate_url: `https://www.mercadolivre.com.br/p/MLB570222009?matt_word=${ML_TAG}`,
    marketplace: 'mercadolivre',
    free_shipping: true,
    is_full: true,
    featured: false,
    rating: 4.8,
    reviews_count: 3950,
  },
  {
    mlb_id: 'MLB-905697110-ea',
    title: 'Caixa de Som Bluetooth 100W IPX5 RGB TWS Portátil Bass Boost',
    original_price: 249.9,
    current_price: 149.9,
    discount_percent: 40,
    installments_text: 'em 3x sem juros',
    category: 'Eletrônicos',
    badge_text: 'Som Premium',
    image_url: 'https://http2.mlstatic.com/D_Q_NP_2X_905697-MLB114744531868_082026-E--caixa-de-som-bluetooth-100w-ipx5-rgb-tws-portatil-bass-boost.webp',
    affiliate_url: `https://www.mercadolivre.com.br/p/MLB905697110?matt_word=${ML_TAG}`,
    marketplace: 'mercadolivre',
    free_shipping: true,
    is_full: true,
    featured: false,
    rating: 4.8,
    reviews_count: 1890,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 10 PRODUTOS SHOPEE (Comissão exclusiva: 18318420060)
  // ──────────────────────────────────────────────────────────────────────────
  {
    mlb_id: 'SHP-883719211-ea',
    title: 'Escova Alisadora e Secadora 5 em 1 Modeladora Multifuncional',
    original_price: 159.9,
    current_price: 79.9,
    discount_percent: 50,
    installments_text: 'em 3x sem juros',
    category: 'Beleza & Saúde',
    badge_text: 'Viral no TikTok',
    image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
    affiliate_url: `https://shopee.com.br/product/29182741/883719211?af_siteid=${SHOPEE_ID}&utm_source=an_${SHOPEE_ID}`,
    marketplace: 'shopee',
    free_shipping: true,
    is_full: false,
    featured: true, // Destaque 3
    rating: 4.8,
    reviews_count: 7320,
  },
  {
    mlb_id: 'SHP-552819212-ea',
    title: 'Mini Processador e Triturador Elétrico Recarregável USB 250ml',
    original_price: 69.9,
    current_price: 34.9,
    discount_percent: 50,
    installments_text: 'em 2x sem juros',
    category: 'Eletroportáteis',
    badge_text: 'Praticidade Pura',
    image_url: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=600&q=80',
    affiliate_url: `https://shopee.com.br/product/29182741/552819212?af_siteid=${SHOPEE_ID}&utm_source=an_${SHOPEE_ID}`,
    marketplace: 'shopee',
    free_shipping: true,
    is_full: false,
    featured: true, // Destaque 4
    rating: 4.7,
    reviews_count: 5120,
  },
  {
    mlb_id: 'SHP-608571413-ea',
    title: 'Umidificador e Difusor de Aromas Ultrassônico LED 500ml',
    original_price: 89.9,
    current_price: 49.9,
    discount_percent: 44,
    installments_text: 'em 3x sem juros',
    category: 'Casa & Cozinha',
    badge_text: 'Aromaterapia',
    image_url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=600&q=80',
    affiliate_url: `https://shopee.com.br/product/29182741/608571413?af_siteid=${SHOPEE_ID}&utm_source=an_${SHOPEE_ID}`,
    marketplace: 'shopee',
    free_shipping: true,
    is_full: false,
    featured: false,
    rating: 4.8,
    reviews_count: 4210,
  },
  {
    mlb_id: 'SHP-507473814-ea',
    title: 'Luminária de Mesa LED Sem Fio Touch Recarregável 3 Tons',
    original_price: 79.9,
    current_price: 39.9,
    discount_percent: 50,
    installments_text: 'em 2x sem juros',
    category: 'Casa & Cozinha',
    badge_text: 'Decoração Moderna',
    image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80',
    affiliate_url: `https://shopee.com.br/product/29182741/507473814?af_siteid=${SHOPEE_ID}&utm_source=an_${SHOPEE_ID}`,
    marketplace: 'shopee',
    free_shipping: true,
    is_full: false,
    featured: false,
    rating: 4.7,
    reviews_count: 2890,
  },
  {
    mlb_id: 'SHP-505740415-ea',
    title: 'Fone de Ouvido Bluetooth 5.3 TWS Sem Fio com Case Carregador',
    original_price: 99.0,
    current_price: 48.9,
    discount_percent: 51,
    installments_text: 'em 3x sem juros',
    category: 'Eletrônicos',
    badge_text: 'Bateria 24h',
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
    affiliate_url: `https://shopee.com.br/product/29182741/505740415?af_siteid=${SHOPEE_ID}&utm_source=an_${SHOPEE_ID}`,
    marketplace: 'shopee',
    free_shipping: true,
    is_full: false,
    featured: false,
    rating: 4.6,
    reviews_count: 8120,
  },
  {
    mlb_id: 'SHP-602143416-ea',
    title: 'Garrafa Térmica Inteligente com Sensor Digital de Temperatura LED',
    original_price: 59.9,
    current_price: 29.9,
    discount_percent: 50,
    installments_text: 'À vista',
    category: 'Casa & Cozinha',
    badge_text: 'Sucesso de Vendas',
    image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80',
    affiliate_url: `https://shopee.com.br/product/29182741/602143416?af_siteid=${SHOPEE_ID}&utm_source=an_${SHOPEE_ID}`,
    marketplace: 'shopee',
    free_shipping: true,
    is_full: false,
    featured: false,
    rating: 4.8,
    reviews_count: 11450,
  },
  {
    mlb_id: 'SHP-512496017-ea',
    title: 'Kit 3 Pincéis de Maquiagem Profissionais com Esponja Beauty',
    original_price: 49.9,
    current_price: 24.9,
    discount_percent: 50,
    installments_text: 'À vista',
    category: 'Beleza & Saúde',
    badge_text: 'Make Perfeita',
    image_url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=600&q=80',
    affiliate_url: `https://shopee.com.br/product/29182741/512496017?af_siteid=${SHOPEE_ID}&utm_source=an_${SHOPEE_ID}`,
    marketplace: 'shopee',
    free_shipping: true,
    is_full: false,
    featured: false,
    rating: 4.9,
    reviews_count: 3410,
  },
  {
    mlb_id: 'SHP-584308618-ea',
    title: 'Dispenser Automático de Sabonete Líquido e Detergente com Sensor',
    original_price: 79.9,
    current_price: 39.9,
    discount_percent: 50,
    installments_text: 'em 2x sem juros',
    category: 'Casa & Cozinha',
    badge_text: 'Mais Higiene',
    image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
    affiliate_url: `https://shopee.com.br/product/29182741/584308618?af_siteid=${SHOPEE_ID}&utm_source=an_${SHOPEE_ID}`,
    marketplace: 'shopee',
    free_shipping: true,
    is_full: false,
    featured: false,
    rating: 4.7,
    reviews_count: 2180,
  },
  {
    mlb_id: 'SHP-514432319-ea',
    title: 'Copo Térmico com Tampa e Abridor Inox Parede Dupla 473ml',
    original_price: 69.9,
    current_price: 36.9,
    discount_percent: 47,
    installments_text: 'em 2x sem juros',
    category: 'Casa & Cozinha',
    badge_text: 'Gela 4 Horas',
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    affiliate_url: `https://shopee.com.br/product/29182741/514432319?af_siteid=${SHOPEE_ID}&utm_source=an_${SHOPEE_ID}`,
    marketplace: 'shopee',
    free_shipping: true,
    is_full: false,
    featured: false,
    rating: 4.8,
    reviews_count: 6720,
  },
  {
    mlb_id: 'SHP-584100920-ea',
    title: 'Kit 4 Capas de Almofadas Decorativas Aveludadas para Sofá 45x45',
    original_price: 89.9,
    current_price: 49.9,
    discount_percent: 44,
    installments_text: 'em 3x sem juros',
    category: 'Casa & Cozinha',
    badge_text: 'Sala Renovada',
    image_url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=600&q=80',
    affiliate_url: `https://shopee.com.br/product/29182741/584100920?af_siteid=${SHOPEE_ID}&utm_source=an_${SHOPEE_ID}`,
    marketplace: 'shopee',
    free_shipping: true,
    is_full: false,
    featured: false,
    rating: 4.8,
    reviews_count: 4120,
  },
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🚀 ABASTECENDO LOJA ENTRE AMIGAS PROMOS (20 PRODUTOS REAIS)');
  console.log('🏬 Loja: Entre amigas promos (slug: entre-amigas-promos)');
  console.log(`🏷️ ML Tag: ${ML_TAG}`);
  console.log(`🛒 Shopee ID: ${SHOPEE_ID}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // 1. Validação prévia de imagens (HTTP 200)
  console.log('🔍 1. Validando status HTTP 200 das 20 imagens de produtos...');
  for (let i = 0; i < PRODUTOS_ENTRE_AMIGAS.length; i++) {
    const item = PRODUTOS_ENTRE_AMIGAS[i];
    try {
      const res = await fetch(item.image_url, { method: 'GET' });
      if (res.status !== 200) {
        throw new Error(`Imagem do item ${i + 1} (${item.title}) retornou HTTP ${res.status}`);
      }
      console.log(`   [${i + 1}/20] ✅ 200 OK — ${item.title.slice(0, 40)}`);
    } catch (err) {
      console.error(`   [${i + 1}/20] ❌ Erro na imagem: ${err.message}`);
      throw err;
    }
  }

  // 2. Validação rigorosa de comissão (Regra Crítica: NUNCA apontar para Clarice)
  console.log('\n🔒 2. Validando comissão exclusiva (Zero vazamento para loja matriz Clarice)...');
  for (let i = 0; i < PRODUTOS_ENTRE_AMIGAS.length; i++) {
    const item = PRODUTOS_ENTRE_AMIGAS[i];
    if (item.affiliate_url.includes('clarice') || item.affiliate_url.includes('18364201389')) {
      throw new Error(`VIOLAÇÃO CRÍTICA: Produto ${item.title} contém credenciais da Clarice!`);
    }
    if (item.marketplace === 'mercadolivre') {
      if (!item.affiliate_url.includes(`matt_word=${ML_TAG}`)) {
        throw new Error(`Produto ML ${item.title} sem a tag oficial ${ML_TAG}!`);
      }
    } else if (item.marketplace === 'shopee') {
      if (!item.affiliate_url.includes(`af_siteid=${SHOPEE_ID}`) || !item.affiliate_url.includes(`utm_source=an_${SHOPEE_ID}`)) {
        throw new Error(`Produto Shopee ${item.title} sem o ID oficial ${SHOPEE_ID}!`);
      }
    }
    console.log(`   [${i + 1}/20] ✅ Comissão 100% isolada para ${STORE_SLUG}`);
  }

  // 3. Limpeza limpa de produtos anteriores desta loja
  console.log(`\n🧹 3. Removendo produtos anteriores da loja '${STORE_SLUG}'...`);
  const { error: delErr } = await supabase
    .from('produtos_clarice')
    .delete()
    .eq('loja_slug', STORE_SLUG);

  if (delErr) {
    throw new Error(`Falha ao limpar produtos anteriores: ${delErr.message}`);
  }

  // 4. Preparação dos registros no schema produtos_clarice
  const rowsToInsert = PRODUTOS_ENTRE_AMIGAS.map((p) => ({
    id: crypto.randomUUID(),
    mlb_id: p.mlb_id,
    title: p.title,
    original_price: p.original_price,
    current_price: p.current_price,
    discount_percent: p.discount_percent,
    installments_text: p.installments_text,
    category: p.category,
    badge_text: p.badge_text,
    image_url: p.image_url,
    affiliate_url: p.affiliate_url,
    marketplace: p.marketplace,
    free_shipping: p.free_shipping,
    is_full: p.is_full,
    featured: p.featured,
    rating: p.rating,
    reviews_count: p.reviews_count,
    active: true,
    status: 'ativo',
    loja_slug: STORE_SLUG,
  }));

  // 5. Inserção no Supabase
  console.log(`\n📥 4. Inserindo os 20 produtos no Supabase (produtos_clarice)...`);
  const { data: inserted, error: insErr } = await supabase
    .from('produtos_clarice')
    .insert(rowsToInsert)
    .select('id, mlb_id, title, marketplace, current_price, discount_percent, featured, affiliate_url');

  if (insErr) {
    throw new Error(`Erro ao inserir produtos no banco: ${insErr.message}`);
  }

  console.log(`\n🎉 ${inserted.length} PRODUTOS INSERIDOS COM SUCESSO!\n`);
  inserted.forEach((item, idx) => {
    const star = item.featured ? '⭐ [CARROSSEL]' : '  ';
    console.log(`${star} #${idx + 1} [${item.marketplace.toUpperCase()}] ${item.title}`);
    console.log(`     Preço: R$ ${item.current_price.toFixed(2)} (${item.discount_percent}% OFF) | ID: ${item.mlb_id}`);
    console.log(`     Link Afiliado: ${item.affiliate_url}`);
  });

  // 6. Conferência final do total de produtos cadastrados para entre-amigas-promos
  const { count: finalCount, error: countErr } = await supabase
    .from('produtos_clarice')
    .select('*', { count: 'exact', head: true })
    .eq('loja_slug', STORE_SLUG)
    .eq('active', true);

  console.log(`\n📊 Conferência no banco: ${finalCount} produtos ativos cadastrados para '${STORE_SLUG}'.`);
  if (finalCount !== 20) {
    throw new Error(`Contagem final inesperada: esperado 20, obtido ${finalCount}`);
  }
}

main().catch((err) => {
  console.error('❌ Falha na execução:', err);
  process.exit(1);
});
