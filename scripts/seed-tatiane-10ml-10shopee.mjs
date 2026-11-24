import fs from 'fs';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const [k, ...v] = l.split('=');
      return [k.trim(), v.join('=').trim().replace(/^["']|["']$/g, '')];
    })
);

const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const STORE_SLUG = 'entre-amigas-promos';
const CLIENT_ML_TAG = 'tatianemirianbernardoconcei';
const CLIENT_ML_TOOL = '51555285';
const CLIENT_SHOPEE_ID = '18318420060';

const ML_PRODUCTS = [
  {
    mlbId: 'MLB-33325840',
    title: 'Jogo de Panelas Cerâmica Brinox Ceramic Life Smart Plus 8 Peças',
    originalPrice: 999.0,
    currentPrice: 649.9,
    discountPercent: 35,
    installmentsText: 'em 10x sem juros',
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_900668-MLU78149806450_082024-O.webp',
    affiliateUrl: `https://produto.mercadolivre.com.br/MLB-33325840-jogo-de-panelas-brinox-ceramic-life-smart-plus-8-pecas-_JM?matt_word=${CLIENT_ML_TAG}&matt_tool=${CLIENT_ML_TOOL}`,
    category: 'Casa & Cozinha',
    badgeText: 'Mais Vendido',
    freeShipping: true,
    isFull: true,
    rating: 4.9,
    reviewsCount: 1420,
    featured: true, // DESTAQUE 1
  },
  {
    mlbId: 'MLB-77986057',
    title: 'Frigideira de Cerâmica Luxena 24cm Antiaderente Granito Premium',
    originalPrice: 199.9,
    currentPrice: 119.9,
    discountPercent: 40,
    installmentsText: 'em 3x sem juros',
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_927361-MLU78680190757_082024-O.webp',
    affiliateUrl: `https://produto.mercadolivre.com.br/MLB-77986057-frigideira-ceramica-luxena-24cm-antiaderente-_JM?matt_word=${CLIENT_ML_TAG}&matt_tool=${CLIENT_ML_TOOL}`,
    category: 'Casa & Cozinha',
    badgeText: 'Oferta do Dia',
    freeShipping: true,
    isFull: true,
    rating: 4.8,
    reviewsCount: 890,
    featured: true, // DESTAQUE 2
  },
  {
    mlbId: 'MLB-19479467',
    title: 'Cafeteira Nespresso Essenza Mini 110V Preta',
    originalPrice: 649.0,
    currentPrice: 389.0,
    discountPercent: 40,
    installmentsText: 'em 10x sem juros',
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_602129-MLU75704153592_042024-O.webp',
    affiliateUrl: `https://produto.mercadolivre.com.br/MLB-19479467-cafeteira-nespresso-essenza-mini-preta-_JM?matt_word=${CLIENT_ML_TAG}&matt_tool=${CLIENT_ML_TOOL}`,
    category: 'Eletroportáteis',
    badgeText: 'Destaque',
    freeShipping: true,
    isFull: true,
    rating: 4.9,
    reviewsCount: 3200,
    featured: false,
  },
  {
    mlbId: 'MLB-65923840',
    title: 'Cafeteira Espresso Dolce Crema 20 Bar Mondial Inox',
    originalPrice: 569.0,
    currentPrice: 429.9,
    discountPercent: 24,
    installmentsText: 'em 10x sem juros',
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_668965-MLU75283733279_032024-O.webp',
    affiliateUrl: `https://produto.mercadolivre.com.br/MLB-65923840-cafeteira-espresso-dolce-crema-20-bar-mondial-_JM?matt_word=${CLIENT_ML_TAG}&matt_tool=${CLIENT_ML_TOOL}`,
    category: 'Eletroportáteis',
    badgeText: 'Oferta',
    freeShipping: true,
    isFull: true,
    rating: 4.7,
    reviewsCount: 650,
    featured: false,
  },
  {
    mlbId: 'MLB-63315915',
    title: 'Kit 10 Potes de Vidro Hermético Aristus 640ml Retangular',
    originalPrice: 199.9,
    currentPrice: 139.9,
    discountPercent: 30,
    installmentsText: 'em 4x sem juros',
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_725916-MLU78250106433_082024-O.webp',
    affiliateUrl: `https://produto.mercadolivre.com.br/MLB-63315915-kit-10-potes-vidro-hermetico-aristus-640ml-_JM?matt_word=${CLIENT_ML_TAG}&matt_tool=${CLIENT_ML_TOOL}`,
    category: 'Casa & Cozinha',
    badgeText: 'Top Organização',
    freeShipping: true,
    isFull: true,
    rating: 4.9,
    reviewsCount: 2100,
    featured: false,
  },
  {
    mlbId: 'MLB-5426458821',
    title: 'Garrafa Térmica 1L Inox Clique Ampola de Vidro',
    originalPrice: 110.0,
    currentPrice: 48.9,
    discountPercent: 56,
    installmentsText: 'em 2x sem juros',
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_864115-MLU79612242131_092024-O.webp',
    affiliateUrl: `https://produto.mercadolivre.com.br/MLB-5426458821-garrafa-termica-1l-inox-clique-ampola-de-vidro-_JM?matt_word=${CLIENT_ML_TAG}&matt_tool=${CLIENT_ML_TOOL}`,
    category: 'Casa & Cozinha',
    badgeText: 'Imperdível',
    freeShipping: true,
    isFull: true,
    rating: 4.8,
    reviewsCount: 1540,
    featured: false,
  },
  {
    mlbId: 'MLB-4016084069',
    title: 'Faqueiro Tramontina Malibu 24 Peças Aço Inox',
    originalPrice: 79.9,
    currentPrice: 59.9,
    discountPercent: 25,
    installmentsText: 'em 2x sem juros',
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_824536-MLU76518177431_052024-O.webp',
    affiliateUrl: `https://produto.mercadolivre.com.br/MLB-4016084069-faqueiro-tramontina-malibu-24-pecas-aco-inox-_JM?matt_word=${CLIENT_ML_TAG}&matt_tool=${CLIENT_ML_TOOL}`,
    category: 'Casa & Cozinha',
    badgeText: 'Clássico',
    freeShipping: true,
    isFull: true,
    rating: 4.9,
    reviewsCount: 4300,
    featured: false,
  },
  {
    mlbId: 'MLB-75496347',
    title: 'Organizador Multiuso de Acrílico 2 Andares Giratório',
    originalPrice: 101.9,
    currentPrice: 68.9,
    discountPercent: 32,
    installmentsText: 'em 3x sem juros',
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_723377-MLU76228741369_052024-O.webp',
    affiliateUrl: `https://produto.mercadolivre.com.br/MLB-75496347-organizador-multiuso-acrilico-2-andares-_JM?matt_word=${CLIENT_ML_TAG}&matt_tool=${CLIENT_ML_TOOL}`,
    category: 'Organização',
    badgeText: 'Achadinho',
    freeShipping: true,
    isFull: true,
    rating: 4.8,
    reviewsCount: 920,
    featured: false,
  },
  {
    mlbId: 'MLB-50829260',
    title: 'Kit 6 Organizadores de Geladeira Porta Mantimentos Acrílico',
    originalPrice: 124.9,
    currentPrice: 89.9,
    discountPercent: 28,
    installmentsText: 'em 3x sem juros',
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_903332-MLU78152147820_082024-O.webp',
    affiliateUrl: `https://produto.mercadolivre.com.br/MLB-50829260-kit-6-organizadores-geladeira-porta-mantimentos-_JM?matt_word=${CLIENT_ML_TAG}&matt_tool=${CLIENT_ML_TOOL}`,
    category: 'Organização',
    badgeText: 'Geladeira Limpa',
    freeShipping: true,
    isFull: true,
    rating: 4.9,
    reviewsCount: 1150,
    featured: false,
  },
  {
    mlbId: 'MLB-42190700',
    title: 'Jogo de Panelas Rochedo Antiaderente Smart 5 Peças',
    originalPrice: 314.9,
    currentPrice: 219.9,
    discountPercent: 30,
    installmentsText: 'em 6x sem juros',
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_899201-MLU77995192841_082024-O.webp',
    affiliateUrl: `https://produto.mercadolivre.com.br/MLB-42190700-jogo-de-panelas-rochedo-antiaderente-smart-5-pecas-_JM?matt_word=${CLIENT_ML_TAG}&matt_tool=${CLIENT_ML_TOOL}`,
    category: 'Casa & Cozinha',
    badgeText: 'Mais Vendido',
    freeShipping: true,
    isFull: true,
    rating: 4.8,
    reviewsCount: 1800,
    featured: false,
  },
];

