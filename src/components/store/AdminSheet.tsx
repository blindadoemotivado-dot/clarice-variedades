import { useState } from 'react';
import { Copy, RotateCcw, Sparkles, Star, Trash2, Zap } from 'lucide-react';
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
const field = 'w-full rounded-lg border border-admin-border bg-admin-panel px-3 py-2 text-sm text-admin-foreground placeholder:text-admin-muted outline-none focus:ring-2 focus:ring-admin-accent';
const primary = 'flex w-full items-center justify-center gap-2 rounded-lg bg-admin-accent py-2.5 text-sm font-bold text-admin hover:bg-admin-accent-hover disabled:opacity-50';

export interface AdminSheetProps {
  open: boolean; onOpenChange: (o: boolean) => void; products: AffiliateProduct[];
  onAdd: (p: AffiliateProduct[]) => void; onRemove: (id: string) => void; onToggleFeatured: (id: string) => void; onReset: () => void;
}

function CategorySelect({ value, onChange }: { value: Cat; onChange: (c: Cat) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Cat)} className={field} aria-label="Categoria">
      {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  );
}

function MagicTab({ onAdd }: Pick<AdminSheetProps, 'onAdd'>) {
  const [url, setUrl] = useState(''); const [aff, setAff] = useState(''); const [cat, setCat] = useState<Cat>('Casa & Cozinha');
  const [ai, setAi] = useState(true); const [preview, setPreview] = useState<AffiliateProduct | null>(null);
  const publish = () => {
    const p = productFromUrl(url, cat, aff, ai);
    if (!p) return toast.error('Cole uma URL do Mercado Livre.');
    setPreview(p); onAdd([p]); setUrl(''); setAff('');
    toast.success(`${p.mlbId} publicado no topo da vitrine!`);
  };
  return (
    <div className="space-y-3">
      <input className={field} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL do produto no Mercado Livre" />
      <input className={field} value={aff} onChange={(e) => setAff(e.target.value)} placeholder="Link de afiliado (opcional)" />
      <CategorySelect value={cat} onChange={setCat} />
      <label className="flex items-center justify-between rounded-lg border border-admin-border bg-admin-panel px-3 py-2 text-sm">
        <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-admin-accent" /> Otimizar título com IA</span>
        <Switch checked={ai} onCheckedChange={setAi} />
      </label>
      <button type="button" className={primary} onClick={publish} disabled={!url.trim()}><Zap className="h-4 w-4" /> Puxar Dados do ML e Publicar</button>
      {preview && (
        <div className="flex gap-3 rounded-lg border border-admin-border bg-admin-panel p-3">
          <img src={preview.imageUrl} alt="" className="h-16 w-16 rounded object-cover" />
          <div className="min-w-0 text-xs">
            <p className="text-admin-accent">{preview.mlbId}</p>
            <p className="line-clamp-2 font-medium">{preview.title}</p>
            <p className="text-admin-muted">{formatBRL(preview.currentPrice)} • {preview.discountPercent}% OFF</p>
          </div>
        </div>
      )}
    </div>
  );
}

function BulkTab({ onAdd }: Pick<AdminSheetProps, 'onAdd'>) {
  const [text, setText] = useState(''); const [cat, setCat] = useState<Cat>('Casa & Cozinha');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const run = () => {
    const items = lines.map((l) => productFromUrl(l, cat)).filter((p): p is AffiliateProduct => p !== null);
    onAdd(items); setText('');
    toast.success(`${items.length} produtos importados para a vitrine com sucesso!`);
  };
  return (
    <div className="space-y-3">
      <textarea rows={9} className={cn(field, 'font-mono text-xs')} value={text} onChange={(e) => setText(e.target.value)} placeholder={'https://produto.mercadolivre.com.br/MLB-1234567-...\nhttps://produto.mercadolivre.com.br/MLB-7654321-...'} />
      <p className="text-xs text-admin-muted">{lines.length} link(s) detectado(s)</p>
      <CategorySelect value={cat} onChange={setCat} />
      <button type="button" className={primary} onClick={run} disabled={lines.length === 0}>Processar Lote Instantâneo</button>
    </div>
  );
}

function ManageTab({ products, onRemove, onToggleFeatured, onReset }: Omit<AdminSheetProps, 'open' | 'onOpenChange' | 'onAdd'>) {
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => { onReset(); toast.success('Catálogo padrão restaurado.'); }} className="flex w-full items-center justify-center gap-2 rounded-lg border border-admin-border py-2 text-xs font-semibold text-admin-muted hover:text-admin-foreground">
        <RotateCcw className="h-3.5 w-3.5" /> Restaurar Catálogo Padrão
      </button>
      {products.map((p) => (
        <div key={p.id} className="flex items-center gap-2 rounded-lg border border-admin-border bg-admin-panel p-2">
          <img src={p.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
          <div className="min-w-0 flex-1 text-xs">
            <p className="truncate font-medium">{p.title}</p>
            <p className="text-admin-muted">{p.mlbId} • {formatBRL(p.currentPrice)}</p>
          </div>
          <button type="button" title="Copiar Copy de Venda" aria-label="Copiar Copy de Venda" onClick={() => copyText(buildWhatsAppCopy(p), 'Copy de venda copiada!')} className="rounded p-1.5 text-admin-muted hover:text-admin-accent"><Copy className="h-4 w-4" /></button>
          <button type="button" title="Destaque" aria-label="Destaque" aria-pressed={p.featured} onClick={() => onToggleFeatured(p.id)} className={cn('rounded p-1.5', p.featured ? 'text-star' : 'text-admin-muted hover:text-star')}><Star className={cn('h-4 w-4', p.featured && 'fill-current')} /></button>
          <button type="button" title="Remover" aria-label="Remover" onClick={() => { onRemove(p.id); toast('Produto removido.'); }} className="rounded p-1.5 text-admin-muted hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

export function AdminSheet({ open, onOpenChange, ...rest }: AdminSheetProps) {
  const tab = 'rounded-md text-[11px] text-admin-muted data-[state=active]:bg-admin-accent data-[state=active]:text-admin sm:text-xs';
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-l border-admin-border bg-admin text-admin-foreground sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-admin-foreground">🔒 Painel Zizi — Backstage</SheetTitle>
          <SheetDescription className="text-admin-muted">Input Mágico & Processador em Lote • {rest.products.length} produtos ativos</SheetDescription>
        </SheetHeader>
        <Tabs defaultValue="magic" className="px-4 pb-6">
          <TabsList className="grid h-auto w-full grid-cols-3 bg-admin-panel p-1">
            <TabsTrigger value="magic" className={tab}>Input Mágico</TabsTrigger>
            <TabsTrigger value="bulk" className={tab}>Lote (Bulk)</TabsTrigger>
            <TabsTrigger value="manage" className={tab}>Disparo & Gestão</TabsTrigger>
          </TabsList>
          <TabsContent value="magic" className="mt-4"><MagicTab onAdd={rest.onAdd} /></TabsContent>
          <TabsContent value="bulk" className="mt-4"><BulkTab onAdd={rest.onAdd} /></TabsContent>
          <TabsContent value="manage" className="mt-4"><ManageTab {...rest} /></TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
