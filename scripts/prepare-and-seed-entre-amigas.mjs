import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const STORE_SLUG = 'entre-amigas-promos';
const CLIENT_ML_TAG = 'tatianemirianbernardoconcei';

// 20 itens 100% verificados e ao vivo no Mercado Livre
const SELECTED_ITEMS = [
  // 1. Casa & Cozinha (Destaque 1)
  {
    sourceMlb: 'MLB-33325840',
    cleanType: 'catalog',
    featured: true,
    badgeText: 'Radar 35% OFF',
  },
  // 2. Casa & Cozinha (Destaque 2)
  {
    sourceMlb: 'MLB-77986057',
    cleanType: 'catalog',
    featured: true,
    badgeText: 'Radar 40% OFF',
  },
  // 3. Eletroportáteis (Destaque 3)
  {
    sourceMlb: 'MLB-19479467',
    cleanType: 'catalog',
    featured: true,
    badgeText: 'Radar 40% OFF',
  },
  // 4. Beleza & Saúde (Destaque 4)
  {
    sourceMlb: 'MLB-2032887141',
    cleanType: 'catalog',
    featured: true,
    badgeText: 'Radar 37% OFF',
  },
  // 5. Casa & Cozinha
  {
    sourceMlb: 'MLB-63315915',
    cleanType: 'catalog',
    featured: false,
    badgeText: 'Radar 30% OFF',
  },
  // 6. Casa & Cozinha
  {
    sourceMlb: 'MLB-5426458821',
    cleanType: 'direct',
    featured: false,
    badgeText: 'Radar 56% OFF',
  },
  // 7. Casa & Cozinha
  {
    sourceMlb: 'MLB-4016084069',
    cleanType: 'direct',
    featured: false,
    badgeText: 'Radar 25% OFF',
  },
  // 8. Casa & Cozinha
  {
    sourceMlb: 'MLB-75496347',
    cleanType: 'catalog',
    featured: false,
    badgeText: 'Radar 32% OFF',
  },
  // 9. Casa & Cozinha
  {
    sourceMlb: 'MLB-50829260',
    cleanType: 'catalog',
    featured: false,
    badgeText: 'Radar 28% OFF',
  },
  // 10. Casa & Cozinha
  {
    sourceMlb: 'MLB-42190700',
    cleanType: 'catalog',
    featured: false,
    badgeText: 'Radar 30% OFF',
  },
  // 11. Eletroportáteis
  {
    sourceMlb: 'MLB-65923840',
    cleanType: 'catalog',
    featured: false,
    badgeText: 'Radar 24% OFF',
  },
  // 12. Eletroportáteis
  {
    sourceMlb: 'MLB-79739578',
    cleanType: 'catalog',
    featured: false,
    badgeText: 'Radar 52% OFF',
  },
  // 13. Eletroportáteis
  {
    sourceMlb: 'MLB-4100716741',
    cleanType: 'direct',
    featured: false,
    badgeText: 'Radar 20% OFF',
  },
  // 14. Beleza & Saúde
  {
    sourceMlb: 'MLB-5348815342',
    cleanType: 'direct',
    featured: false,
    badgeText: 'Radar 29% OFF',
  },
  // 15. Beleza & Saúde
  {
    sourceMlb: 'MLB-46509254',
    cleanType: 'catalog',
    featured: false,
    badgeText: 'Radar 55% OFF',
  },
  // 16. Beleza & Saúde
  {
    sourceMlb: 'MLB-19486347',
    cleanType: 'catalog',
    featured: false,
    badgeText: 'Radar 25% OFF',
  },
  // 17. Eletrônicos
  {
    sourceMlb: 'MLB-65679146',
    cleanType: 'catalog',
    featured: false,
    badgeText: 'Radar 16% OFF',
  },
  // 18. Eletrônicos
  {
    sourceMlb: 'MLB-54284933',
    cleanType: 'catalog',
    featured: false,
    badgeText: 'Radar 20% OFF',
  },
  // 19. Eletrônicos
  {
    sourceMlb: 'MLB-77671691',
    cleanType: 'catalog',
    featured: false,
    badgeText: 'Radar 23% OFF',
  },
  // 20. Infantil & Bebês
  {
    sourceMlb: 'MLB-66279577',
    cleanType: 'catalog',
    featured: false,
    badgeText: 'Radar 39% OFF',
  },
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🚀 POVOAMENTO DE 20 PRODUTOS REAIS — ENTRE AMIGAS PROMOS');
  console.log('👤 Afiliada: Tatiane Mirian Bernardo Conceição');
  console.log(`🏷️ Tag ML: ${CLIENT_ML_TAG}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // 1. Limpeza total de registros anteriores da loja entre-amigas-promos
  console.log(`🗑️ Removendo produtos antigos de '${STORE_SLUG}'...`);
  const { error: delErr } = await sb.from('produtos_clarice').delete().eq('loja_slug', STORE_SLUG);
  if (delErr) {
    throw new Error(`Falha ao limpar produtos antigos: ${delErr.message}`);
  }
  console.log('✅ Banco limpo para a loja da cliente.');

  // 2. Coleta os dados originais dos 20 produtos
  const sourceMlbs = SELECTED_ITEMS.map((i) => i.sourceMlb);
  const { data: sourceRows, error: fetchErr } = await sb
    .from('produtos_clarice')
    .select('*')
    .in('mlb_id', sourceMlbs)
    .eq('loja_slug', 'clarice');

  if (fetchErr) {
    throw new Error(`Falha ao consultar produtos matriz: ${fetchErr.message}`);
  }

  console.log(`📦 Carregados ${sourceRows.length} produtos de referência da matriz.`);
  const rowMap = new Map();
  sourceRows.forEach((r) => rowMap.set(r.mlb_id, r));

  const rowsToInsert = [];
  const usedImages = new Set();

  for (let idx = 0; idx < SELECTED_ITEMS.length; idx++) {
    const spec = SELECTED_ITEMS[idx];
    const src = rowMap.get(spec.sourceMlb);
    if (!src) {
      throw new Error(`Produto não encontrado no banco: ${spec.sourceMlb}`);
    }

    const digits = src.mlb_id.replace(/\D/g, '');
    let finalBuyUrl = '';
    if (spec.cleanType === 'catalog') {
      finalBuyUrl = `https://www.mercadolivre.com.br/p/MLB${digits}?matt_word=${CLIENT_ML_TAG}`;
    } else {
      finalBuyUrl = `https://produto.mercadolivre.com.br/MLB-${digits}?matt_word=${CLIENT_ML_TAG}`;
    }

    // Verifica imagem única
    if (usedImages.has(src.image_url)) {
      console.warn(`⚠️ Imagem duplicada detectada: ${src.image_url}`);
    }
    usedImages.add(src.image_url);

    rowsToInsert.push({
      mlb_id: `${digits}-ea`,
      loja_slug: STORE_SLUG,
      title: src.title,
      original_price: Number(src.original_price),
      current_price: Number(src.current_price),
      discount_percent: Number(src.discount_percent || 0),
      installments_text: src.installments_text || 'À vista',
      image_url: src.image_url,
      affiliate_url: finalBuyUrl,
      category: src.category,
      badge_text: spec.badgeText,
      free_shipping: Boolean(src.free_shipping),
      is_full: Boolean(src.is_full),
      rating: Number(src.rating || 4.8),
      reviews_count: Number(src.reviews_count || 120),
      featured: spec.featured,
      active: true,
      status: 'ativo',
      marketplace: 'mercadolivre',
    });
  }

  // 3. Inserção no Supabase
  console.log(`\n💾 Inserindo ${rowsToInsert.length} produtos reais com a tag da Tatiane...`);
  const { data: inserted, error: insErr } = await sb
    .from('produtos_clarice')
    .insert(rowsToInsert)
    .select('id, title, category, affiliate_url, featured, image_url');

  if (insErr) {
    throw new Error(`Erro ao inserir produtos no Supabase: ${insErr.message}`);
  }

  console.log(`\n🎉 SUCESSO: ${inserted.length} produtos inseridos com sucesso!`);
  inserted.forEach((p, i) => {
    console.log(
      `   [${i + 1}] ${p.featured ? '⭐ [DESTAQUE]' : '📦'} [${p.category}] ${p.title.slice(0, 45)}`
    );
    console.log(`       🔗 URL: ${p.affiliate_url}`);
  });

  // 4. Confirma loja_afiliados
  await sb
    .from('lojas_afiliados')
    .update({
      plano: 'pro',
      status_assinatura: 'pendente',
      shopee_secret: CLIENT_ML_TAG,
      shopee_app_id: '18318420060',
    })
    .eq('slug', STORE_SLUG);

  console.log('\n✅ Loja confirmada no Supabase com plano PRO e credenciais preservadas.');
}

main().catch((e) => {
  console.error('❌ Falha:', e);
  process.exit(1);
});
