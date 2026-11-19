import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Supabase URL ou Service Key não configurados');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

export function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(oferta|ofertas|promocao|promocoes|original|novo|nova|super|barato|imperdivel|frete|gratis|lancamento|top)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;
  if (str1.length < 2 || str2.length < 2) return 0.0;

  const tokens1 = new Set(str1.split(' ').filter(Boolean));
  const tokens2 = new Set(str2.split(' ').filter(Boolean));
  let tokenIntersection = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) tokenIntersection++;
  }
  const totalTokens = tokens1.size + tokens2.size;
  const tokenSimilarity = totalTokens > 0 ? (2 * tokenIntersection) / totalTokens : 0;

  const bigrams1 = new Map();
  for (let i = 0; i < str1.length - 1; i++) {
    const bigram = str1.slice(i, i + 2);
    bigrams1.set(bigram, (bigrams1.get(bigram) || 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < str2.length - 1; i++) {
    const bigram = str2.slice(i, i + 2);
    const count = bigrams1.get(bigram) || 0;
    if (count > 0) {
      bigrams1.set(bigram, count - 1);
      intersection++;
    }
  }

  const totalBigrams = str1.length - 1 + (str2.length - 1);
  const bigramSimilarity = totalBigrams > 0 ? (2 * intersection) / totalBigrams : 0;

  return Math.max(bigramSimilarity, tokenSimilarity);
}

async function run() {
  console.log('=============================================================');
  console.log('🧹 [Clarice Achadinhos] Deduplicação e Reativação de Ativos');
  console.log('=============================================================');

  const { data: allProducts, error } = await supabase
    .from('produtos_clarice')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar produtos:', error.message);
    process.exit(1);
  }

  console.log(`📊 Total de produtos na tabela: ${allProducts.length}`);

  // Analisa duplicatas em allProducts
  // Agrupamento por título normalizado e similaridade >= 85%
  const groups = [];
  const visited = new Set();

  for (let i = 0; i < allProducts.length; i++) {
    if (visited.has(allProducts[i].id)) continue;

    const group = [allProducts[i]];
    visited.add(allProducts[i].id);
    const normA = normalizeTitle(allProducts[i].title);

    for (let j = i + 1; j < allProducts.length; j++) {
      if (visited.has(allProducts[j].id)) continue;
      const normB = normalizeTitle(allProducts[j].title);

      const sim = calculateSimilarity(normA, normB);
      if (normA === normB || sim >= 0.85) {
        group.push(allProducts[j]);
        visited.add(allProducts[j].id);
      }
    }

    if (group.length > 1) {
      groups.push(group);
    }
  }

  console.log(`🔍 Grupos de duplicatas identificados: ${groups.length}`);

  const toDelete = [];
  const toKeep = [];

  for (const group of groups) {
    // Ordena do menor preço para o maior
    group.sort((a, b) => Number(a.current_price) - Number(b.current_price));
    const keep = group[0];
    const duplicates = group.slice(1);

    toKeep.push(keep);
    for (const dup of duplicates) {
      toDelete.push({
        dup,
        cheaper: keep,
      });
    }
  }

  console.log(`\n📋 Duplicados a serem excluídos (${toDelete.length} itens mais caros):`);
  for (const item of toDelete) {
    console.log(
      `  ❌ Excluir: [${item.dup.mlb_id}] R$ ${item.dup.current_price} - "${item.dup.title.slice(0, 45)}"`
    );
    console.log(
      `     ✅ Manter mais barato: [${item.cheaper.mlb_id}] R$ ${item.cheaper.current_price} - "${item.cheaper.title.slice(0, 45)}"`
    );
  }

  if (toDelete.length > 0) {
    const idsToDelete = toDelete.map((x) => x.dup.id);
    const { error: delErr } = await supabase
      .from('produtos_clarice')
      .delete()
      .in('id', idsToDelete);

    if (delErr) {
      console.error('❌ Erro ao deletar duplicatas:', delErr.message);
      process.exit(1);
    }
    console.log(`\n✅ Sucesso: ${idsToDelete.length} registros duplicados foram deletados do Supabase!`);
  }

  // Agora reativamos todos os produtos válidos restantes que possuem link curto e desconto
  const { data: remaining, error: remErr } = await supabase
    .from('produtos_clarice')
    .select('*')
    .order('created_at', { ascending: false });

  if (remErr) {
    console.error('❌ Erro ao buscar produtos restantes:', remErr.message);
    process.exit(1);
  }

  console.log(`\n🔄 Total de produtos restantes após remoção de duplicatas: ${remaining.length}`);

  const idsToReactivate = remaining
    .filter((p) => p.affiliate_url && p.affiliate_url.includes('meli.la') && p.discount_percent >= 10)
    .map((p) => p.id);

  console.log(`✨ Produtos válidos a reativar: ${idsToReactivate.length}`);

  if (idsToReactivate.length > 0) {
    const { error: reactivateErr } = await supabase
      .from('produtos_clarice')
      .update({
        status: 'ativo',
        active: true,
      })
      .in('id', idsToReactivate);

    if (reactivateErr) {
      console.error('❌ Erro ao reativar produtos:', reactivateErr.message);
      process.exit(1);
    }
    console.log(`✅ Sucesso: ${idsToReactivate.length} produtos foram definidos como ATIVOS e VISÍVEIS na vitrine!`);
  }

  // Raio-X Final
  const { data: finalActive, error: finalErr } = await supabase
    .from('produtos_clarice')
    .select('id, category, status, active')
    .eq('status', 'ativo')
    .eq('active', true);

  if (!finalErr) {
    console.log('\n📊 Contagem final de produtos ATIVOS por categoria:');
    const catCount = {};
    for (const p of finalActive) {
      catCount[p.category] = (catCount[p.category] || 0) + 1;
    }
    console.table(catCount);
    console.log(`🏁 Total de produtos ativos na vitrine: ${finalActive.length}`);
  }
}

run().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
