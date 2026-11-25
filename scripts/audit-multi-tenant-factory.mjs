import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.BASE_URL || 'https://clariceachadinhos.vercel.app';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tuxvpzeciwxgxhmcrprt.supabase.co';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eHZwemVjaXd4Z3hobWNycHJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDk5NjY2MSwiZXhwIjoyMTEwNTcyNjYxfQ.62yQ_MWEcDL3kmU_sdC4hLQuUQYECZn63wnm3HjJ7uE';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const VIEWPORTS = [
  { name: 'Samsung Galaxy (360x800)', width: 360, height: 800 },
  { name: 'iPhone 14/15 (390x844)', width: 390, height: 844 },
];

async function checkNoHorizontalOverflow(page, contextName) {
  const info = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const bodyWidth = document.body.scrollWidth;
    const isOver = docWidth > winWidth + 2 || bodyWidth > winWidth + 2;
    if (!isOver) return { isOver: false, docWidth, winWidth };

    const elements = Array.from(document.querySelectorAll('*'));
    const culprits = [];
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.right > winWidth + 2 || el.scrollWidth > winWidth + 2) {
        culprits.push({
          tag: el.tagName,
          className: typeof el.className === 'string' ? el.className.slice(0, 80) : '',
          id: el.id,
          right: Math.round(rect.right),
          scrollWidth: el.scrollWidth,
          offsetWidth: el.offsetWidth,
          text: (el.innerText || '').slice(0, 40).replace(/\n/g, ' '),
        });
      }
    }
    return { isOver: true, docWidth, winWidth, culprits: culprits.slice(0, 8) };
  });

  if (info.isOver) {
    console.error(`❌ [OVERFLOW em ${contextName}]: scrollWidth (${info.docWidth}px) > innerWidth (${info.winWidth}px)`);
    console.error(`Elementos causadores:`, JSON.stringify(info.culprits, null, 2));
    throw new Error(`[OVERFLOW] Em ${contextName}: scrollWidth (${info.docWidth}px) > innerWidth (${info.winWidth}px)`);
  }
  console.log(`   ✅ Sem overflow em ${contextName} (${info.docWidth}px <= ${info.winWidth}px)`);
  return true;
}

