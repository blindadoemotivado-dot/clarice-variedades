import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Link2,
  MessageCircle,
  Radar,
  RefreshCw,
  Server,
  Settings,
  Sparkles,
  Square,
  Star,
  Trash2,
  WandSparkles,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { CATEGORIES, type AffiliateProduct } from '@/types/product';
import { buildWhatsAppCopy, formatBRL, productFromUrl } from '@/lib/catalog';
import {
  DEFAULT_STORE_SETTINGS,
  applyAffiliateTag,
  openOrderWhatsApp,
  openVipGroup,
  useStoreSettings,
} from '@/lib/store-settings';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { copyText } from './ProductCard';
import { cn } from '@/lib/utils';

type Cat = AffiliateProduct['category'];
const CATS = CATEGORIES.filter((c): c is Cat => c !== 'Todos');
const field =
  'w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20';
const primary =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-cyan-300 disabled:opacity-50';

const FALLBACK_IMAGE = '/icon-192.png';

export function isValidMercadoLivreUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  const isHttp = trimmed.startsWith('http://') || trimmed.startsWith('https://');
  const isMlDomain = trimmed.includes('mercadolivre.com') || trimmed.includes('meli.la');
  return isHttp && isMlDomain;
}

export function isMonetizedUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('meli.la') ||
    lower.includes('matt_tool') ||
    lower.includes('tracking_id') ||
    lower.includes('tag=') ||
    lower.includes('afiliado')
  );
}

export interface AdminSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: AffiliateProduct[];
  onAdd: (p: AffiliateProduct[]) => void;
  onRemove: (id: string) => void;
  onBatchRemove?: (ids: string[]) => Promise<void> | void;
  onToggleFeatured: (id: string) => void;
  onReset: () => void;
  onEmptyCatalog?: () => Promise<void> | void;
  onClearDemo?: () => void;
  pendingProducts?: AffiliateProduct[];
  onApprovePending?: (id: string, customAffiliateUrl?: string) => Promise<void> | void;
  onBatchApprovePending?: (ids: string[]) => Promise<void> | void;
  onRejectPending?: (id: string) => Promise<void> | void;
  onBatchRejectPending?: (ids: string[]) => Promise<void> | void;
  onSyncRadar?: (tag?: string) => Promise<any> | void;
}

