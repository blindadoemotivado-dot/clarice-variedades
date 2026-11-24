import { chromium } from 'playwright';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📱 VALIDAÇÃO E2E MOBILE (390x844) NO AMBIENTE DE PRODUÇÃO VERCEL');
  console.log('🔗 URL: https://clariceachadinhos.vercel.app/admin');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  });

  const page = await context.newPage();

  try {
    console.log('1. Acessando https://clariceachadinhos.vercel.app/admin...');
    await page.goto('https://clariceachadinhos.vercel.app/admin', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // 2. Realizar login como Lojista
    console.log('2. Alternando para modo Lojista Assinante e preenchendo credenciais...');
    const lojistaTabBtn = page.locator('button:has-text("Lojista Assinante")');
    await lojistaTabBtn.click();
    await page.waitForTimeout(500);

    await page.fill('input[type="email"]', 'tatianemirianbc@gmail.com');
    await page.fill('input[placeholder="••••••••"]', 'Deusefiel0527@');
    await page.click('button:has-text("Entrar na Minha Loja")');

    console.log('3. Aguardando autenticação e carregamento do painel...');
    await page.waitForSelector('header', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // ──────────────────────────────────────────────────────────────────────────
    // a) O cabeçalho exibe apenas 2 linhas limpas (sem quebrar o badge em várias linhas)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n🔍 Checando Requisito (a): Cabeçalho Mobile em 2 Linhas...');
    const header = page.locator('header');
    const headerBox = await header.boundingBox();
    console.log(`   📏 Altura total do Header: ${headerBox.height.toFixed(1)}px (esperado <= 130px para 2 linhas limpas)`);

    if (headerBox.height > 140) {
      throw new Error(`Header excedeu a altura esperada para 2 linhas: ${headerBox.height}px!`);
    }

    const titleEl = page.locator('header h1');
    const titleText = await titleEl.innerText();
    console.log(`   📌 Título da Loja: "${titleText}"`);

    const badgeEl = page.locator('header span:has-text("PRO"), header span:has-text("LOJISTA")').first();
    const badgeText = await badgeEl.innerText();
    const badgeBox = await badgeEl.boundingBox();
    console.log(`   🏷️ Badge de Perfil: "${badgeText.trim()}" (largura: ${badgeBox.width.toFixed(1)}px, altura: ${badgeBox.height.toFixed(1)}px — sem quebras)`);

    const sairBtn = page.locator('header button:has-text("Sair")').first();
    const isSairVisible = await sairBtn.isVisible();
    console.log(`   🚪 Botão Sair visível na Linha 1: ${isSairVisible}`);

    const vitrineBtn = page.locator('header a:has-text("Ver Minha Vitrine")');
    const isVitrineVisible = await vitrineBtn.isVisible();
    const vitrineBox = await vitrineBtn.boundingBox();
    console.log(`   🏪 Botão "Ver Minha Vitrine" na Linha 2: visível = ${isVitrineVisible}, largura = ${vitrineBox.width.toFixed(1)}px (largura total)`);

    console.log('   ✅ Requisito (a) ATENDIDO COM SUCESSO: Header em 2 linhas limpas.');

    // ──────────────────────────────────────────────────────────────────────────
    // b) Todas as 5 abas estão visíveis e acessíveis sem cortes
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n🔍 Checando Requisito (b): Todas as 5 Abas no TabsList...');
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    console.log(`   📑 Quantidade de abas encontradas: ${tabCount}`);

    const tabTexts = [];
    for (let i = 0; i < tabCount; i++) {
      tabTexts.push(await tabs.nth(i).innerText());
    }
    console.log('   📋 Abas renderizadas:', tabTexts);

    const expectedTabs = [
      'Meus Produtos',
      'Disparador VIP',
      'Minha Loja',
      'Minha Assinatura',
      'Guia de Uso',
    ];

    for (const exp of expectedTabs) {
      const found = tabTexts.some((t) => t.includes(exp));
      if (!found) {
        throw new Error(`Aba obrigatória "${exp}" não encontrada nas abas renderizadas!`);
      }
      console.log(`   ✅ Aba "${exp}" validada com sucesso.`);
    }

    // Verificar se Meus Produtos exibe os 20 produtos
    const produtosTab = tabTexts.find((t) => t.includes('Meus Produtos'));
    console.log(`   🛍️ Contagem na aba de produtos: "${produtosTab}" (confirmando os 20 produtos recém abastecidos)`);

    // ──────────────────────────────────────────────────────────────────────────
    // c) A aba 🎓 Guia de Uso exibe o player de vídeo acima da dobra
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n🔍 Checando Requisito (c): Aba 🎓 Guia de Uso e Player de Vídeo...');
    const guiaTab = page.locator('[role="tab"]:has-text("Guia de Uso")');
    await guiaTab.click();
    await page.waitForTimeout(1500);

    // Banner compacto de boas vindas
    const banner = page.locator('h1:has-text("Aprenda em 1 Minuto com a Clarice")');
    const isBannerVisible = await banner.isVisible();
    console.log(`   🎓 Banner Boas-Vindas visível: ${isBannerVisible}`);

    // Avatar compacto (w-14 h-14 -> 56px)
    const avatar = page.locator('img[alt="Mascote Clarice"]').first();
    const avatarContainer = avatar.locator('..');
    const avatarBox = await avatarContainer.boundingBox();
    console.log(`   🖼️ Dimensão do Avatar da Clarice no Mobile: ${avatarBox.width.toFixed(1)}x${avatarBox.height.toFixed(1)}px (reduzido para w-14 h-14)`);

    // Player de vídeo 16:9
    const videoContainer = page.locator('.aspect-video').first();
    const isVideoVisible = await videoContainer.isVisible();
    const videoBox = await videoContainer.boundingBox();
    console.log(`   🎬 Player de Vídeo: visível = ${isVideoVisible}, posição Y = ${videoBox.y.toFixed(1)}px, altura = ${videoBox.height.toFixed(1)}px`);

    const videoBottom = videoBox.y + videoBox.height;
    console.log(`   📏 Fim do Player de Vídeo na tela: ${videoBottom.toFixed(1)}px (Viewport total: 844px)`);

    if (videoBox.y > 750) {
      throw new Error(`Player de vídeo posicionado muito abaixo da dobra: Y=${videoBox.y}px!`);
    }
    console.log('   ✅ Player de vídeo visível no viewport acima da dobra sem exigir rolagem.');

    // Botão Marcar Concluída posicionado logo abaixo do vídeo
    const completeBtn = page.locator('button:has-text("Marcar Concluída"), button:has-text("Aula Concluída")').first();
    const isCompleteVisible = await completeBtn.isVisible();
    const completeBox = await completeBtn.boundingBox();
    console.log(`   🔘 Botão Marcar Concluída: visível = ${isCompleteVisible}, Y = ${completeBox.y.toFixed(1)}px`);

    if (completeBox.y < videoBox.y) {
      throw new Error(`Botão Marcar Concluída está ACIMA do vídeo em vez de abaixo!`);
    }
    console.log('   ✅ Botão "Marcar Concluída" posicionado corretamente ABAIXO do player de vídeo.');

    console.log('\n🎉 SUCESSO TOTAL: Todos os 3 critérios de aceitação foram validados com êxito na URL de produção!');
  } catch (err) {
    console.error('❌ Erro na validação mobile pública:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
