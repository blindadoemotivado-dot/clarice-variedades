import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { runRadarCrawler } from './radar-ofertas.mjs';

// 1. Carrega variáveis de ambiente
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

async function convertLinksInLinkBuilder(page, urlsToConvert) {
  const LINKBUILDER_URL = 'https://www.mercadolivre.com.br/afiliados/linkbuilder';
  console.log(`🔗 Acessando Gerador de Links: ${LINKBUILDER_URL}`);

  await page.goto(LINKBUILDER_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(3000);

  // Verificar se precisa de login na conta de afiliado
  const currentUrl = page.url();
  if (currentUrl.includes('login') || currentUrl.includes('identification') || currentUrl.includes('auth')) {
    console.log('\n=============================================================');
    console.log(`🔑 LOGIN NO MERCADO LIVRE AFILIADOS (${AFFILIATE_TAG})`);
    console.log('=============================================================');
    console.log('👉 Por favor, conclua o login na sua conta de Afiliado na janela do Microsoft Edge.');
    console.log('👉 Sua sessão ficará salva permanentemente em .edge-ml-profile.');
    console.log('👉 Após concluir o login e estar no Gerador de Links, pressione [ENTER] aqui no terminal...');
    await askQuestion('> ');
    await page.waitForTimeout(2000);
  }

  console.log(`📝 Inserindo ${urlsToConvert.length} link(s) no formulário do Link Builder...`);
  const batchText = urlsToConvert.join('\n');

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
      console.log('✓ Links colados no formulário com sucesso!');
      await page.waitForTimeout(1000);

      // Preencher tag personalizada se houver campo
      const tagInput = page.locator('input[name*="tag"], input[placeholder*="tag"], input[name*="subid"]').first();
      if ((await tagInput.count()) > 0 && (await tagInput.isVisible())) {
        await tagInput.fill(AFFILIATE_TAG);
      }

      // Clicar em Gerar link
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
    } catch (err) {
      console.warn('⚠️ Aviso ao interagir com campos do Link Builder:', err.message);
    }
  }

  console.log('⏳ Aguardando renderização dos links curtos oficiais na página...');
  await page.waitForTimeout(4000);

  // Extrair links curtos gerados
  let extracted = await page.evaluate(() => {
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

  // Se não extraiu automaticamente, dar oportunidade de confirmar ou colar no terminal
  if (extracted.length === 0) {
    console.log('\n💡 Clique em "Gerar" na janela do Edge caso ainda não tenha sido gerado.');
    await askQuestion('Pressione [ENTER] quando os links curtos (meli.la / mercadolivre.com/sec) estiverem na tela...');

    extracted = await page.evaluate(() => {
      const regex = /(https?:\/\/(?:meli\.la|mercadolivre\.com\/sec)\/[a-zA-Z0-9_-]+)/g;
      const text = document.body.innerText || '';
      const matches = text.match(regex) || [];
      const hrefs = Array.from(document.querySelectorAll('a[href]'))
        .map((a) => a.getAttribute('href'))
        .filter((h) => h && (h.includes('meli.la') || h.includes('mercadolivre.com/sec')));
      return Array.from(new Set([...matches, ...hrefs]));
    });

    if (extracted.length === 0) {
      console.log('👉 Se você copiou os links curtos do Mercado Livre, cole-os aqui abaixo (separados por espaço ou quebra de linha):');
      const pasted = await askQuestion('> ');
      if (pasted.trim()) {
        extracted = pasted
          .split(/[\s\n]+/)
          .map((s) => s.trim())
          .filter((s) => s.includes('mercadolivre.com') || s.includes('meli.la'));
      }
    }
  }

  return extracted;
}

async function main() {
  console.log('\n=============================================================');
  console.log('🚀 [Clarice Achadinhos] Automação Completa via Microsoft Edge');
  console.log(`🏷️ Conta Afiliado: ${AFFILIATE_TAG}`);
  console.log('=============================================================\n');

  // Inicializar Edge com perfil persistente
  const USER_DATA_DIR = path.resolve(process.cwd(), '.edge-ml-profile');
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: 'msedge',
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || (await context.newPage());

  // --------------------------------------------------------------------------
  // ROTINA 1: Verificação e Encurtamento do Link Geral de Afiliado (Home ML)
  // --------------------------------------------------------------------------
  console.log('🔍 [ROTINA 1/3] Verificando Link Geral de Afiliado (Botão Amarelo)...');
  const { data: storeSettingsRow } = await supabase
    .from('store_settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();

  const currentGeneral = storeSettingsRow?.general_affiliate_url || '';
  const isGeneralShort =
    currentGeneral.includes('mercadolivre.com/sec/') ||
    currentGeneral.includes('meli.la/');

  if (!isGeneralShort) {
    console.log('⚠️ Link Geral ainda não é um link curto oficial. Convertendo "https://www.mercadolivre.com.br/ofertas"...');
    try {
      const generated = await convertLinksInLinkBuilder(page, [
        'https://www.mercadolivre.com.br/ofertas',
      ]);
      const shortUrl = generated[0];

      if (shortUrl) {
        await supabase
          .from('store_settings')
          .update({
            general_affiliate_url: shortUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', 'default');
        console.log(`🎉 Link Geral encurtado e salvo no Supabase com sucesso: ${shortUrl}`);
      } else {
        console.log('ℹ️ Mantido link geral com tag de afiliado padrão.');
      }
    } catch (err) {
      console.warn('⚠️ Aviso na conversão do link geral:', err.message);
    }
  } else {
    console.log(`✅ Link Geral de Afiliado já configurado com link curto oficial: ${currentGeneral}`);
  }

  // --------------------------------------------------------------------------
  // ROTINA 2: Garimpo Misto no Edge (Infantil & Bebês + Achadinhos Gerais)
  // --------------------------------------------------------------------------
  console.log('\n📡 [ROTINA 2/3] Executando garimpo misto de ofertas reais no Mercado Livre...');
  // Fecha contexto temporário para rodar o crawler ou reutiliza
  await context.close().catch(() => {});

  try {
    await runRadarCrawler({ minDiscount: 15, tag: AFFILIATE_TAG, targetCount: 36 });
  } catch (err) {
    console.warn('⚠️ Aviso no garimpo:', err.message);
  }

  // --------------------------------------------------------------------------
  // ROTINA 3: Monetização em Lote de Itens Pendentes no Link Builder
  // --------------------------------------------------------------------------
  console.log('\n📋 [ROTINA 3/3] Buscando achadinhos pendentes de monetização no Supabase...');
  const { data: pending, error: fetchErr } = await supabase
    .from('produtos_clarice')
    .select('id, mlb_id, title, category, discount_percent, affiliate_url')
    .eq('status', 'pendente_afiliado')
    .order('created_at', { ascending: false });

  if (fetchErr) {
    console.error('❌ Erro ao buscar produtos pendentes:', fetchErr.message);
    process.exit(1);
  }

  if (!pending || pending.length === 0) {
    console.log('✅ Nenhum produto pendente no Radar. Todos os achadinhos estão ativos e monetizados!');
    return;
  }

  console.log(`🎯 Encontradas ${pending.length} oferta(s) na fila do Radar aguardando link oficial.`);

  // Reabrir contexto persistente do Edge para converter a fila
  const convertContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    channel: 'msedge',
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const convertPage = convertContext.pages()[0] || (await convertContext.newPage());

  const productUrls = pending.map((p) => `https://produto.mercadolivre.com.br/${p.mlb_id}`);

  const shortLinks = await convertLinksInLinkBuilder(convertPage, productUrls);
  console.log(`\n🔎 Total de links curtos obtidos: ${shortLinks.length}`);

  console.log('💾 Atualizando produtos no Supabase para status "ativo" e monetizado...');
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

  await convertContext.close().catch(() => {});
}

main().catch((err) => {
  console.error('❌ Erro fatal no robô autônomo:', err);
  process.exit(1);
});
