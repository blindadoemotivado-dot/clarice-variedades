import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  ArrowUp,
  BadgeCheck,
  ChevronDown,
  ExternalLink,
  Heart,
  Home,
  Lock,
  MessageCircle,
  PackageSearch,
  Search,
  Sparkles,
  Tag,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { HeroBanner } from '@/components/store/HeroBanner';
import { FeaturedDealCard } from '@/components/store/FeaturedDealCard';
import { DealsCarousel } from '@/components/store/DealsCarousel';
import { ProductCard } from '@/components/store/ProductCard';
import { ConciergeDialog, openWhatsApp } from '@/components/store/ConciergeDialog';
import { openVipGroup, useStoreSettings } from '@/lib/store-settings';
import { AdminSheet } from '@/components/store/AdminSheet';
import { AdminPinDialog } from '@/components/store/AdminPinDialog';
import { askClariceAi } from '@/services/clariceAiService';
import { useCatalog } from '@/hooks/use-catalog';
import { filterProducts, type CategoryFilter, type SortKey } from '@/lib/catalog';
import { CATEGORIES } from '@/types/product';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Clarice Achadinhos — Curadoria de Ofertas no Mercado Livre' },
      {
        name: 'description',
        content:
          'Curadoria diária de achadinhos verificados do Mercado Livre: eletrônicos, casa, cozinha, ferramentas e beleza com frete grátis e parcelamento sem juros.',
      },
      { property: 'og:title', content: 'Clarice Achadinhos — Achadinhos do Dia com Desconto Real' },
      {
        property: 'og:description',
        content:
          'Ofertas verificadas no Mercado Livre com desconto real, frete grátis e compra garantida.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: 'https://clarice-variedades.vercel.app/og-image.png' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: 'https://clarice-variedades.vercel.app/og-image.png' },
    ],
  }),
  component: Storefront,
});

const FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'Relâmpago', label: '🔥 Ofertas Relâmpago' },
  ...CATEGORIES.map((c) => ({ value: c, label: c })),
];

const ITEMS_PER_PAGE = 16;

type AiResult = Awaited<ReturnType<typeof askClariceAi>>;

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

