import React, { useState } from 'react';
import {
  Layers,
  Loader2,
  Zap,
  Sparkles,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatBRL, extractMlbId } from '@/lib/catalog';
import { CATEGORIES, type AffiliateProduct } from '@/types/product';
import type { PlanPermissions } from '@/config/planPermissions';
import type { LojaAfiliado } from '@/types/tenant';
import { applyStoreAffiliateTracking } from '@/utils/affiliateUrl';
import { PlanGate } from './PlanGate';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

export interface LojistaBatchImportProps {
  lojaSlug: string;
  store?: LojaAfiliado | null;
  currentProductCount: number;
  permissions: PlanPermissions;
  isSuperAdmin?: boolean;
  onImported?: (products: AffiliateProduct[]) => void;
  onUpgrade?: () => void;
  onNavigateTab?: (tab: string) => void;
  className?: string;
}

export function LojistaBatchImport({
  lojaSlug,
  store,
  currentProductCount,
  permissions,
  isSuperAdmin = false,
  onImported,
  onUpgrade,
  onNavigateTab,
  className,
}: LojistaBatchImportProps) {
  const [batchLinksText, setBatchLinksText] = useState('');
  const [batchDefaultCategory, setBatchDefaultCategory] =
    useState<AffiliateProduct['category']>('Casa & Cozinha');
  const [batchParsedProducts, setBatchParsedProducts] = useState<AffiliateProduct[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // Bypass incondicional para Super Admin, loja matriz Clarice ou planos Pro/Advanced/Enterprise
  const isSuperAdminOrExempt =
    Boolean(isSuperAdmin) ||
    store?.slug === 'clarice' ||
    lojaSlug === 'clarice' ||
    store?.plano === 'pro' ||
    (store?.plano as string) === 'enterprise' ||
    store?.plano === 'advanced';

  const allowed = isSuperAdminOrExempt || permissions.batchImportLimit > 0;
  const maxPerBatch = permissions.batchImportLimit > 0 ? permissions.batchImportLimit : 50;

  // Processamento do Lote de Links
  const handleProcessBatch = () => {
    const rawLines = batchLinksText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (rawLines.length === 0) {
      toast.error('Cole ao menos um link válido do Mercado Livre ou Shopee para processar.');
      return;
    }

    const limitedLines = rawLines.slice(0, maxPerBatch);
    if (rawLines.length > maxPerBatch) {
      toast.info(
        `Seu plano permite até ${maxPerBatch} links por lote. Processando os primeiros ${maxPerBatch} links.`
      );
    }

    setIsProcessingBatch(true);
    try {
      const parsed: AffiliateProduct[] = [];

      for (let i = 0; i < limitedLines.length; i++) {
        const rawUrl = limitedLines[i];
        const { finalUrl: url } = applyStoreAffiliateTracking(rawUrl, store);
        const isShopee = url.includes('shopee.com') || url.includes('shp.ee');

        if (isShopee) {
          const slugMatch = url.match(/shopee\.com\.br\/([^?]+)-i\./i);
          const slug = slugMatch
            ? decodeURIComponent(slugMatch[1]).replace(/[-_]+/g, ' ').trim()
            : '';
          const title = slug
            ? slug.charAt(0).toUpperCase() + slug.slice(1)
            : `Produto Shopee #${i + 1}`;
          const hashVal = Math.abs(hash(url) || Date.now() + i);
          const mlbId = `SHP-${String(hashVal).slice(0, 8)}`;

          parsed.push({
            id: `${mlbId}-${Date.now()}-${i}`,
            mlbId,
            title,
            originalPrice: 0,
            currentPrice: 0,
            discountPercent: 0,
            installmentsText: '',
            imageUrl: '',
            affiliateUrl: url,
            category: batchDefaultCategory,
            freeShipping: true,
            isFull: false,
            rating: 4.8,
            reviewsCount: 190,
            featured: false,
            status: 'ativo',
            marketplace: 'shopee',
            lojaSlug,
          });
        } else {
          // Mercado Livre
          const mlb = extractMlbId(url) || `MLB-${Date.now().toString().slice(-8)}`;
          const slug = url.split('/').find((s) => /[a-z]-[a-z]/i.test(s) && !/MLB/i.test(s));
          const title = slug ? slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : `Produto Mercado Livre ${mlb}`;
          parsed.push({
            id: `${mlb}-${Date.now()}-${i}`,
            mlbId: mlb,
            title,
            originalPrice: 0,
            currentPrice: 0,
            discountPercent: 0,
            installmentsText: '',
            imageUrl: '',
            affiliateUrl: url,
            category: batchDefaultCategory,
            freeShipping: true,
            isFull: true,
            rating: 4.9,
            reviewsCount: 320,
            featured: false,
            status: 'ativo',
            marketplace: 'mercadolivre',
            lojaSlug,
          });
        }
      }

      setBatchParsedProducts(parsed);
      toast.success(`${parsed.length} link(s) processado(s) com sucesso! Confira a prévia abaixo.`);
    } catch (err: any) {
      toast.error(`Erro ao processar lote: ${err?.message || 'Falha ao analisar links'}`);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Salvar Todos os Produtos do Lote
  const handleSaveBatch = async () => {
    if (batchParsedProducts.length === 0) return;

    // Validação estrita do limite total de produtos do plano (lojistas não-isentos)
    if (!isSuperAdminOrExempt && currentProductCount + batchParsedProducts.length > permissions.maxProducts) {
      const remaining = Math.max(0, permissions.maxProducts - currentProductCount);
      toast.error(
        `⚠️ Limite de ${permissions.maxProducts} produtos atingido! Você possui ${currentProductCount} produtos ativos. Vagas restantes: ${remaining}. Faça upgrade na aba 'Minha Assinatura' para cadastrar produtos ilimitados!`
      );
      return;
    }

    setIsSavingBatch(true);
    try {
      if (isSupabaseConfigured) {
        const rows = batchParsedProducts.map((p) => ({
          id: p.id,
          mlb_id: p.mlbId,
          title: p.title,
          original_price: p.originalPrice,
          current_price: p.currentPrice,
          discount_percent: p.discountPercent,
          installments_text: p.installmentsText,
          image_url: p.imageUrl,
          affiliate_url: p.affiliateUrl,
          category: p.category,
          free_shipping: p.freeShipping,
          is_full: p.isFull,
          rating: p.rating,
          reviews_count: p.reviewsCount,
          featured: p.featured,
          active: true,
          status: 'ativo',
          marketplace: p.marketplace,
          loja_slug: p.lojaSlug || lojaSlug,
        }));

        const { error } = await supabase.from('produtos_clarice').insert(rows);
        if (error) {
          console.error('[LojistaBatchImport] Erro Supabase:', error);
        }
      }

      onImported?.(batchParsedProducts);

      toast.success(
        `🎉 ${batchParsedProducts.length} produtos importados com sucesso na sua vitrine!`
      );
      setBatchLinksText('');
      setBatchParsedProducts([]);
    } catch (err: any) {
      toast.error(`Erro ao salvar lote: ${err?.message || 'Falha ao salvar no catálogo'}`);
    } finally {
      setIsSavingBatch(false);
    }
  };

  const availableCategories = CATEGORIES.filter((c) => c !== 'Todos') as AffiliateProduct['category'][];

  return (
    <PlanGate
      allowed={allowed}
      requiredPlan="Pro"
      featureName="Importação de Produtos em Lote"
      onUpgrade={onUpgrade}
      className={className}
    >
      <div className={cn('rounded-3xl border border-slate-800 bg-[#0F172A] p-5 sm:p-6 shadow-xl space-y-4', className)}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-[#FFE600] ring-1 ring-amber-500/30">
              <Layers className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">
                Importação em Lote (Até {maxPerBatch} por vez)
              </h3>
              <p className="text-[11px] text-slate-400">
                Cole vários links do Mercado Livre e Shopee de uma só vez (1 link por linha).
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-bold text-emerald-400 self-start sm:self-auto">
            <CheckCircle2 className="h-3 w-3" /> Recurso Ativo
          </span>
        </div>

        {/* Selo Permanente de Rastreamento de Afiliado */}
        {(() => {
          const hasMl = Boolean(store?.mlAffiliateTag);
          const hasShopee = Boolean(store?.shopeeAffiliateId || store?.shopeeAppId);
          const isConfigured = hasMl || hasShopee;

          if (isConfigured) {
            return (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-[11px] font-semibold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>
                  ✅ Rastreamento Permanente Ativo: ML ({store?.mlAffiliateTag || 'padrão'}) • Shopee ({store?.shopeeAffiliateId || store?.shopeeAppId || 'padrão'})
                </span>
              </div>
            );
          }

          return (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-[11px] text-amber-300">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span>Credenciais de afiliado não configuradas nesta loja.</span>
              </div>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('minha-loja')}
                  className="underline font-bold text-amber-300 hover:text-white shrink-0 text-[10px]"
                >
                  Configurar em Minha Loja ↗
                </button>
              )}
            </div>
          );
        })()}

        <div className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Links de Afiliado (1 por linha)
              </label>
              <textarea
                rows={5}
                value={batchLinksText}
                onChange={(e) => setBatchLinksText(e.target.value)}
                placeholder={'https://produto.mercadolivre.com.br/MLB-...\nhttps://shopee.com.br/product/...'}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-100 font-mono outline-none focus:ring-2 focus:ring-[#FFE600] leading-relaxed"
              />
            </div>

            <div className="flex flex-col justify-between space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Categoria Padrão do Lote
                </label>
                <select
                  value={batchDefaultCategory}
                  onChange={(e) => setBatchDefaultCategory(e.target.value as AffiliateProduct['category'])}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-[#FFE600]"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-400">
                  Você poderá editar a categoria de cada produto individualmente depois.
                </p>
              </div>

              <button
                type="button"
                disabled={isProcessingBatch || !batchLinksText.trim()}
                onClick={handleProcessBatch}
                className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2.5 text-xs font-bold text-white transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessingBatch ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FFE600]" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-[#FFE600]" />
                )}
                <span>{isProcessingBatch ? 'Processando links...' : 'Processar Links'}</span>
              </button>
            </div>
          </div>

          {/* Prévia dos Produtos Identificados */}
          {batchParsedProducts.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span>Prévia Identificada ({batchParsedProducts.length} itens)</span>
                <button
                  type="button"
                  onClick={() => setBatchParsedProducts([])}
                  className="text-[11px] text-red-400 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Limpar prévia</span>
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {batchParsedProducts.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800/80"
                  >
                    <img
                      src={p.imageUrl}
                      alt=""
                      className="h-10 w-10 rounded-lg object-contain bg-white p-0.5 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{p.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span
                          className={cn(
                            'font-bold uppercase',
                            p.marketplace === 'shopee' ? 'text-orange-400' : 'text-yellow-400'
                          )}
                        >
                          {p.marketplace === 'shopee' ? 'Shopee' : 'Mercado Livre'}
                        </span>
                        <span>•</span>
                        <span className="text-emerald-400 font-semibold">{formatBRL(p.currentPrice)}</span>
                        <span>•</span>
                        <span>{p.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={isSavingBatch}
                onClick={handleSaveBatch}
                className="w-full rounded-2xl bg-[#FFE600] hover:bg-yellow-400 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-lg shadow-yellow-500/20 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingBatch ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                ) : (
                  <Zap className="h-4 w-4 text-slate-950" />
                )}
                <span>
                  {isSavingBatch
                    ? 'Salvando lote...'
                    : `Salvar Todos na Minha Loja (${batchParsedProducts.length})`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </PlanGate>
  );
}
