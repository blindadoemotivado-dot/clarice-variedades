/**
 * Script Idempotente: Gravação Permanente de Credenciais de Afiliado (Mercado Livre + Shopee)
 * Loja: Entre amigas promos (slug: entre-amigas-promos)
 * Titular: Tatiane Mirian Bernardo Conceição
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🔗 ATUALIZAÇÃO DE CREDENCIAIS PERMANENTES DE AFILIADO');
  console.log('🏬 Loja: Entre amigas promos (slug: entre-amigas-promos)');
  console.log('🏷️ ML Tag: tatianemirianbernardoconcei');
  console.log('🛒 Shopee ID: 18318420060');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // 1. Tenta atualizar com as novas colunas
  const payloadCompleto = {
    ml_affiliate_tag: 'tatianemirianbernardoconcei',
    shopee_affiliate_id: '18318420060',
    shopee_app_id: '18318420060',
  };

  const { data, error } = await supabase
    .from('lojas_afiliados')
    .update(payloadCompleto)
    .eq('slug', 'entre-amigas-promos')
    .select()
    .single();

  if (!error && data) {
    console.log('✅ Credenciais salvas com sucesso no Supabase (colunas dedicadas):');
    console.log(`   - Loja: ${data.nome_loja} (${data.slug})`);
    console.log(`   - ml_affiliate_tag: ${data.ml_affiliate_tag}`);
    console.log(`   - shopee_affiliate_id: ${data.shopee_affiliate_id}`);
    console.log(`   - shopee_app_id: ${data.shopee_app_id}`);
    return;
  }

  // 2. Se as colunas dedicadas ainda não existirem no schema do Supabase,
  // atualiza o shopee_app_id (existente) e informa sobre a migração SQL.
  if (error && error.message?.includes('schema cache')) {
    console.warn('⚠️ Colunas ml_affiliate_tag ou shopee_affiliate_id ainda não adicionadas no banco.');
    console.log('💾 Salvando no campo existente shopee_app_id...');

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('lojas_afiliados')
      .update({ shopee_app_id: '18318420060' })
      .eq('slug', 'entre-amigas-promos')
      .select()
      .single();

    if (fallbackError) {
      console.error('❌ Falha ao atualizar loja:', fallbackError.message);
      process.exit(1);
    }

    console.log('✅ Shopee ID salvo no campo shopee_app_id com sucesso!');
    console.log('ℹ️ Para ativar as colunas dedicadas no Supabase, execute a migração:');
    console.log('   supabase/migrations/202611240002_affiliate_ids_loja.sql');
    return;
  }

  if (error) {
    console.error('❌ Erro inesperado ao atualizar credenciais:', error.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