function CategorySelect({ value, onChange }: { value: Cat; onChange: (c: Cat) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Cat)} className={field} aria-label="Categoria">
      {CATS.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

function MagicTab({ onAdd }: Pick<AdminSheetProps, 'onAdd'>) {
  const [settings] = useStoreSettings();
  const [url, setUrl] = useState('');
  const [aff, setAff] = useState('');
  const [cat, setCat] = useState<Cat>('Casa & Cozinha');
  const [ai, setAi] = useState(true);
  const [preview, setPreview] = useState<AffiliateProduct | null>(null);

  const handleApplyDefaultTag = () => {
    if (!url.trim()) {
      toast.error('Cole primeiro a URL do produto no Mercado Livre.');
      return;
    }
    const monetized = applyAffiliateTag(url, settings.mlAffiliateTag);
    setAff(monetized);
    toast.success(`Tag de afiliado (${settings.mlAffiliateTag}) aplicada com sucesso!`);
  };

  const publish = () => {
    if (!url.trim()) {
      toast.error('Informe a URL do produto no Mercado Livre.');
      return;
    }
    if (!isValidMercadoLivreUrl(url)) {
      toast.error('URL do produto inválida. Deve ser um link oficial do Mercado Livre (mercadolivre.com ou meli.la).');
      return;
    }
    if (!aff.trim()) {
      toast.error('🔒 Trava de Monetização: O link de afiliado é obrigatório para não perder comissões!');
      return;
    }
    if (!isValidMercadoLivreUrl(aff)) {
      toast.error('Link de afiliado inválido. Deve ser uma URL do Mercado Livre (mercadolivre.com ou meli.la).');
      return;
    }

    const p = productFromUrl(url, cat, aff.trim(), ai);
    if (!p) {
      toast.error('Não foi possível processar a URL informada.');
      return;
    }
    setPreview(p);
    onAdd([p]);
    setUrl('');
    setAff('');
    toast.success('Produto monetizado e publicado com sucesso no catálogo!');
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-5 space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Link do Produto no Mercado Livre</label>
          <input
            className={field}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://produto.mercadolivre.com.br/MLB-..."
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              <span className="text-amber-400 mr-1 font-bold">*</span>Link de Afiliado (Obrigatório)
            </label>
            <div className="flex items-center gap-2">
              {url.trim() && !aff.trim() && (
                <button
                  type="button"
                  onClick={handleApplyDefaultTag}
                  className="text-[10px] text-cyan-300 hover:text-cyan-200 underline font-semibold"
                >
                  ⚡ Aplicar Tag Padrão ({settings.mlAffiliateTag})
                </button>
              )}
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                🔒 Trava Ativa
              </span>
            </div>
          </div>
          <input
            className={cn(field, !aff.trim() && 'border-amber-400/40 focus:border-amber-400')}
            value={aff}
            onChange={(e) => setAff(e.target.value)}
            placeholder="https://meli.la/... ou link com matt_tool"
            required
          />
          <p className="text-[11px] text-zinc-400 mt-1">
            Cole seu link de afiliado oficial do Mercado Livre (ex: meli.la ou com seu tracking_id) para garantir o comissionamento.
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Categoria do Produto</label>
          <CategorySelect value={cat} onChange={setCat} />
        </div>
        <label className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-3 text-sm text-zinc-200">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-300" /> Otimizar título com IA para conversão
          </span>
          <Switch checked={ai} onCheckedChange={setAi} />
        </label>
        <button type="button" className={primary} onClick={publish} disabled={!url.trim() || !aff.trim()}>
          <Zap className="h-4 w-4" /> Processar e Publicar Imediatamente
        </button>
      </div>

      {preview && (
        <div className="flex gap-3.5 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3.5 items-center">
          <img
            src={preview.imageUrl}
            alt=""
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = FALLBACK_IMAGE;
            }}
            className="h-16 w-16 rounded-lg object-contain bg-white/5"
          />
          <div className="min-w-0 text-xs flex-1">
            <span className="rounded bg-cyan-400/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">
              {preview.mlbId}
            </span>
            <p className="line-clamp-2 font-medium text-zinc-100 mt-1">{preview.title}</p>
            <p className="mt-1 text-zinc-400">
              {formatBRL(preview.currentPrice)} • <span className="text-emerald-400">{preview.discountPercent}% OFF</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function BulkTab({ onAdd }: Pick<AdminSheetProps, 'onAdd'>) {
  const [text, setText] = useState('');
  const [cat, setCat] = useState<Cat>('Casa & Cozinha');
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const run = () => {
    if (lines.length === 0) {
      toast.error('Cole ao menos um link do Mercado Livre para importar.');
      return;
    }

    const invalid = lines.filter((l) => !isValidMercadoLivreUrl(l));
    if (invalid.length > 0) {
      toast.error(
        `🔒 Trava de Monetização: ${invalid.length} link(s) inválido(s). Todos os links no lote devem ser URLs do Mercado Livre (mercadolivre.com ou meli.la).`
      );
      return;
    }

    const items = lines
      .map((l) => productFromUrl(l, cat, l))
      .filter((p): p is AffiliateProduct => p !== null);
    onAdd(items);
    setText('');
    toast.success(`${items.length} produtos importados com sucesso!`);
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-5 space-y-3.5">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-zinc-300">
              <span className="text-amber-400 mr-1 font-bold">*</span>Cole as URLs de Afiliado (uma por linha):
            </label>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
              🔒 Trava Ativa
            </span>
          </div>
          <textarea
            rows={8}
            className={cn(field, 'font-mono text-xs leading-relaxed')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'https://meli.la/123456\nhttps://produto.mercadolivre.com.br/MLB-...?matt_tool=...'}
          />
          <p className="text-xs text-zinc-400 mt-1.5">{lines.length} link(s) válido(s) identificado(s) • Obrigatório ser URL oficial ML</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Categoria Padrão do Lote</label>
          <CategorySelect value={cat} onChange={setCat} />
        </div>
        <button type="button" className={primary} onClick={run} disabled={lines.length === 0}>
          <Zap className="h-4 w-4" /> Importar Lote Completo ({lines.length})
        </button>
      </div>
    </div>
  );
}

function ManageTab({
  products,
  onRemove,
  onBatchRemove,
  onToggleFeatured,
  onEmptyCatalog,
  onClearDemo,
}: Omit<AdminSheetProps, 'open' | 'onOpenChange' | 'onAdd'>) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.mlbId.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const filteredIds = filtered.map((p) => p.id);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBatchDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;

    const confirmMsg =
      count === 1
        ? 'Deseja realmente excluir o produto selecionado do catálogo?'
        : `Deseja realmente excluir os ${count} produtos selecionados do catálogo?`;

    if (window.confirm(confirmMsg)) {
      const idsArray = Array.from(selectedIds);
      if (onBatchRemove) {
        await onBatchRemove(idsArray);
      } else {
        idsArray.forEach((id) => onRemove(id));
      }
      clearSelection();
      toast.success(`${count} ${count === 1 ? 'produto excluído' : 'produtos excluídos'} do catálogo!`);
    }
  };

  const handleEmptyCatalog = async () => {
    if (products.length === 0) {
      toast.info('O catálogo já está vazio.');
      return;
    }

    if (
      window.confirm(
        '⚠️ ATENÇÃO: Deseja realmente esvaziar todo o catálogo ativo? Todos os produtos da vitrine pública serão excluídos.'
      )
    ) {
      if (onEmptyCatalog) {
        await onEmptyCatalog();
      }
      clearSelection();
      toast.success('Catálogo esvaziado com sucesso!');
    }
  };

  return (
    <div className="space-y-3.5 max-w-4xl mx-auto">
      {/* Barra de Ação em Lote Seletiva (Sticky) */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/50 bg-zinc-950/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-cyan-400 text-xs font-black text-zinc-950 px-1.5">
              {selectedIds.size}
            </span>
            <span className="text-xs font-bold text-zinc-100">
              {selectedIds.size === 1 ? '1 produto selecionado' : `${selectedIds.size} produtos selecionados`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
            >
              Limpar seleção
            </button>
            <button
              type="button"
              onClick={handleBatchDelete}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 text-xs font-bold transition shadow-md shadow-rose-600/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir Selecionados ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      {/* Barra de Ferramentas / Filtro */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrar por nome, categoria ou código MLB..."
          className={cn(field, 'sm:max-w-xs text-xs')}
        />
        <div className="flex flex-wrap items-center gap-2">
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/20 transition"
            >
              {allFilteredSelected ? (
                <>
                  <CheckSquare className="h-3.5 w-3.5" /> Desmarcar todos
                </>
              ) : (
                <>
                  <Square className="h-3.5 w-3.5" /> Selecionar todos ({filtered.length})
                </>
              )}
            </button>
          )}
          {onClearDemo && (
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    'Deseja remover todos os produtos de demonstração do catálogo? Os achadinhos reais do Radar permanecerão intactos.'
                  )
                ) {
                  onClearDemo();
                  toast.success('Produtos de demonstração removidos com sucesso!');
                }
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
            >
              <Sparkles className="h-3.5 w-3.5" /> Limpar Produtos Demo
            </button>
          )}
          <button
            type="button"
            onClick={handleEmptyCatalog}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3.5 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/25 transition shadow-sm"
          >
            <Trash2 className="h-3.5 w-3.5" /> Esvaziar Catálogo
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">Nenhum produto encontrado neste filtro.</p>
        ) : (
          filtered.map((p) => {
            const isSelected = selectedIds.has(p.id);
            return (
              <div
                key={p.id}
                className={cn(
                  'flex flex-col sm:flex-row items-start sm:items-center gap-3.5 rounded-xl border p-3 transition',
                  isSelected
                    ? 'border-cyan-400/60 bg-cyan-950/30 ring-1 ring-cyan-400/30'
                    : 'border-white/10 bg-zinc-900/70 hover:border-white/20'
                )}
              >
                {/* Checkbox Individual */}
                <div className="flex items-center self-center pr-0.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(p.id)}
                    aria-label={`Selecionar ${p.title}`}
                    className="h-4 w-4 rounded border-white/20 bg-zinc-950 text-cyan-400 focus:ring-2 focus:ring-cyan-400/40 cursor-pointer accent-cyan-400"
                  />
                </div>

                <img
                  src={p.imageUrl}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_IMAGE;
                  }}
                  className="h-14 w-14 shrink-0 rounded-lg object-contain bg-white/5 p-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold text-cyan-300 bg-cyan-400/10 px-1.5 py-0.5 rounded">
                      {p.mlbId}
                    </span>
                    <span className="text-[10px] text-zinc-400">{p.category}</span>
                    {isMonetizedUrl(p.affiliateUrl) ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                        ✓ Monetizado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/30">
                        ⚠ Sem Afiliado
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs font-medium text-zinc-100 mt-1">{p.title}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    <strong className="text-zinc-100">{formatBRL(p.currentPrice)}</strong>{' '}
                    <span className="text-emerald-400">({p.discountPercent}% OFF)</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => copyText(p.affiliateUrl, 'Link copiado com sucesso!')}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200"
                    >
                      <Link2 className="h-3 w-3" /> Copiar link
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(buildWhatsAppCopy(p), 'Copy formatada copiada com sucesso!')}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 hover:text-emerald-200"
                    >
                      <FileText className="h-3 w-3" /> Gerar WhatsApp
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => onToggleFeatured(p.id)}
                    aria-label="Alternar destaque"
                    className={cn(
                      'rounded-lg p-2 transition',
                      p.featured ? 'text-amber-300 bg-amber-400/10' : 'text-zinc-500 hover:text-amber-300'
                    )}
                  >
                    <Star className={cn('h-4 w-4', p.featured && 'fill-current')} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRemove(p.id);
                      toast('Produto removido do catálogo.');
                    }}
                    aria-label="Remover produto"
                    className="rounded-lg p-2 text-zinc-500 hover:text-red-400 transition hover:bg-red-400/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function UniversalCopyTab() {
  const universalCopy = `✨ *ACHADINHOS DA CLARICE — SELEÇÃO DE OFERTAS VERIFICADAS*

Garimpamos as melhores ofertas do dia com descontos reais, curadoria cuidadosa e compra 100% segura no Mercado Livre!

🛍️ *Como funciona:*
Basta clicar no produto que você deseja e finalizar sua compra diretamente no aplicativo ou site oficial do Mercado Livre, com toda a garantia e proteção ao consumidor.

⚡ *Ofertas atualizadas hoje* • 🔒 *Redirecionamento seguro* • 🚀 *Envio Full rápido*

👉 Acesse a vitrine completa: https://clarice-variedades.vercel.app`;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center gap-2">
          <Copy className="h-5 w-5 text-emerald-300" />
          <h2 className="font-semibold text-zinc-100">Gerador de Copy Universal</h2>
        </div>
        <p className="text-xs leading-relaxed text-zinc-400">
          Texto de apresentação pronto para compartilhar com seu público ou grupo VIP no WhatsApp. Ideal para divulgar a vitrine e criar confiança com os clientes.
        </p>
        <div className="rounded-xl border border-white/10 bg-zinc-950 p-3.5 font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
          {universalCopy}
        </div>
        <button
          type="button"
          onClick={() => copyText(universalCopy, 'Texto copiado com sucesso!')}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/15 px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-400/25 transition"
        >
          <Copy className="h-4 w-4" /> Copiar Apresentação para WhatsApp
        </button>
      </div>
    </div>
  );
}

