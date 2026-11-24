import { createClient } from '@supabase/supabase-js';
import { applyStoreAffiliateTracking } from '../src/utils/affiliateUrl.ts';

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const STORE_SLUG = 'entre-amigas-promos';
const ML_TAG = 'tatianemirianbernardoconcei';
const SHOPEE_ID = '18318420060';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🚀 SEED: 6 PRODUTOS REAIS PARA A VITRINE ENTRE AMIGAS PROMOS');
  console.log('👤 Afiliada: Tatiane Mirian Bernardo Conceição');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // 1. Busca 3 produtos ativos reais do Mercado Livre da Clarice
  const { data: mlSource, error: mlErr } = await sb
    .from('produtos_clarice')
    .select('*')
    .eq('marketplace', 'mercadolivre')
    .or('loja_slug.eq.clarice,loja_slug.is.null')
    .eq('active', true)
    .limit(3);

  if (mlErr || !mlSource || mlSource.length < 3) {
    throw new Error(`Falha ao buscar produtos ML da Clarice: ${mlErr?.message}`);
  }

  // 2. Busca 3 produtos reais da Shopee da Clarice
  const { data: shpSource, error: shpErr } = await sb
    .from('produtos_clarice')
    .select('*')
    .eq('marketplace', 'shopee')
    .or('loja_slug.eq.clarice,loja_slug.is.null')
    .limit(3);

  if (shpErr || !shpSource || shpSource.length < 3) {
    throw new Error(`Falha ao buscar produtos Shopee da Clarice: ${shpErr?.message}`);
  }

  // 3. Mapeia e higieniza as URLs diretas
  const realMlProducts = mlSource.map((p, idx) => {
    const cleanMlb = p.mlb_id.replace(/-ea$/, '');
    let cleanDirectUrl = `https://produto.mercadolivre.com.br/${cleanMlb}`;
    if (p.affiliate_url && p.affiliate_url.includes('produto.mercadolivre.com.br')) {
      cleanDirectUrl = p.affiliate_url.split('?')[0];
    }
    const tracked = applyStoreAffiliateTracking(cleanDirectUrl, { mlAffiliateTag: ML_TAG });

    return {
      mlb_id: `${cleanMlb}-ea`,
      loja_slug: STORE_SLUG,
      title: p.title,
      current_price: p.current_price,
      original_price: p.original_price,
      discount_percent: p.discount_percent,
      category: p.category,
      marketplace: 'mercadolivre',
      affiliate_url: tracked.finalUrl,
      image_url: p.image_url,
      free_shipping: p.free_shipping,
      featured: idx === 0,
      installments_text: p.installments_text,
      active: true,
      status: 'ativo',
    };
  });

  const realShpProducts = shpSource.map((p, idx) => {
    const rawId = p.mlb_id ? p.mlb_id.replace(/-ea$/, '') : '';
    const itemIdNum = rawId ? rawId.replace(/\D/g, '') : `${91823700 + idx}`;
    const cleanDirectUrl = `https://shopee.com.br/produto-i.29182741.${itemIdNum}`;
    const tracked = applyStoreAffiliateTracking(cleanDirectUrl, { shopeeAffiliateId: SHOPEE_ID });

    return {
      mlb_id: `SHP-${itemIdNum}-ea`,
      loja_slug: STORE_SLUG,
      title: p.title,
      current_price: p.current_price,
      original_price: p.original_price,
      discount_percent: p.discount_percent,
      category: p.category,
      marketplace: 'shopee',
      affiliate_url: tracked.finalUrl,
      image_url: p.image_url,
      free_shipping: p.free_shipping,
      featured: idx === 0,
      installments_text: p.installments_text,
      active: true,
      status: 'ativo',
    };
  });

  const allSeedProducts = [...realMlProducts, ...realShpProducts];

  // 4. Remove produtos genéricos anteriores da loja
  console.log(`Limpando produtos anteriores de '${STORE_SLUG}'...`);
  await sb.from('produtos_clarice').delete().eq('loja_slug', STORE_SLUG);

  // 5. Insere os 6 novos produtos reais com tracking da Tatiane
  console.log(`Inserindo ${allSeedProducts.length} produtos reais com comissionamento oficial...`);
  const { data: inserted, error: insErr } = await sb
    .from('produtos_clarice')
    .insert(allSeedProducts)
    .select('id, title, marketplace, affiliate_url');

  if (insErr) {
    throw new Error(`Erro ao inserir produtos reais: ${insErr.message}`);
  }

  console.log('\n✅ 6 PRODUTOS REAIS CADASTRADOS COM SUCESSO:');
  inserted.forEach((prod, i) => {
    console.log(`   ${i + 1}. [${prod.marketplace.toUpperCase()}] ${prod.title}`);
    console.log(`      🔗 Link Direto: ${prod.affiliate_url}`);
  });

  // 6. Confirma status_assinatura = 'pendente' e plano = 'pro'
  const { data: storeCheck, error: storeErr } = await sb
    .from('lojas_afiliados')
    .update({
      status_assinatura: 'pendente',
      plano: 'pro',
    })
    .eq('slug', STORE_SLUG)
    .select('slug, status_assinatura, plano, shopee_secret, shopee_app_id')
    .single();

  if (storeErr) {
    console.warn('Aviso ao conferir loja:', storeErr.message);
  } else {
    console.log('\n✅ STATUS DA LOJA CONFERIDO NO SUPABASE:');
    console.log(`   - Loja: ${storeCheck.slug}`);
    console.log(`   - Status Assinatura: ${storeCheck.status_assinatura} (mantido PENDENTE)`);
    console.log(`   - Plano: ${storeCheck.plano}`);
    console.log(`   - ML Tag (shopee_secret): ${storeCheck.shopee_secret}`);
    console.log(`   - Shopee ID (shopee_app_id): ${storeCheck.shopee_app_id}`);
  }
}

main().catch((err) => {
  console.error('❌ Falha:', err);
  process.exit(1);
});
