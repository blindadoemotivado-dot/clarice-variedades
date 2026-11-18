import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { runRadarCrawler } from './radar-ofertas.mjs';

// 1. Carregar variáveis de ambiente
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvLocal();

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://tuxvpzeciwxgxhmcrprt.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';
const ML_AFFILIATE_TAG = process.env.ML_AFFILIATE_TAG || 'clarice-achadinhos';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function main() {
  console.log('\n=============================================================');
  console.log('🤖 [Clarice Achadinhos] Robô Autônomo de Garimpo e Monetização');
  console.log('=============================================================\n');

  // ETAPA 1: Executar Radar de Ofertas
  console.log('📡 [ETAPA 1/3] Varrendo ofertas com >= 15% OFF e frete grátis...');
  try {
    await runRadarCrawler({ minDiscount: 15, tag: ML_AFFILIATE_TAG });
  } catch (err) {
    console.warn('⚠️ Aviso na varredura:', err.message);
  }

  // ETAPA 2: Buscar ofertas pendentes no Supabase
  console.log('\n📋 [ETAPA 2/3] Buscando produtos pendentes de monetização no Supabase...');
  const { data: pending, error: fetchErr } = await supabase
    .from('produtos_clarice')
    .select('id, mlb_id, title, discount_percent, affiliate_url')
    .eq('status', 'pendente_afiliado')
    .order('created_at', { ascending: false });

  if (fetchErr) {
    console.error('❌ Erro ao consultar pendentes no banco:', fetchErr.message);
    process.exit(1);
  }

  if (!pending || pending.length === 0) {
    console.log('✅ Nenhuma oferta pendente no Radar. Todos os achadinhos já estão ativos e monetizados!');
    return;
  }

  console.log(`🎯 Encontradas ${pending.length} oferta(s) na fila do Radar aguardando link oficial.`);

  // Preparar os links diretos dos produtos Mercado Livre
  const productLinks = pending.map((p) => `https://produto.mercadolivre.com.br/${p.mlb_id}`);

  // ETAPA 3: Automação Playwright com Perfil Persistente
  console.log('\n🌐 [ETAPA 3/3] Abrindo navegador com perfil persistente do Mercado Livre...');
  const USER_DATA_DIR = path.resolve(process.cwd(), '.ml-profile');

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || (await context.newPage());

  const LINKBUILDER_URL = 'https://www.mercadolivre.com.br/afiliados/linkbuilder';
  console.log(`🔗 Acessando Link Builder Oficial: ${LINKBUILDER_URL}`);

  await page.goto(LINKBUILDER_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});

  // Verificar se precisa de login
  const currentUrl = page.url();
  if (currentUrl.includes('login') || currentUrl.includes('auth')) {
    console.log('\n⚠️  LOGIN NECESSÁRIO:');
    console.log('👉 Por favor, faça login na sua conta de Afiliado do Mercado Livre na janela do navegador que se abriu.');
    console.log('👉 Suas credenciais ficarão salvas com segurança no perfil local para os próximos ciclos.');
    await askQuestion('\nApós concluir o login e estar na tela do Link Builder, pressione [ENTER] para continuar...');
  }

  await page.waitForTimeout(2000);

  console.log(`\n📝 Inserindo ${productLinks.length} links no Link Builder do Mercado Livre...`);

  // Tentar encontrar o campo de texto / textarea do Link Builder
  const selectors = [
    'textarea',
    'input[type="text"]',
    '[data-testid*="link"]',
    '[name*="link"]',
    '[placeholder*="http"]',
  ];

  let inputField = null;
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if ((await el.count()) > 0 && (await el.isVisible())) {
      inputField = el;
      break;
    }
  }

  const batchText = productLinks.join('\n');

  if (inputField) {
    try {
      await inputField.fill(batchText);
      console.log('✓ Links colados no formulário do Link Builder com sucesso!');
      await page.waitForTimeout(1000);

      // Tentar localizar e clicar no botão Gerar Links
      const btnSelectors = [
        'button:has-text("Gerar")',
        'button:has-text("Criar")',
        'button:has-text("Gerar link")',
        'button[type="submit"]',
      ];

      for (const bSel of btnSelectors) {
        const btn = page.locator(bSel).first();
        if ((await btn.count()) > 0 && (await btn.isVisible())) {
          await btn.click();
          console.log('✓ Botão de gerar links acionado.');
          break;
        }
      }
    } catch (fillErr) {
      console.warn('⚠️ Não foi possível preencher automaticamente o campo:', fillErr.message);
    }
  }

  console.log('\n-------------------------------------------------------------');
  console.log('💡 EXTRAÇÃO DE LINKS CURTOS:');
  console.log('O robô vai escanear a página em busca dos links curtos oficiais (meli.la / mercadolivre.com/sec).');
  console.log('Caso necessário, clique em "Gerar" na janela do navegador.');
  await askQuestion('Pressione [ENTER] quando os links curtos estiverem prontos na tela...');

  // Extrair links curtos oficiais gerados na página
  const extractedLinks = await page.evaluate(() => {
    const regex = /(https?:\/\/(?:meli\.la|mercadolivre\.com\/sec)\/[a-zA-Z0-9_-]+)/g;
    const text = document.body.innerText || '';
    const matches = text.match(regex) || [];

    // Também verificar atributos href e inputs/textareas
    const hrefs = Array.from(document.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href'))
      .filter((h) => h && (h.includes('meli.la') || h.includes('mercadolivre.com/sec')));

    const inputs = Array.from(document.querySelectorAll('input, textarea'))
      .map((i) => i.value)
      .filter((v) => v && (v.includes('meli.la') || v.includes('mercadolivre.com/sec')));

    return Array.from(new Set([...matches, ...hrefs, ...inputs]));
  });

  console.log(`\n🔎 Links curtos identificados na página: ${extractedLinks.length}`);

  let shortLinks = extractedLinks;

  // Se nenhum link curto for detectado automaticamente, permitir colar direto no terminal
  if (shortLinks.length === 0) {
    console.log('\n⚠️ Nenhum link meli.la/sec detectado automaticamente na tela.');
    console.log('👉 Se você gerou os links, copie-os e cole abaixo (um por linha) ou pressione [ENTER] para manter os links com tag de afiliado:');
    const pasted = await askQuestion('> ');
    if (pasted.trim()) {
      shortLinks = pasted
        .split(/[\s\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.includes('mercadolivre.com') || s.includes('meli.la'));
    }
  }

  // Atualizar produtos no Supabase
  console.log('\n💾 Atualizando produtos no Supabase para status "ativo" e monetizado...');
  let updatedCount = 0;

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    const finalAffiliateUrl = shortLinks[i] || item.affiliate_url;

    const { error: updErr } = await supabase
      .from('produtos_clarice')
      .update({
        affiliate_url: finalAffiliateUrl,
        active: true,
        status: 'ativo',
      })
      .eq('id', item.id);

    if (!updErr) {
      updatedCount++;
    } else {
      console.warn(`Erro ao atualizar item ${item.mlb_id}:`, updErr.message);
    }
  }

  console.log(`\n🎉 SUCESSO: ${updatedCount} achadinhos aprovados, monetizados e publicados na vitrine!`);
  console.log('👉 Vitrine oficial: https://clarice-variedades.vercel.app\n');

  // Fechar navegador
  await context.close();
}

main().catch((err) => {
  console.error('❌ Erro fatal no robô autônomo:', err);
  process.exit(1);
});