function RadarTab({
  pendingProducts = [],
  onApprove,
  onBatchApprove,
  onReject,
  onBatchReject,
  onSyncRadar,
}: {
  pendingProducts?: AffiliateProduct[];
  onApprove?: (id: string, customAffiliateUrl?: string) => Promise<void> | void;
  onBatchApprove?: (ids: string[]) => Promise<void> | void;
  onReject?: (id: string) => Promise<void> | void;
  onBatchReject?: (ids: string[]) => Promise<void> | void;
  onSyncRadar?: (tag?: string) => Promise<any> | void;
}) {
  const [settings] = useStoreSettings();
  const [affiliateUrls, setAffiliateUrls] = useState<Record<string, string>>({});
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [selectedRadarIds, setSelectedRadarIds] = useState<Set<string>>(new Set());

  const allRadarSelected =
    pendingProducts.length > 0 &&
    pendingProducts.every((p) => selectedRadarIds.has(p.id));

  const toggleSelectRadar = (id: string) => {
    setSelectedRadarIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllRadar = () => {
    if (allRadarSelected) {
      setSelectedRadarIds(new Set());
    } else {
      setSelectedRadarIds(new Set(pendingProducts.map((p) => p.id)));
    }
  };

  const clearRadarSelection = () => {
    setSelectedRadarIds(new Set());
  };

  const handleSync = async () => {
    if (!onSyncRadar) return;
    setSyncing(true);
    try {
      const res = await onSyncRadar(settings.mlAffiliateTag);
      if (res && typeof res === 'object' && 'message' in res) {
        toast.success(res.message);
      } else {
        toast.success(`Radar sincronizado! ${res ?? pendingProducts.length} achadinhos na fila.`);
      }
    } catch {
      toast.error('Erro ao sincronizar radar com o Mercado Livre.');
    } finally {
      setSyncing(false);
    }
  };

  const handleApprove = async (p: AffiliateProduct) => {
    if (!onApprove) return;
    setApprovingId(p.id);
    try {
      const rawUrl = affiliateUrls[p.id] ?? p.affiliateUrl;
      const cleanUrl = rawUrl.replace('clarice-variedades', settings.mlAffiliateTag);
      await onApprove(p.id, cleanUrl);
      setSelectedRadarIds((prev) => {
        const next = new Set(prev);
        next.delete(p.id);
        return next;
      });
      toast.success(`"${p.title.slice(0, 32)}..." aprovado e publicado com sucesso!`);
    } catch {
      toast.error('Erro ao aprovar produto.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleBatchApprove = async () => {
    const count = selectedRadarIds.size;
    if (count === 0) return;
    const ids = Array.from(selectedRadarIds);
    if (onBatchApprove) {
      await onBatchApprove(ids);
    } else if (onApprove) {
      for (const id of ids) {
        await onApprove(id);
      }
    }
    clearRadarSelection();
    toast.success(`${count} achadinho(s) aprovado(s) e publicado(s) no catálogo!`);
  };

  const handleReject = async (p: AffiliateProduct) => {
    if (!onReject) return;
    try {
      await onReject(p.id);
      setSelectedRadarIds((prev) => {
        const next = new Set(prev);
        next.delete(p.id);
        return next;
      });
      toast('Oferta removida da fila do radar.');
    } catch {
      toast.error('Erro ao descartar produto.');
    }
  };

  const handleBatchReject = async () => {
    const count = selectedRadarIds.size;
    if (count === 0) return;
    if (window.confirm(`Deseja descartar as ${count} ofertas selecionadas da fila do radar?`)) {
      const ids = Array.from(selectedRadarIds);
      if (onBatchReject) {
        await onBatchReject(ids);
      } else if (onReject) {
        for (const id of ids) {
          await onReject(id);
        }
      }
      clearRadarSelection();
      toast(`${count} oferta(s) removida(s) da fila.`);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Barra de Ação em Lote do Radar (Sticky) */}
      {selectedRadarIds.size > 0 && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/50 bg-zinc-950/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-cyan-400 text-xs font-black text-zinc-950 px-1.5">
              {selectedRadarIds.size}
            </span>
            <span className="text-xs font-bold text-zinc-100">
              {selectedRadarIds.size === 1 ? '1 oferta selecionada no radar' : `${selectedRadarIds.size} ofertas selecionadas`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={clearRadarSelection}
              className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
            >
              Limpar seleção
            </button>
            <button
              type="button"
              onClick={handleBatchApprove}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-3.5 py-1.5 text-xs font-bold transition shadow-md shadow-emerald-500/20"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Aprovar Selecionados ({selectedRadarIds.size})
            </button>
            <button
              type="button"
              onClick={handleBatchReject}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Descartar ({selectedRadarIds.size})
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-cyan-400 animate-pulse" />
            <h2 className="font-semibold text-zinc-100">Radar de Ofertas do Mercado Livre</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
            Garimpados automaticamente com descontos reais de no mínimo <strong>20% OFF</strong>, imagem em alta resolução e frete grátis. Revise o link de afiliado e publique na vitrine com 1 clique.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pendingProducts.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAllRadar}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
            >
              {allRadarSelected ? (
                <>
                  <CheckSquare className="h-3.5 w-3.5 text-cyan-400" /> Desmarcar fila
                </>
              ) : (
                <>
                  <Square className="h-3.5 w-3.5 text-cyan-400" /> Selecionar fila ({pendingProducts.length})
                </>
              )}
            </button>
          )}
          {onSyncRadar && (
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-400/20 transition disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Radar'}
            </button>
          )}
        </div>
      </div>

      {pendingProducts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 text-center text-zinc-400">
          <Radar className="h-10 w-10 mx-auto text-zinc-600 mb-2" />
          <p className="text-sm font-semibold text-zinc-300">Fila do Radar Vazia</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            Todas as ofertas encontradas já foram aprovadas ou descartadas. O radar roda automaticamente a cada 6 horas via GitHub Actions ou instantaneamente pelo botão abaixo.
          </p>
          {onSyncRadar && (
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 text-zinc-950 px-4 py-2 text-xs font-bold hover:bg-cyan-300 transition"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
              Verificar Novas Ofertas Agora
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {pendingProducts.map((p) => {
            const rawAff = affiliateUrls[p.id] ?? p.affiliateUrl;
            const currentAff = rawAff.replace('clarice-variedades', settings.mlAffiliateTag);
            const isApproving = approvingId === p.id;
            const isSelected = selectedRadarIds.has(p.id);

            return (
              <div
                key={p.id}
                className={cn(
                  'rounded-2xl border p-4 transition flex flex-col gap-3.5',
                  isSelected
                    ? 'border-cyan-400/60 bg-cyan-950/30 ring-1 ring-cyan-400/30'
                    : 'border-white/10 bg-zinc-900/70 hover:border-cyan-400/30'
                )}
              >
                <div className="flex flex-col sm:flex-row gap-3.5 items-start sm:items-center">
                  {/* Checkbox Individual Radar */}
                  <div className="flex items-center self-center pr-0.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectRadar(p.id)}
                      aria-label={`Selecionar ${p.title}`}
                      className="h-4 w-4 rounded border-white/20 bg-zinc-950 text-cyan-400 focus:ring-2 focus:ring-cyan-400/40 cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <img
                    src={p.imageUrl}
                    alt={p.title}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = FALLBACK_IMAGE;
                    }}
                    className="h-16 w-16 shrink-0 rounded-xl object-contain bg-white/5 p-1 border border-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded-md">
                        {p.mlbId}
                      </span>
                      <span className="text-[10px] text-zinc-400">{p.category}</span>
                      {p.freeShipping && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md">
                          Frete Grátis
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md">
                        {p.discountPercent}% OFF
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-zinc-100 mt-1 line-clamp-2">{p.title}</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-sm font-extrabold text-zinc-100">{formatBRL(p.currentPrice)}</span>
                      {p.originalPrice > p.currentPrice && (
                        <span className="text-xs text-zinc-500 line-through">{formatBRL(p.originalPrice)}</span>
                      )}
                      <span className="text-[11px] text-zinc-400">({p.installmentsText})</span>
                    </div>
                  </div>
                  <a
                    href={currentAff}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 self-start sm:self-center"
                  >
                    Ver no ML <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/5">
                  <div className="flex-1">
                    <input
                      className={cn(field, 'text-xs font-mono py-1.5')}
                      value={currentAff}
                      onChange={(e) => setAffiliateUrls((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      placeholder="Link de afiliado final (ex: https://mercadolivre.com/...)"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(p)}
                      disabled={isApproving}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-3.5 py-2 text-xs font-bold transition disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {isApproving ? 'Publicando...' : 'Aprovar e Publicar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(p)}
                      title="Descartar produto da fila"
                      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-zinc-800/80 p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SettingsTab({
  pendingCount,
  activeCount,
  onSyncRadar,
}: {
  pendingCount: number;
  activeCount: number;
  onSyncRadar?: (tag?: string) => Promise<any> | void;
}) {
  const [settings, updateSettings] = useStoreSettings();
  const [affTag, setAffTag] = useState(settings.mlAffiliateTag);
  const [whatsNum, setWhatsNum] = useState(settings.whatsappNumber);
  const [vipUrl, setVipUrl] = useState(settings.whatsappVipGroupUrl);
  const [pin, setPin] = useState(settings.adminPin);
  const [showPin, setShowPin] = useState(false);

  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<string | null>(null);
  const [testingEdge, setTestingEdge] = useState(false);
  const [edgeStatus, setEdgeStatus] = useState<string | null>(null);
  const [syncingRadar, setSyncingRadar] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    setAffTag(settings.mlAffiliateTag);
    setWhatsNum(settings.whatsappNumber);
    setVipUrl(settings.whatsappVipGroupUrl);
    setPin(settings.adminPin);
  }, [settings]);

  // Alerta Poka-Yoke de Placeholders
  const isDemoWhatsApp =
    !whatsNum ||
    whatsNum.includes('999999999') ||
    whatsNum === '5511999999999';

  const isDemoVip =
    !vipUrl ||
    vipUrl.includes('ClariceAchadinhos') ||
    vipUrl.includes('Exemplo') ||
    vipUrl.trim() === '';

  const hasPokaYokeAlert = isDemoWhatsApp || isDemoVip;

  const handleSave = async () => {
    setSavingSettings(true);
    const cleanTag = affTag.trim() || 'clarice-achadinhos';
    const cleanNum = whatsNum.replace(/\D/g, '') || '5511999999999';
    const cleanVip = vipUrl.trim();
    const cleanPin = pin.trim() || 'clarice2026';

    try {
      await updateSettings({
        mlAffiliateTag: cleanTag,
        whatsappNumber: cleanNum,
        whatsappVipGroupUrl: cleanVip,
        adminPin: cleanPin,
      });

      toast.success('Configurações salvas e sincronizadas globalmente no Supabase!');
    } catch {
      toast.error('Erro ao persistir configurações.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleResetDefaults = async () => {
    await updateSettings(DEFAULT_STORE_SETTINGS);
    setAffTag(DEFAULT_STORE_SETTINGS.mlAffiliateTag);
    setWhatsNum(DEFAULT_STORE_SETTINGS.whatsappNumber);
    setVipUrl(DEFAULT_STORE_SETTINGS.whatsappVipGroupUrl);
    setPin(DEFAULT_STORE_SETTINGS.adminPin);
    toast.success('Configurações restauradas para os padrões oficiais!');
  };

  const handleTestSupabase = async () => {
    setTestingSupabase(true);
    try {
      const start = performance.now();
      const { count, error } = await supabase
        .from('produtos_clarice')
        .select('id', { count: 'exact', head: true });
      const duration = Math.round(performance.now() - start);

      if (error) {
        setSupabaseStatus(`Erro: ${error.message}`);
        toast.error(`Falha no banco Supabase: ${error.message}`);
      } else {
        const msg = `Conectado com sucesso (${duration}ms) • ${count ?? activeCount} produtos no banco`;
        setSupabaseStatus(msg);
        toast.success(msg);
      }
    } catch {
      setSupabaseStatus('Falha de conexão com o banco.');
      toast.error('Não foi possível conectar ao Supabase.');
    } finally {
      setTestingSupabase(false);
    }
  };

  const handleTestEdge = async () => {
    setTestingEdge(true);
    try {
      const edgeUrl =
        (import.meta.env.VITE_AI_EDGE_URL as string | undefined)?.trim() ||
        'https://tuxvpzeciwxgxhmcrprt.supabase.co/functions/v1/clarice-ai-agent';
      const start = performance.now();
      const res = await fetch(edgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'ping healthcheck' }),
      });
      const duration = Math.round(performance.now() - start);
      if (res.ok) {
        const msg = `Edge Function ativa! Status HTTP ${res.status} (${duration}ms)`;
        setEdgeStatus(msg);
        toast.success(msg);
      } else {
        const msg = `Edge Function respondeu HTTP ${res.status} (${duration}ms)`;
        setEdgeStatus(msg);
        toast.info(msg);
      }
    } catch {
      setEdgeStatus('Edge Function inacessível no momento.');
      toast.error('Edge Function inacessível.');
    } finally {
      setTestingEdge(false);
    }
  };

  const handleSyncRadar = async () => {
    if (!onSyncRadar) {
      toast.info('Radar de ofertas já sincronizado.');
      return;
    }
    setSyncingRadar(true);
    try {
      const res = await onSyncRadar(affTag.trim() || settings.mlAffiliateTag);
      if (res && typeof res === 'object' && 'message' in res) {
        toast.success(res.message);
      } else {
        toast.success(`Radar sincronizado! ${res ?? pendingCount} achadinhos na fila de aprovação.`);
      }
    } catch {
      toast.error('Erro ao sincronizar radar com o Mercado Livre.');
    } finally {
      setSyncingRadar(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header do painel unificado */}
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-cyan-400" />
          <h2 className="font-semibold text-zinc-100">Painel Unificado de Configurações & Integrações</h2>
        </div>
        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
          Central única de parâmetros operacionais da Clarice Achadinhos persistida globalmente no Supabase. Modificações refletem para todos os visitantes e dispositivos em tempo real.
        </p>
      </div>

      {/* Alerta Poka-Yoke de Placeholders */}
      {hasPokaYokeAlert && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5 text-amber-200 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <span>Alerta Poka-Yoke: Canais de Atendimento com Dados de Demonstração</span>
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            Identificamos que alguns canais de comunicação com os clientes ainda utilizam valores de exemplo. Atualize com os links e telefones definitivos antes de iniciar a divulgação pública da loja:
          </p>
          <ul className="text-xs space-y-1 list-disc list-inside text-amber-300 font-mono">
            {isDemoWhatsApp && (
              <li>
                <strong>WhatsApp de Pedidos</strong>: ainda configurado com número fictício (<code>{whatsNum || 'Vazio'}</code>).
              </li>
            )}
            {isDemoVip && (
              <li>
                <strong>Grupo VIP WhatsApp</strong>: ainda configurado com link genérico ou vazio.
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bloco 1: Tag de Afiliado Mercado Livre */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <Link2 className="h-4 w-4 text-cyan-400" />
              Tag de Afiliado Mercado Livre
            </label>
            <span className="text-[10px] font-bold text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
              matt_tool
            </span>
          </div>
          <input
            className={field}
            value={affTag}
            onChange={(e) => setAffTag(e.target.value)}
            placeholder="ex: clarice-achadinhos"
          />
          <div className="rounded-lg bg-zinc-950/70 p-2.5 border border-white/5 text-[11px] font-mono text-zinc-400 break-all leading-relaxed">
            <span className="text-zinc-500">Exemplo gerado:</span><br />
            https://produto.mercadolivre.com.br/MLB-...?matt_tool=<span className="text-emerald-400 font-bold">{affTag.trim() || 'clarice-achadinhos'}</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Aplicada automaticamente ao aprovar ofertas no Radar e ao gerar novos links no Atalho 1-Click.
          </p>
        </div>

        {/* Bloco 2: Segurança & PIN Administrativo */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <KeyRound className="h-4 w-4 text-amber-400" />
              PIN Administrativo
            </label>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
              Acesso Restrito
            </span>
          </div>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              className={cn(field, 'pr-10')}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Digite o novo PIN (ex: clarice2026)"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              aria-label={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
            >
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-zinc-400">
              Validação imediata na tela de segurança do Painel.
            </p>
            <button
              type="button"
              onClick={async () => {
                const clean = pin.trim() || 'clarice2026';
                await updateSettings({ adminPin: clean });
                toast.success(`PIN atualizado para: "${clean}" e salvo no Supabase!`);
              }}
              className="rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 px-3 py-1 text-xs font-bold transition"
            >
              Salvar PIN
            </button>
          </div>
        </div>

        {/* Bloco 3: Canais WhatsApp */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4 text-emerald-400" />
              Canais de Atendimento WhatsApp
            </label>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
              {isDemoWhatsApp || isDemoVip ? '⚠️ Demo' : '🟢 Ativo'}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              WhatsApp de Pedidos ("Peça um achadinho"):
            </label>
            <div className="flex gap-2">
              <input
                className={field}
                value={whatsNum}
                onChange={(e) => setWhatsNum(e.target.value)}
                placeholder="5511999999999"
              />
              <button
                type="button"
                onClick={() => openOrderWhatsApp('Olá Clarice! Testando o canal de pedidos via WhatsApp.')}
                className="shrink-0 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
              >
                Testar
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              Link Oficial do Grupo VIP WhatsApp:
            </label>
            <div className="flex gap-2">
              <input
                className={field}
                value={vipUrl}
                onChange={(e) => setVipUrl(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
              />
              <button
                type="button"
                onClick={() => openVipGroup()}
                className="shrink-0 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
              >
                Abrir
              </button>
            </div>
          </div>
        </div>

        {/* Bloco 4: Status do Banco & Edge Function */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <Server className="h-4 w-4 text-cyan-400" />
              Infraestrutura & IA
            </label>
            <span className="text-[10px] font-bold text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
              {isSupabaseConfigured ? '🟢 Conectado' : '🟡 Local / Mock'}
            </span>
          </div>

          <div className="rounded-xl border border-white/5 bg-zinc-950/60 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300">Banco de Dados:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                tuxvpzeciwxgxhmcrprt
              </span>
            </div>
            {supabaseStatus && (
              <p className="text-[11px] text-zinc-400 bg-zinc-900/90 p-2 rounded border border-white/5">
                {supabaseStatus}
              </p>
            )}
            <button
              type="button"
              onClick={handleTestSupabase}
              disabled={testingSupabase}
              className="w-full rounded-lg border border-white/10 bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
            >
              {testingSupabase ? 'Testando conexão...' : 'Testar Conexão Supabase'}
            </button>
          </div>

          <div className="rounded-xl border border-white/5 bg-zinc-950/60 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300">Edge Function IA:</span>
              <span className="text-cyan-300 font-bold">clarice-ai-agent</span>
            </div>
            {edgeStatus && (
              <p className="text-[11px] text-zinc-400 bg-zinc-900/90 p-2 rounded border border-white/5">
                {edgeStatus}
              </p>
            )}
            <button
              type="button"
              onClick={handleTestEdge}
              disabled={testingEdge}
              className="w-full rounded-lg border border-white/10 bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
            >
              {testingEdge ? 'Verificando Edge Function...' : 'Testar Edge Function / IA'}
            </button>
          </div>
        </div>
      </div>

      {/* Sincronização do Radar de Ofertas */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-zinc-200">Radar Autônomo de Ofertas</h3>
          </div>
          <p className="text-[11px] text-zinc-400">
            {pendingCount} achadinho(s) na fila de aprovação aguardando revisão de link de afiliado.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSyncRadar}
          disabled={syncingRadar}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-zinc-950 px-4 py-2.5 text-xs font-bold transition disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', syncingRadar && 'animate-spin')} />
          {syncingRadar ? 'Sincronizando Radar...' : '⚡ Sincronizar Radar de Ofertas Agora'}
        </button>
      </div>

      {/* Botões de Ação Final */}
      <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={savingSettings}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-5 py-3 text-sm font-bold transition shadow-lg shadow-emerald-500/10 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          {savingSettings ? 'Salvando no Supabase...' : 'Salvar Todas as Configurações'}
        </button>
        <button
          type="button"
          onClick={handleResetDefaults}
          className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
        >
          Restaurar Padrões
        </button>
      </div>
    </div>
  );
}

export function AdminSheet({ open, onOpenChange, ...rest }: AdminSheetProps) {
  const [activeTab, setActiveTab] = useState('radar');
  const tabClass =
    'rounded-lg text-xs font-semibold text-zinc-400 data-[state=active]:bg-cyan-400/15 data-[state=active]:text-cyan-300 transition';

  const pendingCount = rest.pendingProducts?.length ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-4xl overflow-y-auto border-l border-white/10 bg-zinc-950 text-zinc-100 p-4 sm:p-6"
      >
        <SheetHeader className="border-b border-white/10 pb-4 text-left">
          <div className="mb-2 h-1 w-20 rounded-full bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.8)]" />
          <SheetTitle className="text-xl font-bold text-zinc-50 sm:text-2xl">
            Painel de Controle — Clarice Achadinhos
          </SheetTitle>
          <SheetDescription className="text-xs text-zinc-400">
            Gestão simplificada do catálogo, radar de ofertas, copies e configurações unificadas • {rest.products.length} ativas • {pendingCount} no radar
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 bg-zinc-900 border border-white/10 p-1 rounded-xl gap-1">
              <TabsTrigger value="radar" className={cn(tabClass, 'relative')}>
                <Radar className="h-3.5 w-3.5 mr-1 text-cyan-400" />
                Radar ({pendingCount})
                {pendingCount > 0 && (
                  <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-cyan-400" />
                )}
              </TabsTrigger>
              <TabsTrigger value="catalog" className={tabClass}>
                Catálogo ({rest.products.length})
              </TabsTrigger>
              <TabsTrigger value="magic" className={tabClass}>
                <WandSparkles className="h-3.5 w-3.5 mr-1" /> Atalho 1-Click
              </TabsTrigger>
              <TabsTrigger value="bulk" className={tabClass}>
                Importar Lote
              </TabsTrigger>
              <TabsTrigger value="copy" className={tabClass}>
                Copy Universal
              </TabsTrigger>
              <TabsTrigger value="settings" className={tabClass}>
                <Settings className="h-3.5 w-3.5 mr-1 text-cyan-400" /> Configurações
              </TabsTrigger>
            </TabsList>

            <div className="mt-5 pb-6">
              <TabsContent value="radar" className="mt-0 focus-visible:outline-none">
                <RadarTab
                  pendingProducts={rest.pendingProducts}
                  onApprove={rest.onApprovePending}
                  onBatchApprove={rest.onBatchApprovePending}
                  onReject={rest.onRejectPending}
                  onBatchReject={rest.onBatchRejectPending}
                  onSyncRadar={rest.onSyncRadar}
                />
              </TabsContent>
              <TabsContent value="catalog" className="mt-0 focus-visible:outline-none">
                <ManageTab
                  products={rest.products}
                  onRemove={rest.onRemove}
                  onBatchRemove={rest.onBatchRemove}
                  onToggleFeatured={rest.onToggleFeatured}
                  onReset={rest.onReset}
                  onEmptyCatalog={rest.onEmptyCatalog}
                  onClearDemo={rest.onClearDemo}
                />
              </TabsContent>
              <TabsContent value="magic" className="mt-0 focus-visible:outline-none">
                <MagicTab onAdd={rest.onAdd} />
              </TabsContent>
              <TabsContent value="bulk" className="mt-0 focus-visible:outline-none">
                <BulkTab onAdd={rest.onAdd} />
              </TabsContent>
              <TabsContent value="copy" className="mt-0 focus-visible:outline-none">
                <UniversalCopyTab />
              </TabsContent>
              <TabsContent value="settings" className="mt-0 focus-visible:outline-none">
                <SettingsTab
                  pendingCount={pendingCount}
                  activeCount={rest.products.length}
                  onSyncRadar={rest.onSyncRadar}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
