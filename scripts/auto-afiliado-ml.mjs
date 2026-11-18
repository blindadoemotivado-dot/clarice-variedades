import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { runRadarCrawler } from './radar-ofertas.mjs';

// 1. Carregar variáveis de ambiente de .env.local
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
const AFFILIATE_TAG =
  process.env.ML_AFFILIATE_TAG || 'kd20250113073553';

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
  console.log('🤖 [Clarice Achadinhos] Robô Autônomo com Microsoft Edge');
  console.log('=============================================================\n');

  // ETAPA 1: Executar Garimpo Real de Ofertas via Edge
  console.log('📡 [ETAPA 1/3] Executando garimpo de ofertas reais no Mercado Livre...');
  try {
    await runRadarCrawler({ minDiscount: 15, tag: AFFILIATE_TAG });
  } catch (err) {
    console.warn('⚠️ Aviso na execução do garimpo:', err.message);
  }

  // ETAPA 2: Obter achadinhos pendentes de monetização no Supabase
  console.log('\n📋 [ETAPA 2/3] Consultando ofertas pendentes no Supabase...');
  const { data: pending, error: fetchErr } = await supabase
    .from('produtos_clarice')
    .select('id, mlb_id, title, discount_percent, affiliate_url')
    .eq('status', 'pendente_afiliado')
    .order('created_at', { ascending: false });

  if (fetchErr) {
    console.error('❌ Erro ao buscar produtos pendentes:', fetchErr.message);
    process.exit(1);
  }

  if (!pending || pending.length === 0) {
    console.log('✅ Nenhuma oferta pendente no Radar. Todos os achadinhos estão monetizados e ativos!');
    return;
  }

  console.log(`🎯 Encontradas ${pending.length} oferta(s) na fila do Radar aguardando link oficial.`);

  // Preparar os links diretos dos produtos
  const productLinks = pending.map((p) => `https://produto.mercadolivre.com.br/${p.mlb_id}`);

  // ETAPA 3: Automação no Gerador de Links com Microsoft Edge e Perfil Persistente
  console.log('\n🌐 [ETAPA 3/3] Abrindo Microsoft Edge com perfil persistente (.edge-ml-profile)...');
  const USER_DATA_DIR = path.resolve(process.cwd(), '.edge-ml-profile');

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: 'msedge',
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || (await context.newPage());

  const LINKBUILDER_URL = 'https://www.mercadolivre.com.br/afiliados/linkbuilder';
  console.log(`🔗 Acessando Gerador de Links oficial: ${LINKBUILDER_URL}`);

  await page.goto(LINKBUILDER_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(3000);

  // Verificar se precisa de login na conta de afiliado
  const currentUrl = page.url();
  if (currentUrl.includes('login') || currentUrl.includes('identification') || currentUrl.includes('auth')) {
    console.log('\n=============================================================');
    console.log(`🔑 LOGIN NO MERCADO LIVRE AFILIADOS (${AFFILIATE_TAG})`);
    console.log('=============================================================');
    console.log('👉 Por favor, faça login na sua conta de Afiliado na janela do Microsoft Edge que se abriu.');
    console.log('👉 Sua sessão ficará salva permanentemente em .edge-ml-profile.');
    console.log('👉 Após concluir o login e estar no Gerador de Links, pressione [ENTER] para continuar...');
    await askQuestion('> ');
  }

  await page.waitForTimeout(2000);

  console.log(`\n📝 Preenchendo ${productLinks.length} links no Gerador de Links...`);
  const batchText = productLinks.join('\n');

  // Preencher no formulário do Link Builder
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

  if (inputField) {
    try {
      await inputField.fill(batchText);
      console.log('✓ Links inseridos com sucesso no formulário!');
      await page.waitForTimeout(1000);

      // Tentar preencher tag de afiliado se houver campo específico
      const tagInput = page.locator('input[name*="tag"], input[placeholder*="tag"], input[name*="subid"]').first();
      if ((await tagInput.count()) > 0 && (await tagInput.isVisible())) {
        await tagInput.fill(AFFILIATE_TAG);
        console.log(`✓ Tag de afiliado ${AFFILIATE_TAG} preenchida.`);
      }

      // Clicar no botão Gerar Links
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
      console.warn('⚠️ Aviso ao preencher formulário:', fillErr.message);
    }
  }

  console.log('\n-------------------------------------------------------------');
  console.log('💡 EXTRAÇÃO DE LINKS CURTOS:');
  console.log('O robô vai escanear a tela em busca dos links curtos oficiais (meli.la / mercadolivre.com/sec).');
  console.log('Se necessário, clique no botão "Gerar" na janela do Microsoft Edge.');
  await askQuestion('Pressione [ENTER] quando os links curtos gerados estiverem na tela...');

  // Extrair links curtos oficiais (meli.la ou mercadolivre.com/sec)
  const extractedLinks = await page.evaluate(() => {
    const regex = /(https?:\/\/(?:meli\.la|mercadolivre\.com\/sec)\/[a-zA-Z0-9_-]+)/g;
    const text = document.body.innerText || '';
    const matches = text.match(regex) || [];

    const hrefs = Array.from(document.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href'))
      .filter((h) => h && (h.includes('meli.la') || h.includes('mercadolivre.com/sec')));

    const inputs = Array.from(document.querySelectorAll('input, textarea'))
      .map((i) => i.value)
      .filter((v) => v && (v.includes('meli.la') || v.includes('mercadolivre.com/sec')));

    return Array.from(new Set([...matches, ...hrefs, ...inputs]));
  });

  console.log(`\n🔎 Links curtos identificados: ${extractedLinks.length}`);
  let shortLinks = extractedLinks;

  // Se nenhum link curto for detectado automaticamente, permitir colar no terminal
  if (shortLinks.length === 0) {
    console.log('\n⚠️ Links curtos não detectados automaticamente no DOM.');
    console.log('👉 Se você copiou os links curtos do Mercado Livre, cole-os abaixo (um por linha) ou pressione [ENTER] para aplicar a tag diretamente:');
    const pasted = await askQuestion('> ');
    if (pasted.trim()) {
      shortLinks = pasted
        .split(/[\s\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.includes('mercadolivre.com') || s.includes('meli.la'));
    }
  }

  // Atualizar produtos no Supabase para 'ativo'
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
  console.log('👉 Acesse a vitrine oficial: https://clarice-variedades.vercel.app\n');

  await context.close().catch(() => {});
}

main().catch((err) => {
  console.error('❌ Erro fatal no robô autônomo:', err);
  process.exit(1);
});
