import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageCircle,
  Copy,
  Clock,
  CheckCircle2,
  Sparkles,
  Lock,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatBRL } from '@/lib/catalog';
import type { AffiliateProduct } from '@/types/product';
import type { LojaAfiliado } from '@/types/tenant';
import type { PlanPermissions } from '@/config/planPermissions';
import { PlanGate } from './PlanGate';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type VipTemplate = 'achadinho' | 'urgencia' | 'unidades';

export interface LojistaVipDispatcherProps {
  store: LojaAfiliado;
  products: AffiliateProduct[];
  permissions: PlanPermissions;
  onUpgrade?: () => void;
  className?: string;
}

export function LojistaVipDispatcher({
  store,
  products,
  permissions,
  onUpgrade,
  className,
}: LojistaVipDispatcherProps) {
  const [vipSearch, setVipSearch] = useState('');
  const [vipFilter, setVipFilter] = useState<'todos' | 'nao_disparados' | 'disparados'>('todos');
  const [selectedProduct, setSelectedProduct] = useState<AffiliateProduct | null>(null);
  const [vipTemplate, setVipTemplate] = useState<VipTemplate>('achadinho');
  const [customCopyText, setCustomCopyText] = useState('');
  const [disparosMap, setDisparosMap] = useState<Record<string, string>>({});

  // Assinatura Customizada (Plano Advanced)
  const defaultSignature = `✨ ${store?.nomeLoja || 'Nossa Vitrine'} • Ofertas selecionadas todos os dias!`;
  const [customSignature, setCustomSignature] = useState(() => {
    if (typeof window === 'undefined') return defaultSignature;
    try {
      return (store?.slug && localStorage.getItem(`vip_signature_${store.slug}`)) || defaultSignature;
    } catch {
      return defaultSignature;
    }
  });

  const getTodayDateStr = () => new Date().toISOString().slice(0, 10);

  // Carrega histórico de disparos salvo em localStorage
  useEffect(() => {
    if (store?.slug) {
      try {
        const saved = localStorage.getItem(`disparos_vip_${store.slug}`);
        if (saved) {
          setDisparosMap(JSON.parse(saved));
        }
      } catch {
        // ignore
      }
    }
  }, [store?.slug]);

  // Se o usuário estiver no plano Start e tentar usar urgencia/unidades, reseta para achadinho
  useEffect(() => {
    if (permissions.vipDispatcherMode === 'basic' && vipTemplate !== 'achadinho') {
      setVipTemplate('achadinho');
    }
  }, [permissions.vipDispatcherMode, vipTemplate]);

  // Filtra produtos da loja com isolamento estrito
  const storeProducts = useMemo(() => {
    return products.filter((p) => {
      if (store.slug === 'clarice') {
        return !p.lojaSlug || p.lojaSlug === 'clarice';
      }
      return p.lojaSlug === store.slug;
    });
  }, [products, store.slug]);

  const searchedProducts = useMemo(() => {
    if (!vipSearch.trim()) return storeProducts;
    const q = vipSearch.toLowerCase();
    return storeProducts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.mlbId && p.mlbId.toLowerCase().includes(q))
    );
  }, [storeProducts, vipSearch]);

  const todayStr = getTodayDateStr();

  const displayedProducts = useMemo(() => {
    if (vipFilter === 'nao_disparados') {
      return searchedProducts.filter((p) => disparosMap[p.id] !== todayStr);
    }
    if (vipFilter === 'disparados') {
      return searchedProducts.filter((p) => disparosMap[p.id] === todayStr);
    }
    return searchedProducts;
  }, [searchedProducts, vipFilter, disparosMap, todayStr]);

  const nonDispatchedCount = useMemo(
    () => storeProducts.filter((p) => disparosMap[p.id] !== todayStr).length,
    [storeProducts, disparosMap, todayStr]
  );

  const dispatchedTodayCount = useMemo(
    () => storeProducts.filter((p) => disparosMap[p.id] === todayStr).length,
    [storeProducts, disparosMap, todayStr]
  );

  // Helper para gerar copy formatada
  const generateVipCopy = (
    product: AffiliateProduct,
    template: VipTemplate
  ): string => {
    const isShopee = product.marketplace === 'shopee';
    const canal = isShopee ? 'SHOPEE' : 'MERCADO LIVRE';
    const host = typeof window !== 'undefined' ? window.location.origin : 'https://clariceachadinhos.vercel.app';
    const vitrineUrl = `${host}/?loja=${store.slug}&produto=${product.id}`;
    const precoAntigo = formatBRL(product.originalPrice);
    const precoAtual = formatBRL(product.currentPrice);
    const desconto = product.discountPercent;
    const parcelas = product.installmentsText || 'em até 6x sem juros';
    const lojaNome = store.nomeLoja || 'Nossa Loja';

    const rodape =
      permissions.vipDispatcherMode === 'advanced' && customSignature.trim()
        ? `\n\n${customSignature.trim()}`
        : '';

    if (template === 'urgencia') {
      return (
        `🚨 *OFERTA RELÂMPAGO • PREÇO BAIXOU AGORA!*\n` +
        `🔥 *${product.title}*\n\n` +
        `~De: ${precoAntigo}~\n` +
        `💥 *Por apenas: ${precoAtual}* (${desconto}% OFF)\n` +
        `💳 ${parcelas}\n` +
        `⚡ *Envio Rápido & Compra 100% Garantida no app ${canal}*\n\n` +
        `👉 *Ver fotos e garantir na nossa vitrine:*\n${vitrineUrl}\n\n` +
        `🛒 *Ou compre direto pelo link oficial:*\n${product.affiliateUrl}\n\n` +
        `⏰ _Atenção: Promoção por tempo limitado enquanto durar o estoque promocional!_${rodape}`
      );
    }

    if (template === 'unidades') {
      return (
        `⚠️ *ÚLTIMAS UNIDADES COM ESSE PREÇO!*\n` +
        `🏷️ *${product.title}*\n\n` +
        `Estoque com desconto quase esgotado no ${canal}!\n\n` +
        `~De: ${precoAntigo}~\n` +
        `✅ *Por apenas: ${precoAtual}* (${desconto}% OFF)\n` +
        `💳 ${parcelas}\n\n` +
        `👉 *Garanta o seu antes que volte ao preço normal:*\n${vitrineUrl}\n\n` +
        `🔗 *Link direto oficial:* ${product.affiliateUrl}\n\n` +
        `🏃‍♂️💨 _Corre antes que acabe! Equipe ${lojaNome}_${rodape}`
      );
    }

    // Default: 'achadinho'
    return (
      `⭐ *ACHADINHO DO DIA • CURADORIA ${lojaNome.toUpperCase()}*\n` +
      `🛍️ *${product.title}*\n\n` +
      `Garimpamos essa oferta exclusiva com desconto real verificado no ${canal}:\n\n` +
      `~De: ${precoAntigo}~\n` +
      `✅ *Por apenas: ${precoAtual}* (${desconto}% OFF)\n` +
      `💳 ${parcelas}\n` +
      `🚚 ${product.freeShipping ? 'Frete Grátis disponível' : 'Envio Rápido'}\n\n` +
      `👉 *Ver detalhes e fotos completas na vitrine:*\n${vitrineUrl}\n\n` +
      `🔗 *Link do produto:* ${product.affiliateUrl}\n\n` +
      `✨ _Selecionado especialmente para os membros do nosso Grupo VIP!_${rodape}`
    );
  };

  // Atualiza copy quando produto, template ou assinatura mudar
  useEffect(() => {
    if (selectedProduct) {
      setCustomCopyText(generateVipCopy(selectedProduct, vipTemplate));
    }
  }, [selectedProduct, vipTemplate, customSignature, permissions.vipDispatcherMode]);

  const markProductAsDispatched = (productId: string) => {
    const today = getTodayDateStr();
    const updated = { ...disparosMap, [productId]: today };
    setDisparosMap(updated);
    try {
      localStorage.setItem(`disparos_vip_${store.slug}`, JSON.stringify(updated));
    } catch {
      // ignore
    }

    if (isSupabaseConfigured) {
      try {
        supabase
          .from('produtos_clarice')
          .update({ ultimo_disparo_em: new Date().toISOString() })
          .eq('id', productId)
          .then(() => {}, () => {});
      } catch {
        // ignore
      }
    }
  };

  const resetProductDispatch = (productId: string) => {
    const updated = { ...disparosMap };
    delete updated[productId];
    setDisparosMap(updated);
    try {
      localStorage.setItem(`disparos_vip_${store.slug}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
    toast.info('Status de disparo resetado para este produto.');
  };

  const handleCopyVip = async () => {
    if (!customCopyText.trim()) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(customCopyText);
      } else {
        throw new Error('Clipboard API indisponível');
      }
      toast.success('Copy copiada para a área de transferência!');
    } catch {
      // Fallback seguro usando elemento textarea temporário
      try {
        const el = document.createElement('textarea');
        el.value = customCopyText;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        toast.success('Copy copiada para a área de transferência!');
      } catch {
        toast.info('Selecione e copie a copy diretamente na caixa de texto.');
      }
    }
  };

  const handleFireWhatsApp = () => {
    if (!selectedProduct || !customCopyText.trim()) {
      toast.error('Selecione um produto e revise a copy antes de disparar.');
      return;
    }
    markProductAsDispatched(selectedProduct.id);
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(customCopyText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    toast.success('WhatsApp aberto e produto marcado como Disparado Hoje!');
  };

  const handleSignatureChange = (val: string) => {
    setCustomSignature(val);
    try {
      localStorage.setItem(`vip_signature_${store.slug}`, val);
    } catch {
      // ignore
    }
  };

  const canUseExtraTemplates = permissions.vipDispatcherMode !== 'basic';
  const canUseCustomSignature = permissions.vipDispatcherMode === 'advanced';

  return (
    <div className={cn('rounded-3xl border border-slate-800 bg-[#0F172A] p-5 shadow-xl space-y-5', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="font-black text-white text-base sm:text-lg flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <MessageCircle className="h-4 w-4 fill-current" />
            </span>
            Disparador VIP • Grupos de WhatsApp
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gere copies persuasivas em 1 clique e envie para o seu Grupo VIP ou canais sem repetir promoções já enviadas hoje.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400">
            Modo:{' '}
            <strong className="text-white uppercase">
              {permissions.vipDispatcherMode === 'advanced'
                ? 'Advanced (Assinatura VIP)'
                : permissions.vipDispatcherMode === 'full'
                ? 'Pro (3 Templates)'
                : 'Básico (1 Template)'}
            </strong>
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Coluna Esquerda: Lista de Produtos */}
        <div className="lg:col-span-5 space-y-3">
          <input
            type="text"
            value={vipSearch}
            onChange={(e) => setVipSearch(e.target.value)}
            placeholder="Buscar nos meus produtos..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-[#FFE600]"
          />

          {/* Filtros de Status */}
          <div className="flex gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setVipFilter('todos')}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-center transition',
                vipFilter === 'todos'
                  ? 'bg-[#FFE600] text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              Todos ({storeProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setVipFilter('nao_disparados')}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-center transition',
                vipFilter === 'nao_disparados'
                  ? 'bg-[#FFE600] text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              Não Enviados ({nonDispatchedCount})
            </button>
            <button
              type="button"
              onClick={() => setVipFilter('disparados')}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-center transition',
                vipFilter === 'disparados'
                  ? 'bg-[#FFE600] text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              Disparados Hoje ({dispatchedTodayCount})
            </button>
          </div>

          {/* Lista com Scroll */}
          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {displayedProducts.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Nenhum produto encontrado com este filtro.
              </div>
            ) : (
              displayedProducts.map((p) => {
                const isDispatched = disparosMap[p.id] === todayStr;
                const isSelected = selectedProduct?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition select-none',
                      isSelected
                        ? 'border-[#FFE600] bg-yellow-500/10 shadow-md'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60'
                    )}
                  >
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      className="h-14 w-14 rounded-xl object-contain bg-white p-1 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={cn(
                            'px-1.5 py-0.2 rounded text-[9px] font-bold uppercase',
                            p.marketplace === 'shopee'
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          )}
                        >
                          {p.marketplace === 'shopee' ? 'Shopee' : 'Mercado Livre'}
                        </span>
                        {isDispatched ? (
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 flex items-center gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Disparado Hoje
                          </span>
                        ) : (
                          <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[9px] font-medium text-slate-400 flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> Pronto
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-white truncate">{p.title}</p>
                      <p className="text-xs font-black text-emerald-400 mt-0.5">
                        {formatBRL(p.currentPrice)}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({p.discountPercent}% OFF)
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna Direita: Editor de Copy & Disparo */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5 flex flex-col justify-between">
          {!selectedProduct ? (
            <div className="py-24 text-center text-slate-500">
              <MessageCircle className="mx-auto h-12 w-12 mb-3 opacity-30 text-emerald-400" />
              <p className="text-sm font-bold text-slate-300">Nenhum produto selecionado</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Clique em qualquer produto da lista ao lado para carregar a copy automática pronta para disparo.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Topo do Produto Selecionado */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.title}
                    className="h-12 w-12 rounded-xl object-contain bg-white p-1 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{selectedProduct.title}</p>
                    <p className="text-xs font-black text-emerald-400">
                      {formatBRL(selectedProduct.currentPrice)}{' '}
                      <span className="text-[10px] text-slate-400 line-through font-normal">
                        {formatBRL(selectedProduct.originalPrice)}
                      </span>
                    </p>
                  </div>
                </div>

                {disparosMap[selectedProduct.id] === todayStr && (
                  <button
                    type="button"
                    onClick={() => resetProductDispatch(selectedProduct.id)}
                    className="text-[10px] text-slate-500 hover:text-slate-300 underline shrink-0"
                    title="Desmarcar se desejar disparar novamente hoje"
                  >
                    Resetar disparo de hoje
                  </button>
                )}
              </div>

              {/* Seletor de Templates com Gate do Plano Pro */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Escolha o Template de Mensagem:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Template 1: Achadinho (Liberado para Todos) */}
                  <button
                    type="button"
                    onClick={() => setVipTemplate('achadinho')}
                    className={cn(
                      'py-2 px-2 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 text-center',
                      vipTemplate === 'achadinho'
                        ? 'bg-[#FFE600] text-slate-950 border-[#FFE600] shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    )}
                  >
                    <span className="text-sm">⭐</span>
                    <span>Achadinho do Dia</span>
                  </button>

                  {/* Template 2: Urgência */}
                  {canUseExtraTemplates ? (
                    <button
                      type="button"
                      onClick={() => setVipTemplate('urgencia')}
                      className={cn(
                        'py-2 px-2 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 text-center',
                        vipTemplate === 'urgencia'
                          ? 'bg-[#FFE600] text-slate-950 border-[#FFE600] shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      )}
                    >
                      <span className="text-sm">🔥</span>
                      <span>Urgência / Relâmpago</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onUpgrade}
                      title="Exclusivo do Plano Pro"
                      className="py-2 px-2 rounded-xl border border-slate-800/80 bg-slate-900/40 text-slate-600 flex flex-col items-center justify-center gap-1 text-center cursor-pointer hover:border-amber-500/40"
                    >
                      <div className="flex items-center gap-0.5 text-[#FFE600]">
                        <Lock className="h-3 w-3" />
                        <span className="text-[10px] font-bold">Pro</span>
                      </div>
                      <span className="text-xs">Urgência</span>
                    </button>
                  )}

                  {/* Template 3: Últimas Unidades */}
                  {canUseExtraTemplates ? (
                    <button
                      type="button"
                      onClick={() => setVipTemplate('unidades')}
                      className={cn(
                        'py-2 px-2 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 text-center',
                        vipTemplate === 'unidades'
                          ? 'bg-[#FFE600] text-slate-950 border-[#FFE600] shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      )}
                    >
                      <span className="text-sm">🚨</span>
                      <span>Últimas Unidades</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onUpgrade}
                      title="Exclusivo do Plano Pro"
                      className="py-2 px-2 rounded-xl border border-slate-800/80 bg-slate-900/40 text-slate-600 flex flex-col items-center justify-center gap-1 text-center cursor-pointer hover:border-amber-500/40"
                    >
                      <div className="flex items-center gap-0.5 text-[#FFE600]">
                        <Lock className="h-3 w-3" />
                        <span className="text-[10px] font-bold">Pro</span>
                      </div>
                      <span className="text-xs">Últimas Unidades</span>
                    </button>
                  )}
                </div>

                {!canUseExtraTemplates && (
                  <PlanGate
                    allowed={false}
                    requiredPlan="Pro"
                    featureName="Templates Urgência e Últimas Unidades"
                    onUpgrade={onUpgrade}
                    variant="inline"
                    className="mt-2"
                  >
                    <></>
                  </PlanGate>
                )}
              </div>

              {/* Assinatura / Rodapé Customizável (Plano Advanced) */}
              <div>
                {canUseCustomSignature ? (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      Assinatura / Rodapé VIP (Plano Advanced):
                    </label>
                    <input
                      type="text"
                      value={customSignature}
                      onChange={(e) => handleSignatureChange(e.target.value)}
                      placeholder="Ex: ✨ Siga nosso Instagram @minhaloja • Ofertas todo dia!"
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-[#FFE600]"
                    />
                  </div>
                ) : (
                  <PlanGate
                    allowed={false}
                    requiredPlan="Advanced"
                    featureName="Assinatura / Rodapé VIP Customizável"
                    onUpgrade={onUpgrade}
                    variant="inline"
                  >
                    <></>
                  </PlanGate>
                )}
              </div>

              {/* Textarea Editável */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Mensagem Formatada para WhatsApp (Editável):
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Emojis e links verificados
                  </span>
                </div>
                <textarea
                  rows={9}
                  value={customCopyText}
                  onChange={(e) => setCustomCopyText(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 text-xs text-slate-100 font-mono leading-relaxed outline-none focus:ring-2 focus:ring-[#FFE600]"
                />
              </div>

              {/* Botões de Ação */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopyVip}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 py-3.5 text-xs sm:text-sm font-bold text-white transition active:scale-95 shadow-md"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copiar Copy</span>
                </button>

                <button
                  type="button"
                  onClick={handleFireWhatsApp}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#20BD5A] py-3.5 text-xs sm:text-sm font-black text-slate-950 transition active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                  <MessageCircle className="h-4 w-4 fill-current" />
                  <span>Abrir WhatsApp & Disparar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
