import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Lock, MessageCircle, PackageSearch } from 'lucide-react';
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

function Storefront() {
  const c = useCatalog();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('Todos');
  const [sort, setSort] = useState<SortKey>('relevance');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [concierge, setConcierge] = useState(false);
  const [admin, setAdmin] = useState(false);
  const visible = filterProducts(c.products, { query, category, sort, favoritesOnly, favorites: c.favorites });

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader query={query} onQuery={setQuery} favCount={c.favorites.length} favoritesOnly={favoritesOnly}
        onToggleFavorites={() => setFavoritesOnly((v) => !v)} onVip={() => openWhatsApp('Olá! Quero entrar no Grupo VIP da Clarice Variedades 🛍️')} />
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
        {visible.length === 0 ? (
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
      <footer className="mt-8 border-t border-border bg-card px-4 py-8 pb-24 text-center text-xs text-muted-foreground">
        <p className="mx-auto max-w-2xl">
          A Clarice Variedades é uma curadora afiliada oficial do Mercado Livre. Não vendemos diretamente: toda compra, pagamento, entrega e garantia acontecem no Mercado Livre. Podemos receber comissão pelas indicações, sem custo extra para você.
        </p>
        <button type="button" onClick={() => setAdmin(true)} className="mt-4 inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 hover:text-foreground">
          <Lock className="h-3 w-3" /> Painel Clarice (Admin)
        </button>
      </footer>
      <button type="button" onClick={() => setConcierge(true)} aria-label="Falar com a Clarice no WhatsApp"
        className="fixed bottom-16 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 rounded-full bg-whatsapp p-3.5 text-on-brand shadow-lg hover:bg-whatsapp-hover">
        <MessageCircle className="h-5 w-5" /> <span className="hidden text-sm font-semibold sm:inline">Peça um achadinho</span>
      </button>
      <ConciergeDialog open={concierge} onOpenChange={setConcierge} />
      <AdminSheet open={admin} onOpenChange={setAdmin} products={c.products} onAdd={c.add} onRemove={c.remove} onToggleFeatured={c.toggleFeatured} onReset={c.reset} />
      <Toaster position="top-center" richColors />
    </div>
  );
}