const SHOPEE_PRODUCTS = [
  {
    mlbId: 'SHP-58259419882',
    title: 'Jogo de Panelas 10 Peças + Wok + Jogo de Frigideiras Baesh Antiaderente',
    originalPrice: 389.9,
    currentPrice: 249.9,
    discountPercent: 36,
    installmentsText: 'em 6x sem juros',
    imageUrl: 'https://down-br.img.susercontent.com/file/br-11134207-820lt-mneu3e2fvuo4d7',
    affiliateUrl: `https://shopee.com.br/product/1584047662/58259419882?af_siteid=${CLIENT_SHOPEE_ID}&utm_source=an_${CLIENT_SHOPEE_ID}&utm_medium=affiliates`,
    category: 'Casa & Cozinha',
    badgeText: 'Shopee Oficial',
    freeShipping: true,
    isFull: true,
    rating: 4.9,
    reviewsCount: 2340,
    featured: true, // DESTAQUE 3
  },
  {
    mlbId: 'SHP-58270802579',
    title: 'Jogo Panelas 7 Peças Antiaderente Alça Removível Bege Wincy',
    originalPrice: 299.9,
    currentPrice: 199.9,
    discountPercent: 33,
    installmentsText: 'em 6x sem juros',
    imageUrl: 'https://down-br.img.susercontent.com/file/sg-11134201-82588-ms2a4njxexvr7f',
    affiliateUrl: `https://shopee.com.br/product/1049363036/58270802579?af_siteid=${CLIENT_SHOPEE_ID}&utm_source=an_${CLIENT_SHOPEE_ID}&utm_medium=affiliates`,
    category: 'Casa & Cozinha',
    badgeText: 'Achadinho',
    freeShipping: true,
    isFull: true,
    rating: 4.8,
    reviewsCount: 1120,
    featured: true, // DESTAQUE 4
  },
  {
    mlbId: 'SHP-22598562360',
    title: 'Kit 8 Recipientes Organizadores Herméticos - Antivazamento e Empilháveis',
    originalPrice: 119.9,
    currentPrice: 69.9,
    discountPercent: 42,
    installmentsText: 'em 3x sem juros',
    imageUrl: 'https://down-br.img.susercontent.com/file/sg-11134201-7rat6-maiogbyq32tff3',
    affiliateUrl: `https://shopee.com.br/product/1188935762/22598562360?af_siteid=${CLIENT_SHOPEE_ID}&utm_source=an_${CLIENT_SHOPEE_ID}&utm_medium=affiliates`,
    category: 'Casa & Cozinha',
    badgeText: 'Shopee Oferta',
    freeShipping: true,
    isFull: true,
    rating: 4.9,
    reviewsCount: 3410,
    featured: false,
  },
  {
    mlbId: 'SHP-58255005746',
    title: 'Rodinho Portátil - Mini Mop de Limpeza Rápida com Esponja Absorvente',
    originalPrice: 49.9,
    currentPrice: 24.9,
    discountPercent: 50,
    installmentsText: 'À vista',
    imageUrl: 'https://down-br.img.susercontent.com/file/br-11134207-81ztd-mkk057gijbpe12',
    affiliateUrl: `https://shopee.com.br/product/1198210509/58255005746?af_siteid=${CLIENT_SHOPEE_ID}&utm_source=an_${CLIENT_SHOPEE_ID}&utm_medium=affiliates`,
    category: 'Casa & Cozinha',
    badgeText: 'Super Desconto',
    freeShipping: true,
    isFull: false,
    rating: 4.7,
    reviewsCount: 5600,
    featured: false,
  },
  {
    mlbId: 'SHP-58268396800',
    title: 'Mop Giratório com Alça 13 Litros Lava e Seca com Balde',
    originalPrice: 99.0,
    currentPrice: 58.9,
    discountPercent: 40,
    installmentsText: 'em 2x sem juros',
    imageUrl: 'https://down-br.img.susercontent.com/file/sg-11134201-8258e-mrzydbrcwnpdfb',
    affiliateUrl: `https://shopee.com.br/product/565606931/58268396800?af_siteid=${CLIENT_SHOPEE_ID}&utm_source=an_${CLIENT_SHOPEE_ID}&utm_medium=affiliates`,
    category: 'Utilidades',
    badgeText: 'Praticidade',
    freeShipping: true,
    isFull: true,
    rating: 4.8,
    reviewsCount: 1890,
    featured: false,
  },
  {
    mlbId: 'SHP-58204320625',
    title: 'Processador Multislice Elétrico Gaabor 2 Litros Lâminas Inox',
    originalPrice: 149.9,
    currentPrice: 89.9,
    discountPercent: 40,
    installmentsText: 'em 3x sem juros',
    imageUrl: 'https://down-br.img.susercontent.com/file/sg-11134201-82605-mk2qcbc78s913d',
    affiliateUrl: `https://shopee.com.br/product/965617276/58204320625?af_siteid=${CLIENT_SHOPEE_ID}&utm_source=an_${CLIENT_SHOPEE_ID}&utm_medium=affiliates`,
    category: 'Utilidades',
    badgeText: 'Cozinha Fácil',
    freeShipping: true,
    isFull: true,
    rating: 4.9,
    reviewsCount: 1420,
    featured: false,
  },
  {
    mlbId: 'SHP-23894159856',
    title: 'Porta Condimentos Organizador 5 Em 1 Multifuncional',
    originalPrice: 65.0,
    currentPrice: 39.9,
    discountPercent: 38,
    installmentsText: 'À vista',
    imageUrl: 'https://down-br.img.susercontent.com/file/sg-11134201-81ztg-mmpfg6ocrpxe32',
    affiliateUrl: `https://shopee.com.br/product/617383056/23894159856?af_siteid=${CLIENT_SHOPEE_ID}&utm_source=an_${CLIENT_SHOPEE_ID}&utm_medium=affiliates`,
    category: 'Organização',
    badgeText: 'Organização',
    freeShipping: true,
    isFull: false,
    rating: 4.8,
    reviewsCount: 880,
    featured: false,
  },
  {
    mlbId: 'SHP-58208075568',
    title: 'Organizador Parede Multiuso Cozinha Porta Temperos e Utensílios',
    originalPrice: 59.9,
    currentPrice: 34.9,
    discountPercent: 42,
    installmentsText: 'À vista',
    imageUrl: 'https://down-br.img.susercontent.com/file/sg-11134201-81ztm-mmjbk106jxtx21',
    affiliateUrl: `https://shopee.com.br/product/1654794705/58208075568?af_siteid=${CLIENT_SHOPEE_ID}&utm_source=an_${CLIENT_SHOPEE_ID}&utm_medium=affiliates`,
    category: 'Organização',
    badgeText: 'Achadinho',
    freeShipping: true,
    isFull: false,
    rating: 4.7,
    reviewsCount: 650,
    featured: false,
  },
  {
    mlbId: 'SHP-58256470810',
    title: 'Porta Temperos Giratório com 6 Potes de Vidro Inox',
    originalPrice: 79.9,
    currentPrice: 49.9,
    discountPercent: 37,
    installmentsText: 'em 2x sem juros',
    imageUrl: 'https://down-br.img.susercontent.com/file/br-11134207-820mf-mlijks9446x1c9',
    affiliateUrl: `https://shopee.com.br/product/1758008984/58256470810?af_siteid=${CLIENT_SHOPEE_ID}&utm_source=an_${CLIENT_SHOPEE_ID}&utm_medium=affiliates`,
    category: 'Casa & Cozinha',
    badgeText: 'Destaque',
    freeShipping: true,
    isFull: true,
    rating: 4.9,
    reviewsCount: 2210,
    featured: false,
  },
  {
    mlbId: 'SHP-23394663253',
    title: 'Jogo de Panelas 12 Peças Titanium Exclusive Granito Bkza',
    originalPrice: 420.0,
    currentPrice: 279.9,
    discountPercent: 33,
    installmentsText: 'em 6x sem juros',
    imageUrl: 'https://down-br.img.susercontent.com/file/sg-11134201-821ej-mgs1vwe9c5jc74',
    affiliateUrl: `https://shopee.com.br/product/1039577544/23394663253?af_siteid=${CLIENT_SHOPEE_ID}&utm_source=an_${CLIENT_SHOPEE_ID}&utm_medium=affiliates`,
    category: 'Casa & Cozinha',
    badgeText: 'Linha Premium',
    freeShipping: true,
    isFull: true,
    rating: 4.9,
    reviewsCount: 940,
    featured: false,
  },
];