async function main() {
  console.log(`\n============================================================`);
  console.log(`🏭 INICIANDO AUDITORIA DA FÁBRICA MULTI-TENANT (E2E)`);
  console.log(`   Alvo: ${BASE_URL}`);
  console.log(`============================================================\n`);

  const timestamp = Date.now();
  const testSlug = `stress-tenant-${timestamp}`;
  const testEmail = `stress.tenant.${timestamp}@teste.fcia.com.br`;
  const testPassword = 'TesteSenhaSegura2026@';
  // 58 caracteres intencionais para teste de quebra de layout mobile
  const testStoreName = 'Achadinhos da Família Silva & Promoções Imperdíveis 2026';
  const testMlTag = 'stressmltag';
  const testMlTool = '59998888';
  const testShopeeId = '18999888777';

  const testStoreRecord = {
    id: `store-stress-${timestamp}`,
    slug: testSlug,
    nome_loja: testStoreName,
    subtitulo: 'Curadoria de ofertas com dados extremos e nomes longos para estresse de layout',
    cor_primaria: '#0F172A',
    cor_destaque: '#FFE600',
    logo_url: null,
    hero_mascote_url: null,
    banner_url: null,
    whatsapp_vip_url: 'https://chat.whatsapp.com/stress-test-vip',
    instagram_url: 'https://instagram.com/stress.test.loja',
    plano: 'pro',
    status_assinatura: 'ativo',
    shopee_app_id: testShopeeId,
    shopee_secret: `${testMlTag}|${testMlTool}`,
    ml_affiliate_tag: testMlTag,
    ml_matt_tool: testMlTool,
    shopee_affiliate_id: testShopeeId,
    owner_email: testEmail,
    owner_password: testPassword,
    dominio_customizado: null,
    whatsapp_contato: '11999998888',
    cpf_cnpj: '12345678901',
  };

  console.log(`1. Provisionando Loja de Teste de Estresse no Supabase...`);
  console.log(`   - Slug: ${testSlug}`);
  console.log(`   - Nome: "${testStoreName}" (${testStoreName.length} caracteres)`);
  console.log(`   - ML Tag / Tool: ${testMlTag} / ${testMlTool}`);
  console.log(`   - Shopee ID: ${testShopeeId}`);

  const { data: insertedStore, error: insertError } = await supabaseAdmin
    .from('lojas_afiliados')
    .insert(testStoreRecord)
    .select()
    .single();

  if (insertError) {
    console.error('❌ Falha ao provisionar loja no Supabase:', insertError);
    process.exit(1);
  }
  console.log('   ✅ Loja provisionada com sucesso no banco de dados!');

  const browser = await chromium.launch({ headless: true });

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n------------------------------------------------------------`);
      console.log(`📱 TESTANDO VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
      console.log(`------------------------------------------------------------`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        userAgent:
          'Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
      });
      const page = await context.newPage();

      // =====================================================================
      // 1. LOGIN NO /admin COMO NOVO LOJISTA
      // =====================================================================
      console.log(`\n🔹 [${vp.name}] 1. Acessando /admin e realizando login...`);
      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);

      // Garante modo Lojista
      const lojistaBtn = page.getByRole('button', { name: /Lojista Assinante/i });
      if (await lojistaBtn.isVisible()) {
        await lojistaBtn.click();
        await page.waitForTimeout(300);
      }

      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      await page.click('button[type="submit"]:has-text("Entrar na Minha Loja")');

      // Espera carregar o painel
      await page.waitForSelector('text=Gestão •', { timeout: 15000 });
      console.log(`   ✅ Login efetuado com sucesso para ${testEmail}!`);

      // Valida truncamento do Header
      await checkNoHorizontalOverflow(page, `${vp.name} - Header do Painel`);

      // =====================================================================
      // 2. AUDITORIA DO EMPTY STATE NAS 5 ABAS DO /admin
      // =====================================================================
      console.log(`\n🔹 [${vp.name}] 2. Auditando Empty States nas 5 Abas do /admin...`);

      // Aba 1: Meus Produtos
      const emptyProductText = await page.textContent('body');
      if (emptyProductText.includes('Sua loja ainda não tem produtos cadastrados')) {
        console.log(`   ✅ Empty State correto em 'Meus Produtos'`);
      } else {
        console.warn(`   ⚠️ Atenção: Texto de empty state de produtos não detectado de imediato.`);
      }
      await checkNoHorizontalOverflow(page, `${vp.name} - Aba Meus Produtos (Empty State)`);

      // Aba 2: Disparador VIP
      const tabVip = page.getByRole('tab', { name: /Disparador VIP/i });
      if (await tabVip.isVisible()) {
        await tabVip.click();
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, `${vp.name} - Aba Disparador VIP (Empty State)`);
      }

      // Aba 3: Minha Loja
      const tabLoja = page.getByRole('tab', { name: /Minha Loja/i });
      if (await tabLoja.isVisible()) {
        await tabLoja.click();
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, `${vp.name} - Aba Minha Loja`);
      }

      // Aba 4: Minha Assinatura
      const tabAssinatura = page.getByRole('tab', { name: /Minha Assinatura/i });
      if (await tabAssinatura.isVisible()) {
        await tabAssinatura.click();
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, `${vp.name} - Aba Minha Assinatura`);
      }

      // Aba 5: Guia de Uso
      const tabGuia = page.getByRole('tab', { name: /Guia de Uso/i });
      if (await tabGuia.isVisible()) {
        await tabGuia.click();
        await page.waitForTimeout(600);
        await checkNoHorizontalOverflow(page, `${vp.name} - Aba Guia de Uso`);
      }

      // =====================================================================
      // 3. AUDITORIA DA VITRINE PÚBLICA EM EMPTY STATE (/loja/:slug)
      // =====================================================================
      console.log(`\n🔹 [${vp.name}] 3. Auditando Vitrine Pública Nova (/loja/${testSlug}) em Empty State...`);
      await page.goto(`${BASE_URL}/loja/${testSlug}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);

      const vitrineEmptyText = await page.textContent('body');
      if (
        vitrineEmptyText.includes('Vitrine em Preparação') ||
        vitrineEmptyText.includes('ainda não possui ofertas')
      ) {
        console.log(`   ✅ Vitrine Nova exibe Empty State elegante e convite para cadastrar.`);
      }
      await checkNoHorizontalOverflow(page, `${vp.name} - Vitrine Nova (Empty State)`);

      await context.close();
    }

    // =======================================================================
    // 4. CADASTRO DO 1º PRODUTO REAL & TESTE DE TRACKING ISOLADO
    // =======================================================================
    console.log(`\n============================================================`);
    console.log(`📦 CADASTRANDO 1º PRODUTO PARA ${testSlug}...`);
    console.log(`============================================================`);

    const testProductId = `prod-factory-${timestamp}`;
    const rawMlUrl =
      'https://www.mercadolivre.com.br/garrafa-termica-em-inox-com-termometro-digital-500ml/p/MLB28509893';
    const testProductRecord = {
      id: testProductId,
      titulo: 'Garrafa Térmica Em Inox Com Termômetro Digital 500ml',
      descricao: 'Garrafa térmica com display digital de LED e vedação anti-vazamento.',
      preco_atual: 49.9,
      preco_original: 89.9,
      desconto_percentual: 44,
      link_afiliado: rawMlUrl,
      imagem_url:
        'https://http2.mlstatic.com/D_NQ_NP_2X_792015-MLA100412384724_122025-F.webp',
      categoria: 'Casa',
      marketplace: 'mercadolivre',
      em_destaque: true,
      loja_slug: testSlug,
      criado_em: new Date().toISOString(),
    };

    const { error: prodInsertError } = await supabaseAdmin
      .from('produtos_clarice')
      .insert(testProductRecord);

    if (prodInsertError) {
      console.error('❌ Falha ao inserir produto de teste:', prodInsertError);
      process.exit(1);
    }
    console.log(`   ✅ Produto de teste publicado com sucesso!`);

    // =======================================================================
    // 5. VALIDAÇÃO NA VITRINE PÚBLICA: ISOLAMENTO TOTAL DE AFILIADO
    // =======================================================================
    console.log(`\n============================================================`);
    console.log(`🔍 VALIDANDO TRACKING ISOLADO NA VITRINE /loja/${testSlug}`);
    console.log(`============================================================`);

    const auditContext = await browser.newContext({
      viewport: { width: 360, height: 800 },
      userAgent:
        'Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    });
    const auditPage = await auditContext.newPage();

    await auditPage.goto(`${BASE_URL}/loja/${testSlug}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await auditPage.waitForTimeout(1500);

    // Valida sem overflow com produto na tela
    await checkNoHorizontalOverflow(auditPage, 'Vitrine com Produto Ativo');

    // Inspeciona os links de afiliado gerados na vitrine
    const affiliateLinks = await auditPage.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="mercadolivre.com"]'));
      return anchors.map((a) => a.href);
    });

    console.log(`   Links encontrados na vitrine: ${affiliateLinks.length}`);
    if (affiliateLinks.length === 0) {
      throw new Error('Nenhum link de afiliado encontrado na vitrine para o produto cadastrado.');
    }

    const testLink = affiliateLinks[0];
    console.log(`   Inspecionando link gerado: ${testLink}`);

    // Verifica se possui as tags exclusivas do tenant
    const hasTenantTag = testLink.includes(`matt_word=${testMlTag}`);
    const hasTenantTool = testLink.includes(`matt_tool=${testMlTool}`);

    // Verifica se NÃO vazou tags de outros lojistas ou da Clarice
    const leakedTatiane = testLink.includes('tatianemirianbernardoconcei') || testLink.includes('51555285');
    const leakedClarice = testLink.includes('18364201389') || testLink.includes('clarice');

    if (!hasTenantTag || !hasTenantTool) {
      throw new Error(
        `[TRACKING ISOLATION FALHOU]: Link não contém matt_word=${testMlTag} ou matt_tool=${testMlTool}. Link: ${testLink}`
      );
    }

    if (leakedTatiane || leakedClarice) {
      throw new Error(
        `[VAZAMENTO DE COMISSÃO DETECTADO]: Link contém tags de terceiros! Link: ${testLink}`
      );
    }

    console.log(`   ✅ ISOLAMENTO ABSOLUTO CONFIRMADO:`);
    console.log(`      - matt_word=${testMlTag}: OK`);
    console.log(`      - matt_tool=${testMlTool}: OK`);
    console.log(`      - Zero vazamento de Clarice ou Tatiane: OK`);

    await auditContext.close();

    console.log(`\n============================================================`);
    console.log(`🎉 AUDITORIA MULTI-TENANT CONCLUÍDA COM 100% DE SUCESSO!`);
    console.log(`============================================================\n`);
  } finally {
    await browser.close();

    // =======================================================================
    // 6. LIMPEZA AUTOMÁTICA DOS DADOS DE ESTRESSE
    // =======================================================================
    console.log(`🧹 Realizando limpeza automática dos dados temporários no Supabase...`);
    const { error: delProdErr } = await supabaseAdmin
      .from('produtos_clarice')
      .delete()
      .eq('loja_slug', testSlug);
    if (!delProdErr) {
      console.log(`   ✅ Produto de teste excluído de produtos_clarice`);
    }

    const { error: delStoreErr } = await supabaseAdmin
      .from('lojas_afiliados')
      .delete()
      .eq('slug', testSlug);
    if (!delStoreErr) {
      console.log(`   ✅ Loja de teste excluída de lojas_afiliados`);
    }
  }
}

main().catch((err) => {
  console.error('\n❌ ERRO FATAL NA AUDITORIA MULTI-TENANT:', err);
  process.exit(1);
});
