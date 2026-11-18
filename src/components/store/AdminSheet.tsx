import { useState } from 'react';
import { Copy, ExternalLink, FileText, Link2, RotateCcw, Sparkles, Star, Trash2, WandSparkles, Zap } from 'lucide-react';
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
const field = 'w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20';
const primary = 'flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-cyan-300 disabled:opacity-50';

export interface AdminSheetProps {
  open: boolean; onOpenChange: (o: boolean) => void; products: AffiliateProduct[];
  onAdd: (p: AffiliateProduct[]) => void; onRemove: (id: string) => void; onToggleFeatured: (id: string) => void; onReset: () => void;
}

function CategorySelect({ value, onChange }: { value: Cat; onChange: (c: Cat) => void }) {
  return <select value={value} onChange={(e) => onChange(e.target.value as Cat)} className={field} aria-label="Categoria">{CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select>;
}

function MagicTab({ onAdd }: Pick<AdminSheetProps, 'onAdd'>) {
  const [url, setUrl] = useState('');
  const [aff, setAff] = useState('');
  const [cat, setCat] = useState<Cat>('Casa & Cozinha');
  const [ai, setAi] = useState(true);
  const [preview, setPreview] = useState<AffiliateProduct | null>(null);
  const publish = () => {
    const p = productFromUrl(url, cat, aff, ai);
    if (!p) { toast.error('Cole uma URL do Mercado Livre.'); return; }
    setPreview(p); onAdd([p]); setUrl(''); setAff('');
    toast.success('Produto publicado com sucesso!');
  };
  return <div className="space-y-3">
    <input className={field} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL do produto no Mercado Livre" />
    <input className={field} value={aff} onChange={(e) => setAff(e.target.value)} placeholder="Link de afiliado (opcional)" />
    <CategorySelect value={cat} onChange={setCat} />
    <label className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-sm text-zinc-200"><span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-cyan-300" /> Otimizar título com IA</span><Switch checked={ai} onCheckedChange={setAi} /></label>
    <button type="button" className={primary} onClick={publish} disabled={!url.trim()}><Zap className="h-4 w-4" /> Processar e publicar</button>
    {preview && <div className="flex gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3"><img src={preview.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" /><div className="min-w-0 text-xs"><p className="text-cyan-300">{preview.mlbId}</p><p className="line-clamp-2 font-medium text-zinc-100">{preview.title}</p><p className="mt-1 text-zinc-500">{formatBRL(preview.currentPrice)} • {preview.discountPercent}% OFF</p></div></div>}
  </div>;
}

function BulkTab({ onAdd }: Pick<AdminSheetProps, 'onAdd'>) {
  const [text, setText] = useState('');
  const [cat, setCat] = useState<Cat>('Casa & Cozinha');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const run = () => { const items = lines.map((l) => productFromUrl(l, cat)).filter((p): p is AffiliateProduct => p !== null); onAdd(items); setText(''); toast.success(`${items.length} produtos importados com sucesso!`); };
  return <div className="space-y-3"><textarea rows={9} className={cn(field, 'font-mono text-xs')} value={text} onChange={(e) => setText(e.target.value)} placeholder={'https://produto.mercadolivre.com.br/MLB-1234567-...\nhttps://produto.mercadolivre.com.br/MLB-7654321-...'} /><p className="text-xs text-zinc-500">{lines.length} link(s) detectado(s)</p><CategorySelect value={cat} onChange={setCat} /><button type="button" className={primary} onClick={run} disabled={lines.length === 0}>Importar lote</button></div>;
}

function ManageTab({ products, onRemove, onToggleFeatured, onReset }: Omit<AdminSheetProps, 'open' | 'onOpenChange' | 'onAdd'>) {
  return <div className="space-y-3"><button type="button" onClick={() => { onReset(); toast.success('Catálogo padrão restaurado.'); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-xs font-semibold text-zinc-400 hover:text-zinc-100"><RotateCcw className="h-3.5 w-3.5" /> Restaurar catálogo padrão</button><div className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">{products.map((p) => <div key={p.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/70 p-2.5"><img src={p.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-zinc-100">{p.title}</p><p className="mt-1 text-[11px] text-zinc-500">{p.mlbId} • {formatBRL(p.currentPrice)}</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => copyText(p.affiliateUrl, 'Copiado com sucesso!')} className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200"><Link2 className="h-3 w-3" /> Copiar link</button><button type="button" onClick={() => copyText(buildWhatsAppCopy(p), 'Copiado com sucesso!')} className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 hover:text-emerald-200"><FileText className="h-3 w-3" /> Gerar WhatsApp</button></div></div><button type="button" onClick={() => onToggleFeatured(p.id)} aria-label="Alternar destaque" className={cn('rounded-lg p-1.5', p.featured ? 'text-amber-300' : 'text-zinc-500 hover:text-amber-300')}><Star className={cn('h-4 w-4', p.featured && 'fill-current')} /></button><button type="button" onClick={() => { onRemove(p.id); toast('Produto removido.'); }} aria-label="Remover produto" className="rounded-lg p-1.5 text-zinc-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button></div>)}</div></div>;
}

export function AdminSheet({ open, onOpenChange, ...rest }: AdminSheetProps) {
  const [tab, setTab] = useState('magic');
  const tabClass = 'rounded-lg text-xs text-zinc-400 data-[state=active]:bg-cyan-400/15 data-[state=active]:text-cyan-300';
  const universalCopy = '✨ *ACHADINHOS CLARICE VARIEDADES*\n\nSelection of the best offers with real discounts, careful curation and secure redirection to Mercado Livre.\n\n🛍️ Click the product you want and make your purchase directly on the official Mercado Livre website or app.\n\n⚡ Updated offers • 🔒 Secure redirect • 🚀 Fast delivery'; 
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="w-full overflow-y-auto border-l border-white/10 bg-zinc-950 text-zinc-100 sm:max-w-6xl"><SheetHeader className="border-b border-white/10 pb-5"><div className="mb-2 h-1 w-20 rounded-full bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.8)]" /><SheetTitle className="text-xl font-bold text-zinc-50 sm:text-2xl">Painel de Controle - Clarice Variedades</SheetTitle><SheetDescription className="text-zinc-500">Gestão de catálogo, imports e copy de vendas • {rest.products.length} produtos ativos</SheetDescription></SheetHeader><div className="grid gap-5 px-4 pb-8 pt-5 lg:grid-cols-3"><aside className="space-y-4 lg:col-span-1"><section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 shadow-2xl"><div className="mb-3 flex items-center gap-2"><WandSparkles className="h-5 w-5 text-cyan-300" /><h2 className="font-semibold text-zinc-100">Atalho Mágico</h2></div><MagicTab onAdd={rest.onAdd} /></section><section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 shadow-2xl"><div className="mb-3 flex items-center gap-2"><Copy className="h-5 w-5 text-emerald-300" /><h2 className="font-semibold text-zinc-100">Gerador de Copy Universal</h2></div><p className="mb-3 text-xs leading-relaxed text-zinc-500">Presentation text ready to share with your audience on WhatsApp.</p><button type="button" onClick={() => copyText(universalCopy, 'Copiado com sucesso!')} className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-400/15"><Copy className="h-4 w-4" /> Copiar apresentação</button></section></aside><section className="min-w-0 rounded-2xl border border-white/10 bg-zinc-900/60 p-4 shadow-2xl lg:col-span-2"><Tabs value={tab} onValueChange={setTab}><TabsList className="grid h-auto w-full grid-cols-2 bg-zinc-800/80 p-1"><TabsTrigger value="magic" className={tabClass}>Catálogo ativo</TabsTrigger><TabsTrigger value="bulk" className={tabClass}>Importação em lote</TabsTrigger></TabsList><TabsContent value="magic" className="mt-4"><ManageTab {...rest} /></TabsContent><TabsContent value="bulk" className="mt-4"><BulkTab onAdd={rest.onAdd} /></TabsContent></Tabs></section></div></SheetContent></Sheet>;
}
