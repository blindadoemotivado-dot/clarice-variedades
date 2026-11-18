import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Heart, Home, Lock, MessageCircle, PackageSearch, Search } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { StoreHeader } from '@/components/store/StoreHeader';
import { HeroBanner } from '@/components/store/HeroBanner';
import { ProductCard } from '@/components/store/ProductCard';
import { ConciergeDialog, openWhatsApp } from '@/components/store/ConciergeDialog';
import { AdminSheet } from '@/components/store/AdminSheet';
import { useCatalog } from '@/hooks/use-catalog';
import { filterProducts, type CategoryFilter, type SortKey } from '@/lib/catalog';
import { CATEGORIES } from '@/types/product';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Clarice Variedades — Achadinhos com Desconto no Mercado Livre' },
      { name: 'description', content: 'Curadoria diária de ofertas verificadas do Mercado Livre: eletrônicos, casa, cozinha, ferramentas e beleza com frete grátis e parcelamento sem juros.' },
      { property: 'og:title', content: 'Clarice Variedades — Achadinhos do Dia' },
      { property: 'og:description', content: 'Ofertas verificadas do Mercado Livre com desconto real, frete grátis e compra garantida.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: Storefront,
});

const FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'Relâmpago', label: '🔥 Ofertas Relâmpago' },
  ...CATEGORIES.map((c) => ({ value: c, label: c })),
];

function ProductSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <div className="aspect-square animate-pulse bg-muted" />
      <div className="space-y-2 p-3.5">
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-9 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}

function Storefront() {
  const c = useCatalog();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('Todos');
  const [sort, setSort] = useState<SortKey>('relevance');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [concierge, setConcierge] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 1000);
    return () => window.clearTimeout(timer);
  }, []);

  const visible = filterProducts(c.products, { query, category, sort, favoritesOnly, favorites: c.favorites });

  const openSearch = () => {
    setSearchOpen(true);
    window.setTimeout(() => document.getElementById('mobile-search')?.focus(), 0);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <StoreHeader query={query} onQuery={setQuery} favCount={c.favorites.length} favoritesOnly={favoritesOnly}
        onToggleFavorites={() => setFavoritesOnly((v) => !v)} onVip={() => openWhatsApp('Olá! Quero entrar no Grupo VIP da Clarice Variedades 🛍️')} />

      {searchOpen && (
        <div className="fixed inset-x-0 top-0 z-[60] border-b border-border bg-card/95 p-3 shadow-lg backdrop-blur-xl md:hidden">
          <div className="relative mx-auto max-w-lg">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input id="mobile-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar produto ou código MLB..."
              aria-label="Buscar produtos" className="h-11 w-full rounded-full border border-border bg-muted pl-9 pr-10 text-sm outline-none focus:ring-2 focus:ring-ml" />
            <button type="button" onClick={() => setSearchOpen(false)} aria-label="Fechar busca" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">×</button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <HeroBanner />
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto pb-2">
            {FILTERS.map((f) => (
              <button key={f.value} type="button" onClick={() => setCategory(f.value)} aria-pressed={category === f.value}
                className={cn('shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                  category === f.value ? 'border-ml bg-ml text-on-brand' : 'border-border bg-card text-muted-foreground hover:border-ml/50')}>
                {f.label}
              </button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordenar"
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ml">
            <option value="relevance">Mais Relevantes</option>
            <option value="price">Menor Preço</option>
            <option value="discount">Maior Desconto %</option>
          </select>
        </div>
        {favoritesOnly && <p className="mb-3 text-sm font-semibold text-foreground">❤️ Meus Favoritos</p>}
        {loading ? (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => <ProductSkeleton key={index} />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">
            <PackageSearch className="h-10 w-10" />
            <p className="text-sm">Nenhum produto encontrado. Tente outra busca ou categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {visible.map((p) => <ProductCard key={p.id} product={p} isFavorite={c.favorites.includes(p.id)} onToggleFavorite={c.toggleFavorite} />)}
            </AnimatePresence>
          </div>
        )}
      </main>

      <footer className="mt-8 border-t border-border bg-card px-4 py-8 pb-10 text-center text-xs text-muted-foreground">
        <p className="mx-auto max-w-2xl">
          A Clarice Variedades é uma curadora afiliada oficial do Mercado Livre. Não vendemos diretamente: toda compra, pagamento, entrega e garantia acontecem no Mercado Livre. Podemos receber comissão pelas indicações, sem custo extra para você.
        </p>
        <button type="button" onClick={() => setAdmin(true)} className="mt-4 inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 hover:text-foreground">
          <Lock className="h-3 w-3" /> Painel Clarice (Admin)
        </button>
      </footer>

      <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden">
        <button type="button" onClick={() => { setCategory('Todos'); setFavoritesOnly(false); setSearchOpen(false); }} className="flex flex-col items-center gap-1 text-[10px] font-semibold text-ml" aria-label="Início">
          <Home className="h-5 w-5" /> <span>Início</span>
        </button>
        <button type="button" onClick={openSearch} className="flex flex-col items-center gap-1 text-[10px] font-semibold text-muted-foreground" aria-label="Buscar">
          <Search className="h-5 w-5" /> <span>Busca</span>
        </button>
        <button type="button" onClick={() => setFavoritesOnly((v) => !v)} className="relative flex flex-col items-center gap-1 text-[10px] font-semibold text-muted-foreground" aria-label="Favoritos">
          <Heart className={cn('h-5 w-5', favoritesOnly && 'fill-destructive text-destructive')} /> <span>Favoritos</span>
          {c.favorites.length > 0 && <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-card" />}
        </button>
        <button type="button" onClick={() => setConcierge(true)} className="flex flex-col items-center gap-1 text-[10px] font-semibold text-whatsapp" aria-label="Ajuda no WhatsApp">
          <MessageCircle className="h-5 w-5" /> <span>Ajuda</span>
        </button>
      </nav>

      <div className="group fixed bottom-6 right-6 z-40 hidden md:block">
        <div className="pointer-events-none absolute bottom-full right-0 mb-2 translate-y-1 whitespace-nowrap rounded-lg bg-foreground px-3 py-2 text-xs font-medium text-background opacity-0 shadow-lg transition-all group-hover:translate-y-0 group-hover:opacity-100">Precisa de outro produto?</div>
        <button type="button" onClick={() => setConcierge(true)} aria-label="Falar com a Clarice no WhatsApp" className="flex items-center gap-2 rounded-full bg-whatsapp px-4 py-3 text-on-brand shadow-lg hover:bg-whatsapp-hover">
          <MessageCircle className="h-5 w-5" /> <span className="text-sm font-semibold">Peça um achadinho</span>
        </button>
      </div>

      <ConciergeDialog open={concierge} onOpenChange={setConcierge} />
      <AdminSheet open={admin} onOpenChange={setAdmin} products={c.products} onAdd={c.add} onRemove={c.remove} onToggleFeatured={c.toggleFeatured} onReset={c.reset} />
      <Toaster position="bottom-center" richColors />
    </div>
  );
}
