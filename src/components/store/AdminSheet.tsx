import { useState } from 'react';
import { Copy, FileText, Link2, RotateCcw, Sparkles, Star, Trash2, WandSparkles, Zap } from 'lucide-react';
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

export interface AdminSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: AffiliateProduct[];
  onAdd: (p: AffiliateProduct[]) => void;
  onRemove: (id: string) => void;
  onToggleFeatured: (id: string) => void;
  onReset: () => void;
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
    const p = productFromUrl(url, cat, aff, ai);
    if (!p) {
      toast.error('Cole uma URL válida do Mercado Livre.');
      return;
    }
    setPreview(p);
    onAdd([p]);
    setUrl('');
    setAff('');
    toast.success('Produto publicado com sucesso no catálogo!');
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
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Link de Afiliado Customizado (opcional)</label>
          <input
            className={field}
            value={aff}
            onChange={(e) => setAff(e.target.value)}
            placeholder="Deixe em branco para usar a tag padrão oficial"
          />
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
        <button type="button" className={primary} onClick={publish} disabled={!url.trim()}>
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
    const items = lines
      .map((l) => productFromUrl(l, cat))
      .filter((p): p is AffiliateProduct => p !== null);
    onAdd(items);
    setText('');
    toast.success(`${items.length} produtos importados com sucesso!`);
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-5 space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Cole as URLs do Mercado Livre (uma por linha):
          </label>
          <textarea
            rows={8}
            className={cn(field, 'font-mono text-xs leading-relaxed')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'https://produto.mercadolivre.com.br/MLB-1234567-...\nhttps://produto.mercadolivre.com.br/MLB-7654321-...'}
          />
          <p className="text-xs text-zinc-400 mt-1.5">{lines.length} link(s) válido(s) identificado(s)</p>
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
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-cyan-300 bg-cyan-400/10 px-1.5 py-0.5 rounded">
                    {p.mlbId}
                  </span>
                  <span className="text-[10px] text-zinc-400">{p.category}</span>
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

export function AdminSheet({ open, onOpenChange, ...rest }: AdminSheetProps) {
  const [activeTab, setActiveTab] = useState('catalog');
  const tabClass =
    'rounded-lg text-xs font-semibold text-zinc-400 data-[state=active]:bg-cyan-400/15 data-[state=active]:text-cyan-300 transition';

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
            Gestão simplificada do catálogo, importação em lote e copies de venda • {rest.products.length} ofertas ativas
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4 bg-zinc-900 border border-white/10 p-1 rounded-xl gap-1">
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
