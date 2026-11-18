import { useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, FileText, Link2, Radar, RotateCcw, Sparkles, Star, Trash2, WandSparkles, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { CATEGORIES, type AffiliateProduct } from '@/types/product';
import { buildWhatsAppCopy, formatBRL, productFromUrl } from '@/lib/catalog';
import { copyText } from './ProductCard';
import { cn } from '@/lib/utils';

type Cat = AffiliateProduct['category'];
const CATS = CATEGORIES.filter((c): c is Cat => c !== 'Todos');
const field =
  'w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20';
const primary =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-cyan-300 disabled:opacity-50';

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
  onToggleFeatured: (id: string) => void;
  onReset: () => void;
  pendingProducts?: AffiliateProduct[];
  onApprovePending?: (id: string, customAffiliateUrl?: string) => Promise<void> | void;
  onRejectPending?: (id: string) => Promise<void> | void;
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
  const [url, setUrl] = useState('');
  const [aff, setAff] = useState('');
  const [cat, setCat] = useState<Cat>('Casa & Cozinha');
  const [ai, setAi] = useState(true);
  const [preview, setPreview] = useState<AffiliateProduct | null>(null);

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
          <label className="flex items-center justify-between text-xs font-semibold text-zinc-300 mb-1.5">
            <span>
              <span className="text-amber-400 mr-1 font-bold">*</span>Link de Afiliado (Obrigatório)
            </span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
              🔒 Trava Ativa
            </span>
          </label>
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
          <img src={preview.imageUrl} alt="" className="h-16 w-16 rounded-lg object-contain bg-white/5" />
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
      toast.error(`🔒 Trava de Monetização: ${invalid.length} link(s) inválido(s). Todos os links no lote devem ser URLs do Mercado Livre (mercadolivre.com ou meli.la).`);
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

function ManageTab({ products, onRemove, onToggleFeatured, onReset }: Omit<AdminSheetProps, 'open' | 'onOpenChange' | 'onAdd'>) {
  const [search, setSearch] = useState('');
  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.mlbId.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3.5 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrar por nome, categoria ou código MLB..."
          className={cn(field, 'sm:max-w-xs text-xs')}
        />
        <button
          type="button"
          onClick={() => {
            onReset();
            toast.success('Catálogo padrão restaurado.');
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/80 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Restaurar catálogo padrão
        </button>
      </div>

      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">Nenhum produto encontrado neste filtro.</p>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 rounded-xl border border-white/10 bg-zinc-900/70 p-3 transition hover:border-white/20"
            >
              <img src={p.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-contain bg-white/5 p-1" />
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
                  className={cn('rounded-lg p-2 transition', p.featured ? 'text-amber-300 bg-amber-400/10' : 'text-zinc-500 hover:text-amber-300')}
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
          ))
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
  onReject,
}: {
  pendingProducts?: AffiliateProduct[];
  onApprove?: (id: string, customAffiliateUrl?: string) => Promise<void> | void;
  onReject?: (id: string) => Promise<void> | void;
}) {
  const [affiliateUrls, setAffiliateUrls] = useState<Record<string, string>>({});
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const handleApprove = async (p: AffiliateProduct) => {
    if (!onApprove) return;
    setApprovingId(p.id);
    try {
      const url = affiliateUrls[p.id] ?? p.affiliateUrl;
      await onApprove(p.id, url);
      toast.success(`"${p.title.slice(0, 32)}..." aprovado e publicado com sucesso!`);
    } catch {
      toast.error('Erro ao aprovar produto.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (p: AffiliateProduct) => {
    if (!onReject) return;
    try {
      await onReject(p.id);
      toast('Oferta removida da fila do radar.');
    } catch {
      toast.error('Erro ao descartar produto.');
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Radar className="h-5 w-5 text-cyan-400 animate-pulse" />
          <h2 className="font-semibold text-zinc-100">Radar de Ofertas do Mercado Livre</h2>
        </div>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          Garimpados automaticamente com descontos reais de no mínimo <strong>20% OFF</strong>, imagem em alta resolução e frete grátis. Revise o link de afiliado e publique na vitrine com 1 clique.
        </p>
      </div>

      {pendingProducts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 text-center text-zinc-400">
          <Radar className="h-10 w-10 mx-auto text-zinc-600 mb-2" />
          <p className="text-sm font-semibold text-zinc-300">Fila do Radar Vazia</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            Todas as ofertas encontradas já foram aprovadas ou descartadas. O radar roda automaticamente a cada 6 horas via GitHub Actions ou manualmente via terminal com <code className="bg-zinc-800 px-1 py-0.5 rounded text-cyan-300">node scripts/radar-ofertas.mjs</code>.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {pendingProducts.map((p) => {
            const currentAff = affiliateUrls[p.id] ?? p.affiliateUrl;
            const isApproving = approvingId === p.id;
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 transition hover:border-cyan-400/30 flex flex-col gap-3.5"
              >
                <div className="flex flex-col sm:flex-row gap-3.5 items-start sm:items-center">
                  <img
                    src={p.imageUrl}
                    alt={p.title}
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
                    href={p.affiliateUrl}
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
            Gestão simplificada do catálogo, radar de ofertas e copies de venda • {rest.products.length} ativas • {pendingCount} no radar
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-5 bg-zinc-900 border border-white/10 p-1 rounded-xl gap-1">
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
            </TabsList>

            <div className="mt-5 pb-6">
              <TabsContent value="radar" className="mt-0 focus-visible:outline-none">
                <RadarTab
                  pendingProducts={rest.pendingProducts}
                  onApprove={rest.onApprovePending}
                  onReject={rest.onRejectPending}
                />
              </TabsContent>
              <TabsContent value="catalog" className="mt-0 focus-visible:outline-none">
                <ManageTab {...rest} />
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
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