async function run() {
  console.log(`[1] Atualizando credenciais da loja ${STORE_SLUG}...`);
  // Salva ml_matt_word e ml_matt_tool e shopee_id na loja entre-amigas-promos
  const { data: updatedStore, error: storeError } = await sb
    .from('lojas_afiliados')
    .update({
      shopee_app_id: CLIENT_SHOPEE_ID,
      shopee_secret: `${CLIENT_ML_TAG}|${CLIENT_ML_TOOL}`,
      status_assinatura: 'ativo',
      plano: 'pro',
    })
    .eq('slug', STORE_SLUG)
    .select();

  if (storeError) {
    console.error('Erro ao atualizar loja:', storeError);
  } else {
    console.log('✅ Loja atualizada com sucesso:', updatedStore[0]?.slug);
  }

  console.log(`\n[2] Limpando catálogo anterior da loja ${STORE_SLUG}...`);
  const { error: delError } = await sb
    .from('produtos_clarice')
    .delete()
    .eq('loja_slug', STORE_SLUG);

  if (delError) {
    console.error('Erro ao deletar produtos antigos:', delError);
  } else {
    console.log('✅ Produtos antigos deletados.');
  }

  console.log(`\n[3] Inserindo os 10 produtos do Mercado Livre...`);
  const mlRows = ML_PRODUCTS.map((p, idx) => ({
    id: crypto.randomUUID(),
    mlb_id: `${p.mlbId}-eap`,
    title: p.title,
    original_price: p.originalPrice,
    current_price: p.currentPrice,
    discount_percent: p.discountPercent,
    installments_text: p.installmentsText,
    image_url: p.imageUrl,
    affiliate_url: p.affiliateUrl,
    category: p.category,
    badge_text: p.badgeText,
    free_shipping: p.freeShipping,
    is_full: p.isFull,
    rating: p.rating,
    reviews_count: p.reviewsCount,
    featured: p.featured,
    active: true,
    status: 'ativo',
    marketplace: 'mercadolivre',
    loja_slug: STORE_SLUG,
  }));

  const { data: insMl, error: errMl } = await sb
    .from('produtos_clarice')
    .insert(mlRows)
    .select();

  if (errMl) console.error('Erro ao inserir ML:', errMl);
  else console.log(`✅ ${insMl.length} produtos do Mercado Livre inseridos.`);

  console.log(`\n[4] Inserindo os 10 produtos da Shopee...`);
  const shopeeRows = SHOPEE_PRODUCTS.map((p, idx) => ({
    id: crypto.randomUUID(),
    mlb_id: `${p.mlbId}-eap`,
    title: p.title,
    original_price: p.originalPrice,
    current_price: p.currentPrice,
    discount_percent: p.discountPercent,
    installments_text: p.installmentsText,
    image_url: p.imageUrl,
    affiliate_url: p.affiliateUrl,
    category: p.category,
    badge_text: p.badgeText,
    free_shipping: p.freeShipping,
    is_full: p.isFull,
    rating: p.rating,
    reviews_count: p.reviewsCount,
    featured: p.featured,
    active: true,
    status: 'ativo',
    marketplace: 'shopee',
    loja_slug: STORE_SLUG,
  }));

  const { data: insShp, error: errShp } = await sb
    .from('produtos_clarice')
    .insert(shopeeRows)
    .select();

  if (errShp) console.error('Erro ao inserir Shopee:', errShp);
  else console.log(`✅ ${insShp.length} produtos da Shopee inseridos.`);

  // Validação final de contagem
  const { data: allProds } = await sb
    .from('produtos_clarice')
    .select('id, marketplace, featured, title')
    .eq('loja_slug', STORE_SLUG);

  const mlCount = allProds.filter((p) => p.marketplace === 'mercadolivre').length;
  const shpCount = allProds.filter((p) => p.marketplace === 'shopee').length;
  const featCount = allProds.filter((p) => p.featured).length;

  console.log(`\n🎉 TOTAL NA LOJA ${STORE_SLUG}:`);
  console.log(`   Mercado Livre: ${mlCount} produtos`);
  console.log(`   Shopee: ${shpCount} produtos`);
  console.log(`   Destaques no carrossel: ${featCount} produtos (esperado 4: 2 ML + 2 Shopee)`);
  console.log(`   Total Geral: ${allProds.length} produtos`);
}

run();