function AiSearchPanel({
  result,
  loading,
  onClear,
}: {
  result: AiResult | null;
  loading: boolean;
  onClear: () => void;
}) {
  if (!loading && !result) return null;

  return (
    <section className="mb-6 rounded-2xl border-2 border-[#3483FA]/20 bg-white p-4 shadow-sm sm:p-5" aria-live="polite">
      {loading ? (
        <div>
          <div className="mb-3 flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-[#3483FA]/15" />
            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-800">Analisando melhores preços no Mercado Livre...</p>
              <div className="h-3 w-56 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-28 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
      ) : result ? (
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="inline-flex rounded-full bg-[#3483FA]/10 px-2.5 py-1 text-xs font-bold text-[#2968C8]">
                ✨ Recomendação IA
              </span>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-800">
                {result.conciergeMessage}
              </p>
              {result.buyingTip && (
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  <strong>Dica da Clarice:</strong> {result.buyingTip}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClear}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Limpar busca IA
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.products.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex gap-3">
                  <img src={product.imageUrl} alt={product.title} className="h-20 w-20 rounded-lg bg-white object-contain" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-semibold text-slate-800">{product.title}</p>
                    <p className="mt-1 text-sm font-extrabold text-slate-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.currentPrice)}
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-600">{product.discountPercent}% OFF</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    toast.info('Ativando link de apoio...', { description: 'Redirecionando para o ambiente seguro do ML.' });
                    window.open(product.affiliateUrl, '_blank', 'noopener,noreferrer');
                  }}
                  className="mt-3 flex w-full items-center justify-center rounded-lg bg-[#3483FA] px-3 py-2 text-xs font-bold text-white hover:bg-[#2968C8]"
                >
                  Garantir Oferta no ML
                </button>
                <p className="mt-1.5 text-center text-[10px] text-slate-500">
                  Direcionado com segurança para o ambiente oficial do Mercado Livre
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Storefront() {
  const c = useCatalog();
  const [settings] = useStoreSettings();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('Todos');
  const [sort, setSort] = useState<SortKey>('relevance');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [concierge, setConcierge] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);

  // Paginação controlada para eliminar o muro infinito
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 1000);
    return () => window.clearTimeout(timer);
  }, []);

  // Reseta a paginação ao trocar de categoria, busca ou ordenação
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [category, query, sort, favoritesOnly]);

  const visible = filterProducts(c.products, {
    query,
    category,
    sort,
    favoritesOnly,
    favorites: c.favorites,
  });

  const displayedProducts = visible.slice(0, visibleCount);
  const isBrowsingAll = category === 'Todos' && !query.trim() && !favoritesOnly;

  // 1) Achadinho do Dia: Melhor pontuação (Desconto + Avaliação + Frete Grátis)
  const achadinhoDoDia = useMemo(() => {
    if (!c.products || c.products.length === 0) return null;
    return [...c.products].sort((a, b) => {
      const scoreA = (a.discountPercent || 0) * 2 + (a.rating || 4.5) * 10 + (a.freeShipping ? 10 : 0);
      const scoreB = (b.discountPercent || 0) * 2 + (b.rating || 4.5) * 10 + (b.freeShipping ? 10 : 0);
      return scoreB - scoreA;
    })[0];
  }, [c.products]);

  // 2) Ofertas Relâmpago: Top 10 com maior % OFF (excluindo o Achadinho do Dia)
  const ofertasRelampago = useMemo(() => {
    if (!c.products) return [];
    return [...c.products]
      .filter((p) => !achadinhoDoDia || p.id !== achadinhoDoDia.id)
      .sort((a, b) => b.discountPercent - a.discountPercent)
      .slice(0, 10);
  }, [c.products, achadinhoDoDia]);

  // 3) Achadinhos Até R$ 99: Foco em compras por impulso (excluindo Achadinho do Dia E itens de Ofertas Relâmpago)
  const achadinhosAte99 = useMemo(() => {
    if (!c.products) return [];
    const usedIds = new Set<string>();
    if (achadinhoDoDia) usedIds.add(achadinhoDoDia.id);
    for (const rel of ofertasRelampago) {
      usedIds.add(rel.id);
    }

    return [...c.products]
      .filter((p) => p.currentPrice <= 99 && !usedIds.has(p.id))
      .sort((a, b) => b.discountPercent - a.discountPercent)
      .slice(0, 12);
  }, [c.products, achadinhoDoDia, ofertasRelampago]);

  const progressPercent =
    visible.length > 0
      ? Math.min(100, Math.round((Math.min(visibleCount, visible.length) / visible.length) * 100))
      : 0;

  const openSearch = () => {
    setSearchOpen(true);
    window.setTimeout(() => document.getElementById('mobile-search')?.focus(), 0);
  };

  const handleOpenAdmin = () => {
    let isAuthed = false;
    try {
      isAuthed = sessionStorage.getItem('clarice_admin_authenticated') === 'true';
    } catch {
      isAuthed = false;
    }

    if (isAuthed) {
      setAdmin(true);
    } else {
      setPinOpen(true);
    }
  };

  const runAiSearch = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!query.trim()) {
      toast.info('Digite um produto para buscar com IA.');
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      setAiResult(await askClariceAi(query.trim()));
    } catch {
      toast.error('Não foi possível analisar as ofertas agora. Tente novamente.');
    } finally {
      setAiLoading(false);
    }
  };

  const clearAiSearch = () => {
    setAiResult(null);
    setAiLoading(false);
    setQuery('');
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 overflow-x-hidden">
      {/* Header Sticky com Safe Area para Notch do iPhone */}
      <header className="sticky top-0 z-40 bg-promo pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center justify-center gap-1.5 bg-promo px-3 py-1.5 text-center text-[11px] font-semibold text-promo-foreground sm:text-xs">
          ⚡ Clarice Achadinhos • Ofertas selecionadas com redirecionamento 100% seguro para o Mercado Livre
        </div>
        <div className="border-b border-border bg-card px-4 py-3 shadow-2xs">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 md:flex-nowrap">
            <a href="/" className="flex items-center gap-2.5">
              <img
                src="/icons/icon-192x192.png"
                alt="Clarice Achadinhos"
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-[#FFE600] shadow-sm bg-[#0F172A]"
              />
              <span className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
                Clarice Achadinhos
              </span>
              <BadgeCheck className="h-5 w-5 text-ml" aria-label="Loja verificada" />
            </a>
            <div className="ml-auto flex items-center gap-2 md:order-3">
              <button
                type="button"
                onClick={() => setFavoritesOnly((value) => !value)}
                aria-pressed={favoritesOnly}
                aria-label="Meus Favoritos"
                className={cn(
                  'relative flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors',
                  favoritesOnly
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                )}
              >
                <Heart className={cn('h-5 w-5', favoritesOnly && 'fill-current')} />
                {c.favorites.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-on-brand">
                    {c.favorites.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => openVipGroup()}
                className="flex items-center gap-1.5 rounded-full bg-whatsapp px-3.5 py-2 text-xs font-bold text-on-brand shadow-xs hover:bg-whatsapp-hover"
              >
                <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">Grupo VIP</span> WhatsApp
              </button>
            </div>
            <form onSubmit={runAiSearch} className="relative w-full md:order-2 md:mx-4 md:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar produto ou código MLB..."
                aria-label="Buscar produtos"
                className="h-10 w-full rounded-full border border-border bg-muted pl-9 pr-28 text-sm outline-none focus:bg-card focus:ring-2 focus:ring-ml"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearAiSearch}
                  aria-label="Limpar busca"
                  className="absolute right-[108px] top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={aiLoading}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-[#3483FA] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#2968C8] disabled:opacity-60"
              >
                ✨ Buscar com IA
              </button>
            </form>
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="fixed inset-x-0 top-0 z-[60] border-b border-border bg-card/95 p-3 shadow-lg backdrop-blur-xl md:hidden">
          <div className="relative mx-auto max-w-lg">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="mobile-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar produto ou código MLB..."
              aria-label="Buscar produtos"
              className="h-11 w-full rounded-full border border-border bg-muted pl-9 pr-10 text-sm outline-none focus:ring-2 focus:ring-ml"
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label="Fechar busca"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        {/* 1. Hero Banner Alinhado ao Brand Book com a Mascote Clarice */}
        <HeroBanner onVip={() => openVipGroup()} />

        <AiSearchPanel result={aiResult} loading={aiLoading} onClear={clearAiSearch} />

        {/* 2. Hierarquia de Curadoria: Destaques antes da Grade Geral (exibidos na visualização padrão) */}
        {isBrowsingAll && !loading && (
          <>
            {/* ⭐ Vitrine 1: Achadinho do Dia */}
            {achadinhoDoDia && (
              <FeaturedDealCard
                product={achadinhoDoDia}
                isFavorite={c.favorites.includes(achadinhoDoDia.id)}
                onToggleFavorite={c.toggleFavorite}
              />
            )}

            {/* ⚡ Vitrine 2: Ofertas Relâmpago (Carrossel Horizontal) */}
            {ofertasRelampago.length > 0 && (
              <DealsCarousel
                carouselId="ofertas-relampago"
                title="⚡ Ofertas Relâmpago"
                subtitle="Maiores descontos verificados hoje no Mercado Livre"
                icon={<Zap className="h-4 w-4" />}
                badgeText="Até 70% OFF"
                products={ofertasRelampago}
                favorites={c.favorites}
                onToggleFavorite={c.toggleFavorite}
              />
            )}

            {/* 💸 Vitrine 3: Achadinhos Até R$ 99 (Carrossel Horizontal) */}
            {achadinhosAte99.length > 0 && (
              <DealsCarousel
                carouselId="achadinhos-ate-99"
                title="💸 Achadinhos Até R$ 99"
                subtitle="Ofertas de baixo valor para comprar sem pensar"
                icon={<Tag className="h-4 w-4" />}
                badgeText="Super Barato"
                badgeColor="bg-emerald-400 text-slate-950"
                products={achadinhosAte99}
                favorites={c.favorites}
                onToggleFavorite={c.toggleFavorite}
              />
            )}
          </>
        )}

        {/* 3. Seção "Todos os Achadinhos" com Filtros e Fim do Muro Infinito */}
        <section id="catalogo-completo" className="mt-8 border-t border-border/70 pt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base sm:text-xl font-black tracking-tight text-foreground">
                {favoritesOnly
                  ? '❤️ Meus Favoritos'
                  : query.trim()
                  ? `Resultados para "${query}"`
                  : category === 'Todos'
                  ? 'Todos os Achadinhos Verificados'
                  : `Achadinhos em ${category}`}
              </h2>
              <p className="text-xs text-muted-foreground">
                {visible.length} ofertas com preço checado e compra segura no Mercado Livre
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                aria-label="Ordenar"
                className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-ml"
              >
                <option value="relevance">Mais Relevantes</option>
                <option value="price">Menor Preço</option>
                <option value="discount">Maior Desconto %</option>
              </select>
            </div>
          </div>

          {/* Filtros em Pílulas */}
          <div className="no-scrollbar mb-5 flex items-center gap-2 overflow-x-auto pb-1">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setCategory(filter.value)}
                aria-pressed={category === filter.value}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                  category === filter.value
                    ? 'border-ml bg-ml text-on-brand shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:border-ml/50 hover:text-foreground'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">
              <PackageSearch className="h-10 w-10" />
              <p className="text-sm">Nenhum produto encontrado. Tente outra busca ou categoria.</p>
            </div>
          ) : (
            <>
              {/* Grade Paginada (inicialmente 16 produtos) */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                <AnimatePresence mode="popLayout">
                  {displayedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isFavorite={c.favorites.includes(product.id)}
                      onToggleFavorite={c.toggleFavorite}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Botão "Carregar Mais" & Contador Visível */}
              {visible.length > visibleCount && (
                <div className="mt-8 flex flex-col items-center gap-3">
                  <div className="flex flex-col items-center gap-1.5 w-full max-w-xs text-center">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Mostrando <strong className="text-foreground">{Math.min(visibleCount, visible.length)}</strong> de{' '}
                      <strong className="text-foreground">{visible.length}</strong> ofertas
                    </span>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-ml rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                    className="flex items-center gap-2 rounded-2xl bg-card border-2 border-ml/40 hover:border-ml hover:bg-ml/5 text-foreground font-black text-xs sm:text-sm px-6 py-3.5 shadow-sm transition active:scale-95"
                  >
                    <span>Carregar mais achadinhos (+16)</span>
                    <ChevronDown className="h-4 w-4 text-ml" />
                  </button>
                </div>
              )}

              {/* Mensagem ao final do catálogo */}
              {visibleCount >= visible.length && visible.length > ITEMS_PER_PAGE && (
                <div className="mt-8 flex flex-col items-center gap-2 text-center border-t border-border/40 pt-6">
                  <p className="text-xs sm:text-sm font-bold text-muted-foreground">
                    🎉 Você viu todas as {visible.length} ofertas verificadas de hoje!
                  </p>
                  <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-ml hover:underline"
                  >
                    <ArrowUp className="h-3.5 w-3.5" /> Voltar ao topo
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <footer className="mt-8 border-t border-border bg-card px-4 py-8 pb-28 md:pb-12 text-center text-xs text-muted-foreground">
        <div className="mx-auto mb-6 max-w-md rounded-2xl border border-border/80 bg-background/80 p-4 shadow-sm backdrop-blur-sm sm:p-5">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4 sm:text-left">
            <picture className="shrink-0">
              <source srcSet="/brand/selo-clarice-footer.webp" type="image/webp" />
              <img
                src="/brand/selo-clarice-footer.png"
                alt="Selo Oficial Clarice Achadinhos com Plaquinha de Desconto"
                width={80}
                height={80}
                loading="lazy"
                className="h-20 w-20 rounded-2xl border border-border object-cover shadow-sm"
              />
            </picture>
            <div className="flex-1 space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-ml/10 px-2.5 py-0.5 text-[11px] font-bold text-ml">
                <BadgeCheck className="h-3.5 w-3.5 text-ml" />
                <span>Curadoria Oficial Verificada</span>
              </div>
              <h3 className="text-sm font-bold text-foreground">Clarice Achadinhos</h3>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Garimpamos diariamente os melhores descontos do Mercado Livre com frete grátis e compra 100% segura.
              </p>
            </div>
          </div>
        </div>

        {/* Botão Amarelo de Afiliado Geral Mercado Livre */}
        <div className="mx-auto mb-6 max-w-md px-2">
          <a
            href={
              settings.generalAffiliateUrl ||
              `https://www.mercadolivre.com.br/ofertas?matt_tool=${settings.mlAffiliateTag}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-black text-sm px-5 py-3.5 shadow-lg shadow-amber-400/20 transition transform active:scale-[0.98]"
          >
            <span>Vai comprar outro produto? Abrir Mercado Livre</span>
            <ExternalLink className="h-4 w-4 shrink-0 text-slate-950" />
          </a>
          <p className="mt-2 text-[11px] text-muted-foreground/80">
            🔒 Redirecionado com segurança para o ambiente oficial do Mercado Livre
          </p>
        </div>

        <p className="mx-auto max-w-2xl">
          A Clarice Achadinhos é uma curadora afiliada oficial do Mercado Livre. Não vendemos diretamente: toda compra, pagamento, entrega e garantia acontecem no Mercado Livre. Podemos receber comissão pelas indicações, sem custo extra para você.
        </p>
        <button
          type="button"
          onClick={handleOpenAdmin}
          className="mt-4 inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 hover:text-foreground"
        >
          <Lock className="h-3 w-3" /> Painel Clarice (Admin)
        </button>
      </footer>

      {/* Navegação Inferior Mobile */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden"
      >
        <button
          type="button"
          onClick={() => {
            setCategory('Todos');
            setFavoritesOnly(false);
            setSearchOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center gap-1 text-[10px] font-semibold text-ml"
          aria-label="Início"
        >
          <Home className="h-5 w-5" />
          <span>Início</span>
        </button>
        <button
          type="button"
          onClick={openSearch}
          className="flex flex-col items-center gap-1 text-[10px] font-semibold text-muted-foreground"
          aria-label="Buscar"
        >
          <Search className="h-5 w-5" />
          <span>Busca</span>
        </button>
        <button
          type="button"
          onClick={() => setFavoritesOnly((value) => !value)}
          className="relative flex flex-col items-center gap-1 text-[10px] font-semibold text-muted-foreground"
          aria-label="Favoritos"
        >
          <Heart className={cn('h-5 w-5', favoritesOnly && 'fill-destructive text-destructive')} />
          <span>Favoritos</span>
          {c.favorites.length > 0 && (
            <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-card" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setConcierge(true)}
          className="flex flex-col items-center gap-1 text-[10px] font-semibold text-whatsapp"
          aria-label="Ajuda no WhatsApp"
        >
          <MessageCircle className="h-5 w-5" />
          <span>Ajuda</span>
        </button>
      </nav>

      {/* Botão Flutuante Desktop */}
      <div className="group fixed bottom-6 right-6 z-40 hidden md:block">
        <div className="pointer-events-none absolute bottom-full right-0 mb-2 translate-y-1 whitespace-nowrap rounded-lg bg-foreground px-3 py-2 text-xs font-medium text-background opacity-0 shadow-lg transition-all group-hover:translate-y-0 group-hover:opacity-100">
          Precisa de outro produto?
        </div>
        <button
          type="button"
          onClick={() => setConcierge(true)}
          aria-label="Falar com a Clarice no WhatsApp"
          className="flex items-center gap-2 rounded-full bg-whatsapp px-4 py-3 text-on-brand shadow-lg hover:bg-whatsapp-hover"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-semibold">Peça um achadinho</span>
        </button>
      </div>

      <ConciergeDialog open={concierge} onOpenChange={setConcierge} />
      <AdminPinDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        onSuccess={() => setAdmin(true)}
      />
      <AdminSheet
        open={admin}
        onOpenChange={setAdmin}
        products={c.products}
        pendingProducts={c.pendingProducts}
        onAdd={c.add}
        onRemove={c.remove}
        onBatchRemove={c.batchRemove}
        onToggleFeatured={c.toggleFeatured}
        onReset={c.reset}
        onEmptyCatalog={c.emptyCatalog}
        onClearDemo={c.clearDemoProducts}
        onApprovePending={c.approveProduct}
        onBatchApprovePending={c.batchApprovePending}
        onRejectPending={c.rejectPending}
        onBatchRejectPending={c.batchRejectPending}
        onSyncRadar={c.syncRadar}
      />
      <Toaster position="bottom-center" richColors />
    </div>
  );
}
