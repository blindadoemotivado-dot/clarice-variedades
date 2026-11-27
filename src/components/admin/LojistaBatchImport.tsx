import React, { useState } from 'react';
import {
  Layers,
  Loader2,
  Zap,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { extractMlbId, deduplicateProducts } from '@/lib/catalog';
import { parseShopeeSharedText, splitBatchTextIntoItems } from '@/utils/shopeeSharedText';
import { CATEGORIES, type AffiliateProduct } from '@/types/product';
import type { PlanPermissions } from '@/config/planPermissions';
import type { LojaAfiliado } from '@/types/tenant';
import { applyStoreAffiliateTracking } from '@/utils/affiliateUrl';
import { PlanGate } from './PlanGate';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { extractProductMetadataServerFn } from '@/services/productMetadataServerFn';

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

interface BatchProductItem extends AffiliateProduct {
  tempPriceInput?: string;
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
  const [batchParsedProducts, setBatchParsedProducts] = useState<BatchProductItem[]>([]);
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

  // Atualização inline de preço com suporte a digitação fluida em PT-BR (vírgula e ponto)
  const handleUpdateProductPrice = (id: string, textValue: string, numValue: number) => {
    setBatchParsedProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const orig = p.originalPrice;
        const cur = numValue;
        return {
          ...p,
          tempPriceInput: textValue,
          currentPrice: cur,
          discountPercent: orig > cur && cur > 0 ? Math.round(((orig - cur) / orig) * 100) : 0,
          installmentsText: cur > 0 ? 'em até 6x sem juros' : '',
        };
      })
    );
  };

  const handleBlurProductPrice = (id: string) => {
    setBatchParsedProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          tempPriceInput: p.currentPrice > 0 ? p.currentPrice.toFixed(2).replace('.', ',') : '',
        };
      })
    );
  };

  // Atualização inline de outros campos (Poka-Yoke)
  const handleUpdateProductField = (
    id: string,
    field: 'originalPrice' | 'title' | 'imageUrl' | 'category',
    value: any
  ) => {
    setBatchParsedProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };
        if (field === 'originalPrice') {
          const cur = p.currentPrice;
          const orig = Number(value) || 0;
          updated.discountPercent = orig > cur && cur > 0 ? Math.round(((orig - cur) / orig) * 100) : 0;
        }
        return updated;
      })
    );
  };

  // Remoção individual de item da prévia
  const handleRemoveProductFromBatch = (id: string) => {
    setBatchParsedProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Processamento do Lote de Links com concorrência controlada de 2 em 2
  const handleProcessBatch = async () => {
    const batchItems = splitBatchTextIntoItems(batchLinksText);

    if (batchItems.length === 0) {
      toast.error('Cole ao menos um link válido do Mercado Livre ou Shopee para processar.');
      return;
    }

    const limitedItems = batchItems.slice(0, maxPerBatch);
    if (batchItems.length > maxPerBatch) {
      toast.info(
        `Seu plano permite até ${maxPerBatch} produtos por lote. Processando os primeiros ${maxPerBatch}.`
      );
    }

    setIsProcessingBatch(true);
    try {
      const concurrency = 2;
      let currentIndex = 0;
      const parsedResults: BatchProductItem[] = new Array(limitedItems.length);

      const processItem = async (
        item: { rawText: string; url: string },
        i: number
      ): Promise<BatchProductItem> => {
        const shared = parseShopeeSharedText(item.rawText);
        const rawUrl = shared?.url || item.url;
        const { finalUrl: url } = applyStoreAffiliateTracking(rawUrl, store);
        const isShopee = url.includes('shopee.com') || url.includes('shp.ee');
        const hashVal = Math.abs(hash(url) || Date.now() + i);

        let meta: any = null;
        try {
          meta = await extractProductMetadataServerFn({
            data: {
              url,
              lojaSlug,
              shopeeAppId: store?.shopeeAppId,
              shopeeSecret: store?.shopeeSecret,
              preservedCurrentPrice: shared?.currentPrice,
              preservedOriginalPrice: shared?.originalPrice,
            },
          });
        } catch (err) {
          console.warn('[LojistaBatchImport] Falha ao extrair metadados do link:', url, err);
        }

        const marketplace = meta?.marketplace || (isShopee ? 'shopee' : 'mercadolivre');
        const mlbId =
          marketplace === 'mercadolivre'
            ? extractMlbId(url) || `MLB-${String(hashVal).slice(0, 8)}`
            : `SHP-${String(hashVal).slice(0, 8)}`;

        let title = meta?.title || shared?.title || '';
        if (!title || title.includes('Produto Shopee #')) {
          if (marketplace === 'shopee') {
            const slugMatch = url.match(/shopee\.com\.br\/([^?]+)-i\./i);
            if (slugMatch) {
              const decoded = decodeURIComponent(slugMatch[1]).replace(/[-_]+/g, ' ').trim();
              if (decoded) title = decoded.charAt(0).toUpperCase() + decoded.slice(1);
            }
          } else {
            const slug = url.split('/').find((s) => /[a-z]-[a-z]/i.test(s) && !/MLB/i.test(s));
            if (slug) {
              title = slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            }
          }
        }
        if (!title || title.includes('Produto Shopee #')) {
          title = marketplace === 'shopee' ? `Oferta Shopee ${mlbId}` : `Produto Mercado Livre ${mlbId}`;
        }

        let curPrice = 0;
        if (meta?.currentPrice) {
          curPrice = parseFloat(meta.currentPrice.replace(/\./g, '').replace(',', '.')) || 0;
        } else if (shared?.currentPrice) {
          curPrice = parseFloat(shared.currentPrice.replace(/\./g, '').replace(',', '.')) || 0;
        }

        let origPrice = curPrice;
        if (meta?.originalPrice) {
          origPrice = parseFloat(meta.originalPrice.replace(/\./g, '').replace(',', '.')) || curPrice;
        } else if (shared?.originalPrice) {
          origPrice = parseFloat(shared.originalPrice.replace(/\./g, '').replace(',', '.')) || curPrice;
        }

        const disc =
          origPrice > curPrice && curPrice > 0
            ? Math.round(((origPrice - curPrice) / origPrice) * 100)
            : 0;

        const imageUrl = meta?.imageUrl?.trim() || '';

        return {
          id: `${mlbId}-${Date.now()}-${i}`,
          mlbId,
          title,
          originalPrice: origPrice,
          currentPrice: curPrice,
          tempPriceInput: curPrice > 0 ? curPrice.toFixed(2).replace('.', ',') : '',
          discountPercent: disc,
          installmentsText: curPrice > 0 ? 'em até 6x sem juros' : '',
          imageUrl,
          affiliateUrl: url,
          category: (meta?.category as any) || batchDefaultCategory,
          freeShipping: true,
          isFull: marketplace === 'mercadolivre',
          rating: 4.8,
          reviewsCount: 190,
          featured: false,
          status: 'ativo',
          marketplace,
          lojaSlug,
        };
      };

      const workers = Array.from({ length: Math.min(concurrency, limitedItems.length) }, async () => {
        while (currentIndex < limitedItems.length) {
          const idx = currentIndex++;
          parsedResults[idx] = await processItem(limitedItems[idx], idx);
        }
      });
      await Promise.all(workers);

      setBatchParsedProducts(parsedResults);
      const pendingCount = parsedResults.filter((p) => p.currentPrice <= 0 || !p.imageUrl).length;
      if (pendingCount > 0) {
        toast.warning(
          `${parsedResults.length} item(ns) processado(s)! ${pendingCount} produto(s) requerem confirmação de preço ou foto antes de salvar.`
        );
      } else {
        toast.success(`${parsedResults.length} produto(s) processado(s) com sucesso! Confira a prévia abaixo.`);
      }
    } catch (err: any) {
      toast.error(`Erro ao processar lote: ${err?.message || 'Falha ao analisar links'}`);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Salvar Todos os Produtos Válidos do Lote (Poka-Yoke)
  const handleSaveBatch = async () => {
    if (batchParsedProducts.length === 0) return;

    // Poka-Yoke: Separa itens válidos de itens incompletos (preço <= 0, sem imagem ou título genérico)
    const invalidItems = batchParsedProducts.filter(
      (p) => p.currentPrice <= 0 || !p.imageUrl?.trim() || p.title.includes('Produto Shopee #')
    );
    const validItems = deduplicateProducts(
      batchParsedProducts.filter(
        (p) => p.currentPrice > 0 && Boolean(p.imageUrl?.trim()) && !p.title.includes('Produto Shopee #')
      )
    );

    if (validItems.length === 0) {
      toast.error(
        'Nenhum produto válido para salvar. Preencha o preço e certifique-se de que cada produto possui imagem antes de salvar.'
      );
      return;
    }

    // Validação estrita do limite total de produtos do plano (lojistas não-isentos)
    if (!isSuperAdminOrExempt && currentProductCount + validItems.length > permissions.maxProducts) {
      const remaining = Math.max(0, permissions.maxProducts - currentProductCount);
      toast.error(
        `⚠️ Limite de ${permissions.maxProducts} produtos atingido! Você possui ${currentProductCount} produtos ativos. Vagas restantes: ${remaining}. Faça upgrade na aba 'Minha Assinatura' para cadastrar produtos ilimitados!`
      );
      return;
    }

    setIsSavingBatch(true);
    try {
      if (isSupabaseConfigured) {
        const rows = validItems.map((p) => ({
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
          toast.error(`Aviso banco: ${error.message}`);
        }
      }

      onImported?.(validItems);

      if (invalidItems.length > 0) {
        setBatchParsedProducts(invalidItems);
        toast.warning(
          `Salvos ${validItems.length} produto(s)! ${invalidItems.length} item(ns) continuam na lista pois precisam de Preço ou Imagem para serem salvos.`
        );
      } else {
        toast.success(
          `🎉 ${validItems.length} produtos importados com sucesso na sua vitrine!`
        );
        setBatchLinksText('');
        setBatchParsedProducts([]);
      }
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
                Cole links ou textos copiados dos apps do Mercado Livre e Shopee (1 item por linha ou blocos com preço).
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
                Links ou Textos Compartilhados (ML ou Shopee)
              </label>
              <textarea
                rows={5}
                value={batchLinksText}
                onChange={(e) => setBatchLinksText(e.target.value)}
                placeholder={'https://produto.mercadolivre.com.br/MLB-...\nhttps://meli.la/...\nhttps://s.shopee.com.br/...\nOu cole blocos com título, preço e link copiados do app...'}
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

          {/* Prévia dos Produtos Identificados com Revisão Poka-Yoke */}
          {batchParsedProducts.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-white">
                <div className="flex items-center gap-2">
                  <span>Prévia Identificada ({batchParsedProducts.length} itens)</span>
                  {(() => {
                    const invalidCount = batchParsedProducts.filter(
                      (p) => p.currentPrice <= 0 || !p.imageUrl?.trim() || p.title.includes('Produto Shopee #')
                    ).length;
                    if (invalidCount > 0) {
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300">
                          <AlertTriangle className="h-3 w-3" />
                          {invalidCount} pendente(s) de ajuste
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Todos prontos para salvar
                      </span>
                    );
                  })()}
                </div>
                <button
                  type="button"
                  onClick={() => setBatchParsedProducts([])}
                  className="text-[11px] text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Limpar prévia</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {batchParsedProducts.map((p, idx) => {
                  const hasZeroPrice = p.currentPrice <= 0;
                  const hasNoImage = !p.imageUrl?.trim();
                  const isGenericTitle = p.title.includes('Produto Shopee #');
                  const isInvalid = hasZeroPrice || hasNoImage || isGenericTitle;

                  return (
                    <div
                      key={p.id || idx}
                      className={cn(
                        'flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border transition',
                        isInvalid
                          ? 'bg-amber-950/20 border-amber-500/40'
                          : 'bg-slate-950 border-slate-800/80'
                      )}
                    >
                      <div className="relative h-12 w-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="h-full w-full object-contain p-0.5"
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-slate-500" />
                        )}
                        {hasNoImage && (
                          <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-[9px] font-bold text-amber-300 text-center leading-none">
                            Sem Foto
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white truncate flex-1">{p.title}</p>
                          <button
                            type="button"
                            onClick={() => handleRemoveProductFromBatch(p.id)}
                            className="text-slate-500 hover:text-red-400 transition shrink-0 p-1 cursor-pointer"
                            title="Remover este item do lote"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                          <span
                            className={cn(
                              'font-bold uppercase',
                              p.marketplace === 'shopee' ? 'text-orange-400' : 'text-yellow-400'
                            )}
                          >
                            {p.marketplace === 'shopee' ? 'Shopee' : 'Mercado Livre'}
                          </span>
                          <span>•</span>
                          <span>{p.category}</span>
                        </div>

                        {/* Controles de Correção Rápida */}
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-300">Preço:</span>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                                R$
                              </span>
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={
                                  p.tempPriceInput !== undefined
                                    ? p.tempPriceInput
                                    : p.currentPrice > 0
                                      ? p.currentPrice.toFixed(2).replace('.', ',')
                                      : ''
                                }
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const rawVal = e.target.value.replace(/[^\d.,]/g, '');
                                  const num = parseFloat(rawVal.replace(/\./g, '').replace(',', '.'));
                                  handleUpdateProductPrice(p.id, rawVal, isNaN(num) ? 0 : num);
                                }}
                                onBlur={() => handleBlurProductPrice(p.id)}
                                className={cn(
                                  'w-24 rounded-lg bg-slate-900 border py-1 pl-6 pr-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-[#FFE600]',
                                  hasZeroPrice ? 'border-amber-500 bg-amber-500/10' : 'border-slate-700'
                                )}
                              />
                            </div>
                            {hasZeroPrice && (
                              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                                <AlertTriangle className="h-3 w-3 shrink-0" /> Obrigatório
                              </span>
                            )}
                          </div>

                          {hasNoImage && (
                            <div className="flex items-center gap-1 flex-1 min-w-[180px]">
                              <input
                                type="url"
                                placeholder="Colar URL da Foto"
                                value={p.imageUrl}
                                onChange={(e) =>
                                  handleUpdateProductField(p.id, 'imageUrl', e.target.value.trim())
                                }
                                className="w-full rounded-lg bg-slate-900 border border-amber-500/50 py-1 px-2 text-[11px] text-white outline-none focus:ring-1 focus:ring-[#FFE600]"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={isSavingBatch}
                onClick={handleSaveBatch}
                className="w-full rounded-2xl bg-[#FFE600] hover:bg-yellow-400 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-lg shadow-yellow-500/20 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSavingBatch ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                ) : (
                  <Zap className="h-4 w-4 text-slate-950" />
                )}
                <span>
                  {isSavingBatch
                    ? 'Salvando produtos válidos...'
                    : `Salvar Produtos Prontos na Minha Loja (${
                        batchParsedProducts.filter(
                          (p) => p.currentPrice > 0 && Boolean(p.imageUrl?.trim()) && !p.title.includes('Produto Shopee #')
                        ).length
                      }/${batchParsedProducts.length})`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </PlanGate>
  );
}
