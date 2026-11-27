import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  ArrowUp,
  BadgeCheck,
  ChevronDown,
  Clock,
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
import { askClariceAi } from '@/services/clariceAiService';
import { useCatalog } from '@/hooks/use-catalog';
import { applyStoreAffiliateTracking } from '@/utils/affiliateUrl';
import { useTenant } from '@/hooks/use-tenant';
import { fetchStoreBySlug } from '@/services/tenantService';
import { filterProducts, deduplicateProducts, type CategoryFilter, type SortKey, type MarketplaceFilter } from '@/lib/catalog';
import { CATEGORIES } from '@/types/product';
import { cn } from '@/lib/utils';
import { InstallHeaderButton } from '@/components/pwa/InstallAppPrompt';

interface IndexSearchParams {
  loja?: string;
  produto?: string;
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): IndexSearchParams => {
    return {
      loja:
        typeof search.loja === 'string' && search.loja.trim()
          ? search.loja.trim().toLowerCase()
          : undefined,
      produto:
        typeof search.produto === 'string' && search.produto.trim()
          ? search.produto.trim()
          : undefined,
    };
  },
  loaderDeps: ({ search: { loja } }) => ({ loja }),
  loader: async ({ deps: { loja } }) => {
    const slug = (loja || 'clarice').trim().toLowerCase();
    try {
      const store = await fetchStoreBySlug(slug);
      return { store };
    } catch {
      return { store: null };
    }
  },
  head: ({ loaderData, search }) => {
    const store = loaderData?.store;
    const slug = (search?.loja || store?.slug || 'clarice').trim().toLowerCase();
    const isClarice = slug === 'clarice';

    const storeName = store?.nomeLoja || (isClarice ? 'Clarice Achadinhos' : slug);
    const title = isClarice
      ? 'Clarice Achadinhos — Melhores Ofertas do Mercado Livre e Shopee'
      : `${storeName} — Achadinhos e Ofertas Selecionadas`;

    const description = isClarice
      ? 'Curadoria diária de achadinhos verificados do Mercado Livre e Shopee com frete grátis e compra 100% segura.'
      : `Confira as melhores ofertas selecionadas por ${storeName} no Mercado Livre e Shopee com compra garantida.`;

    // Ordem de prioridade para imagem OG (White-Label):
    // 1. loja.heroMascoteUrl / banner_url (se existir e for URL HTTPS válida);
    // 2. loja.logoUrl (se existir e for URL HTTPS válida);
    // 3. Fallback dinâmico white-label: https://clariceachadinhos.vercel.app/api/og?loja=${encodeURIComponent(slug)}
    let ogImage = '';
    const isValidHttpUrl = (url?: string) =>
      typeof url === 'string' &&
      (url.startsWith('https://') || url.startsWith('http://')) &&
      !url.includes('clarice-hero') &&
      !url.includes('icon-192x192');

    if (isClarice) {
      ogImage = 'https://clariceachadinhos.vercel.app/og-image.png';
    } else if (isValidHttpUrl(store?.heroMascoteUrl)) {
      ogImage = store!.heroMascoteUrl!;
    } else if (isValidHttpUrl(store?.logoUrl)) {
      ogImage = store!.logoUrl!;
    } else {
      ogImage = `https://clariceachadinhos.vercel.app/api/og?loja=${encodeURIComponent(slug)}`;
    }

    const currentUrl = isClarice
      ? 'https://clariceachadinhos.vercel.app'
      : `https://clariceachadinhos.vercel.app/?loja=${encodeURIComponent(slug)}`;

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: storeName },
        { property: 'og:url', content: currentUrl },
        { property: 'og:image', content: ogImage },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: ogImage },
      ],
      links: [
        { rel: 'canonical', href: currentUrl },
      ],
    };
  },
  component: Storefront,
});

const FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'Relâmpago', label: '🔥 Ofertas Relâmpago' },
  ...CATEGORIES.map((c) => ({ value: c, label: c })),
];

const ITEMS_PER_PAGE = 16;

function getStoreInitials(name: string): string {
  if (!name) return 'LO';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

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
                <a
                  href={product.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    toast.info('Ativando link de apoio...', { description: 'Redirecionando para o ambiente seguro da oferta.' });
                  }}
                  className="mt-3 flex min-h-[44px] h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-slate-950 font-extrabold text-xs sm:text-sm shadow-md transition active:scale-[0.98]"
                >
                  <span>Ver oferta</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Storefront() {
  const search = Route.useSearch();
  const searchSlug = search.loja?.toLowerCase();
  const { store, isSuspended, loading: tenantLoading } = useTenant(searchSlug);
  const c = useCatalog(store.slug);
  const [settings] = useStoreSettings();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('Todos');
  const [marketplaceFilter, setMarketplaceFilter] = useState<MarketplaceFilter>('todos');
  const [sort, setSort] = useState<SortKey>('relevance');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [concierge, setConcierge] = useState(false);
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

  // Sincroniza o título do documento com a loja parceira ativa
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (store.slug !== 'clarice') {
        document.title = `${store.nomeLoja || 'Minha Vitrine'} — Ofertas & Achadinhos`;
      } else {
        document.title = 'Clarice Achadinhos — Curadoria de Ofertas no Mercado Livre';
      }
    }
  }, [store.slug, store.nomeLoja]);

  // Reseta a paginação ao trocar de categoria, busca ou ordenação
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [category, marketplaceFilter, query, sort, favoritesOnly]);

  // Rola suavemente até o produto se houver ?produto=ID na URL (link do Disparador VIP)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const prodParam = params.get('produto');
    if (prodParam && c.products.length > 0) {
      const target = c.products.find((p) => p.id === prodParam || p.mlbId === prodParam);
      if (target) {
        const targetIndex = c.products.findIndex((p) => p.id === target.id);
        if (targetIndex >= visibleCount) {
          setVisibleCount(targetIndex + 8);
        }
        setTimeout(() => {
          const el = document.getElementById(`produto-${target.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-4', 'ring-[#FFE600]', 'transition-all');
            setTimeout(() => {
              el.classList.remove('ring-4', 'ring-[#FFE600]');
            }, 3000);
          }
        }, 400);
      }
    }
  }, [c.products]);

  // Garante isolamento estrito de tags de afiliado em tempo de execução e deduplicação inteligente para a vitrine ativa
  const trackedProducts = useMemo(() => {
    if (!c.products || c.products.length === 0) return [];
    const mapped = c.products.map((p) => {
      const tracking = applyStoreAffiliateTracking(p.affiliateUrl, store);
      return tracking.tracked && tracking.finalUrl !== p.affiliateUrl
        ? { ...p, affiliateUrl: tracking.finalUrl }
        : p;
    });
    return deduplicateProducts(mapped);
  }, [c.products, store]);

  const hasBothMarketplaces = useMemo(() => {
    if (!trackedProducts || trackedProducts.length === 0) return false;
    const hasML = trackedProducts.some((p) => !p.marketplace || p.marketplace === 'mercadolivre');
    const hasShopee = trackedProducts.some((p) => p.marketplace === 'shopee');
    return hasML && hasShopee;
  }, [trackedProducts]);

  const visible = filterProducts(trackedProducts, {
    query,
    category,
    sort,
    favoritesOnly,
    favorites: c.favorites,
    marketplaceFilter,
  });

  const displayedProducts = visible.slice(0, visibleCount);
  const isBrowsingAll = category === 'Todos' && !query.trim() && !favoritesOnly;

  // 1) Achadinho do Dia: Melhor pontuação (Desconto + Avaliação + Frete Grátis)
  const achadinhoDoDia = useMemo(() => {
    if (!trackedProducts || trackedProducts.length === 0) return null;
    return [...trackedProducts].sort((a, b) => {
      const scoreA = (a.discountPercent || 0) * 2 + (a.rating || 4.5) * 10 + (a.freeShipping ? 10 : 0);
      const scoreB = (b.discountPercent || 0) * 2 + (b.rating || 4.5) * 10 + (b.freeShipping ? 10 : 0);
      return scoreB - scoreA;
    })[0];
  }, [trackedProducts]);

  // 2) Ofertas Relâmpago: Top 10 com maior % OFF (excluindo o Achadinho do Dia)
  const ofertasRelampago = useMemo(() => {
    if (!trackedProducts) return [];
    return [...trackedProducts]
      .filter((p) => !achadinhoDoDia || p.id !== achadinhoDoDia.id)
      .sort((a, b) => b.discountPercent - a.discountPercent)
      .slice(0, 10);
  }, [trackedProducts, achadinhoDoDia]);

  // 3) Achadinhos Até R$ 99: Foco em compras por impulso (excluindo Achadinho do Dia E itens de Ofertas Relâmpago)
  const achadinhosAte99 = useMemo(() => {
    if (!trackedProducts) return [];
    const usedIds = new Set<string>();
    if (achadinhoDoDia) usedIds.add(achadinhoDoDia.id);
    for (const rel of ofertasRelampago) {
      usedIds.add(rel.id);
    }

    return [...trackedProducts]
      .filter((p) => p.currentPrice <= 99 && !usedIds.has(p.id))
      .sort((a, b) => b.discountPercent - a.discountPercent)
      .slice(0, 12);
  }, [trackedProducts, achadinhoDoDia, ofertasRelampago]);

  const progressPercent =
    visible.length > 0
      ? Math.min(100, Math.round((Math.min(visibleCount, visible.length) / visible.length) * 100))
      : 0;

  const openSearch = () => {
    setSearchOpen(true);
    window.setTimeout(() => document.getElementById('mobile-search')?.focus(), 0);
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

  if (isSuspended) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0F172A] px-4 text-center text-white">
        <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
            {store.statusAssinatura === 'pendente' ? <Clock className="h-8 w-8" /> : <Lock className="h-8 w-8" />}
          </div>
          <h1 className="text-xl font-black tracking-tight sm:text-2xl">
            {store.statusAssinatura === 'pendente'
              ? 'Loja em fase de ativação e revisão cadastral'
              : 'Vitrine Temporariamente Indisponível'}
          </h1>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            {store.statusAssinatura === 'pendente'
              ? `O cadastro da vitrine "${store.nomeLoja}" foi recebido e está em processo de verificação e liberação pela nossa equipe. Em breve você terá acesso às melhores ofertas com descontos verificados!`
              : 'Esta vitrine está passando por manutenção ou atualização de plano. Para falar com o suporte ou reativar o acesso, entre em contato abaixo.'}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <a
              href={store.whatsappVipUrl || (store.slug === 'clarice' ? "https://chat.whatsapp.com/IXxtNFu9ZppJkYFx1Jdk7o" : "#")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition"
            >
              <MessageCircle className="h-4 w-4" />
              Falar com o Suporte
            </a>
            <a
              href="/admin"
              className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition"
            >
              Acesso Administrativo
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Renderiza Skeleton Neutro enquanto carrega loja parceira (zero flash fantasma da Clarice)
  if (store.slug !== 'clarice' && tenantLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white">
        <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-4 py-3.5">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-800 animate-pulse border border-slate-700/50" />
              <div className="space-y-1.5">
                <div className="h-4 w-36 rounded bg-slate-800 animate-pulse" />
                <div className="h-2.5 w-48 rounded bg-slate-800/60 animate-pulse" />
              </div>
            </div>
            <div className="h-9 w-9 rounded-full bg-slate-800 animate-pulse" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-10 mb-8 animate-pulse">
            <div className="h-5 w-40 rounded-full bg-slate-800 mb-3" />
            <div className="h-7 w-64 rounded bg-slate-800 mb-2" />
            <div className="h-4 w-80 max-w-full rounded bg-slate-800/70 mb-6" />
            <div className="h-11 w-44 rounded-2xl bg-slate-800" />
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/40 p-3 sm:p-4 animate-pulse">
                <div className="aspect-square rounded-xl bg-slate-800/80 mb-3" />
                <div className="h-4 w-3/4 rounded bg-slate-800 mb-2" />
                <div className="h-3 w-1/2 rounded bg-slate-800/60 mb-4" />
                <div className="mt-auto h-9 w-full rounded-xl bg-slate-800" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 overflow-x-hidden">
      {/* Header Sticky com Safe Area para Notch do iPhone */}
      <header className="sticky top-0 z-40 bg-card pt-[env(safe-area-inset-top,0px)]">
        {/* Aviso Único no Topo: Faixa fina e discreta */}
        <div className="flex items-center justify-center gap-1.5 border-b border-border/50 bg-background/90 px-3 py-1.5 text-center text-[11px] font-medium text-muted-foreground sm:text-xs">
          <span>🔒</span>
          <span>Você será levada ao ambiente oficial do Mercado Livre ou Shopee para comprar com segurança.</span>
        </div>
        <div className="border-b border-border bg-card px-3 sm:px-4 py-2 sm:py-2.5 shadow-2xs">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
            {/* Linha Superior: Logo + Nome (Sem corte ...) à esquerda | Ações (Instalar App + Favoritos) à direita */}
            <div className="flex items-center justify-between gap-2 w-full md:w-auto">
              <a
                href={store.slug === 'clarice' ? '/' : `/?loja=${store.slug}`}
                className="flex items-center gap-2 min-w-0"
              >
                {store.logoUrl ? (
                  <img
                    src={store.logoUrl}
                    alt={store.nomeLoja}
                    width={36}
                    height={36}
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover ring-2 shadow-sm bg-[#0F172A] shrink-0"
                    style={{ borderColor: store.corDestaque || '#FFE600' }}
                  />
                ) : store.slug === 'clarice' ? (
                  <img
                    src="/icons/icon-192x192.png"
                    alt={store.nomeLoja}
                    width={36}
                    height={36}
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover ring-2 shadow-sm bg-[#0F172A] shrink-0"
                    style={{ borderColor: store.corDestaque || '#FFE600' }}
                  />
                ) : (
                  <div
                    className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full font-black text-xs text-slate-950 shadow-sm ring-2"
                    style={{
                      backgroundColor: store.corDestaque || '#FFE600',
                      borderColor: store.corPrimaria || '#0F172A',
                    }}
                    aria-label={store.nomeLoja}
                  >
                    {getStoreInitials(store.nomeLoja)}
                  </div>
                )}
                <span className="text-sm sm:text-base md:text-xl font-extrabold tracking-tight text-foreground whitespace-nowrap">
                  {store.nomeLoja}
                </span>
                <BadgeCheck className="h-4 w-4 shrink-0 text-ml sm:h-5 sm:w-5" aria-label="Loja verificada" />
              </a>

              {/* Botões de Ação no Topo Mobile e Desktop */}
              <div className="flex items-center gap-1.5 shrink-0">
                <InstallHeaderButton />
                <button
                  type="button"
                  onClick={() => setFavoritesOnly((value) => !value)}
                  aria-pressed={favoritesOnly}
                  aria-label="Meus Favoritos"
                  className={cn(
                    'relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-border transition-colors shrink-0',
                    favoritesOnly
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-card text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Heart className={cn('h-4 w-4 sm:h-5 sm:w-5', favoritesOnly && 'fill-current')} />
                  {c.favorites.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-on-brand">
                      {c.favorites.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const vip = store.whatsappVipUrl || (store.slug === 'clarice' ? 'https://chat.whatsapp.com/IXxtNFu9ZppJkYFx1Jdk7o' : '');
                    if (vip) window.open(vip, '_blank', 'noopener,noreferrer');
                  }}
                  className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-whatsapp px-3.5 py-2 text-xs font-bold text-on-brand shadow-xs hover:bg-whatsapp-hover shrink-0 cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" /> <span className="hidden lg:inline">Grupo VIP</span> WhatsApp
                </button>
              </div>
            </div>

            {/* Barra de Busca em Largura Total no Mobile */}
            <form onSubmit={runAiSearch} className="relative w-full md:mx-4 md:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar achadinhos..."
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
              placeholder="Buscar achadinhos..."
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
        {/* 1. Hero Banner Alinhado ao Brand Book com Personalização do Tenant */}
        <HeroBanner
          onVip={() => {
            const vip = store.whatsappVipUrl || (store.slug === 'clarice' ? 'https://chat.whatsapp.com/IXxtNFu9ZppJkYFx1Jdk7o' : '');
            if (vip) window.open(vip, '_blank', 'noopener,noreferrer');
          }}
          storeName={store.nomeLoja}
          mascoteUrl={store.heroMascoteUrl}
          bannerUrl={store.heroMascoteUrl}
          logoUrl={store.logoUrl}
          vipUrl={store.whatsappVipUrl || (store.slug === 'clarice' ? 'https://chat.whatsapp.com/IXxtNFu9ZppJkYFx1Jdk7o' : undefined)}
          accentColor={store.corDestaque}
          storeSlug={store.slug}
          subtitle={store.subtitulo}
        />

        <AiSearchPanel result={aiResult} loading={aiLoading} onClear={clearAiSearch} />

        {/* Estado Vazio Limpo para Lojas Parceiras sem Produtos */}
        {store.slug !== 'clarice' && !loading && c.products.length === 0 ? (
          <section className="my-10 rounded-3xl border border-border/80 bg-card p-8 sm:p-14 text-center shadow-sm">
            <div
              className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl font-black text-2xl text-slate-950 shadow-md ring-4 ring-card"
              style={{ backgroundColor: store.corDestaque || '#FFE600' }}
            >
              <PackageSearch className="h-10 w-10 text-slate-950" />
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-ml/10 px-3 py-1 text-xs font-bold text-ml mb-3">
              <span>Vitrine Oficial em Preparação</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-foreground tracking-tight max-w-lg mx-auto">
              Vitrine em preparação
            </h2>
            <p className="mt-2.5 mx-auto max-w-md text-sm sm:text-base text-muted-foreground leading-relaxed">
              Em breve os melhores achadinhos selecionados por <strong className="text-foreground">{store.nomeLoja}</strong>.
            </p>

            {store.whatsappVipUrl && (
              <div className="mt-8 flex flex-col items-center gap-2">
                <a
                  href={store.whatsappVipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] hover:bg-[#20BD5A] text-slate-950 font-black text-sm sm:text-base px-7 py-4 shadow-lg shadow-emerald-500/25 transition active:scale-[0.98]"
                >
                  <MessageCircle className="h-5 w-5 text-slate-950 shrink-0" />
                  <span>Entrar no Grupo VIP WhatsApp</span>
                </a>
                <p className="text-xs text-muted-foreground">
                  Receba as primeiras ofertas exclusivas direto no WhatsApp
                </p>
              </div>
            )}

            <div className="mt-10 pt-6 border-t border-border/60 flex flex-col items-center gap-3">
              <a
                href="/admin"
                className="inline-flex items-center gap-2 rounded-xl bg-[#FFE600] px-5 py-2.5 text-xs font-black text-slate-950 shadow-md shadow-yellow-500/20 hover:bg-yellow-400 transition active:scale-95"
              >
                <span>Cadastrar a 1ª Oferta no Painel ↗</span>
              </a>
              <p className="text-[11px] text-muted-foreground">
                É o dono desta loja? Acesse o painel para adicionar ofertas do Mercado Livre e Shopee.
              </p>
            </div>
          </section>
        ) : (
          <>
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

          {/* Filtro Rápido Opcional por Marketplace: Exibido automaticamente sempre que houver itens de ambos os marketplaces */}
          {hasBothMarketplaces && (
            <div className="mb-3.5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground mr-1">
                Marketplace:
              </span>
              <div className="inline-flex rounded-xl bg-muted/80 p-1 border border-border/70 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setMarketplaceFilter('todos')}
                  className={cn(
                    'rounded-lg px-3 py-1 text-xs font-bold transition',
                    marketplaceFilter === 'todos'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setMarketplaceFilter('mercadolivre')}
                  className={cn(
                    'rounded-lg px-3 py-1 text-xs font-bold transition flex items-center gap-1.5',
                    marketplaceFilter === 'mercadolivre'
                      ? 'bg-[#FFE600] text-slate-950 shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="h-2 w-2 rounded-full bg-[#FFE600] ring-1 ring-slate-900" />
                  Mercado Livre
                </button>
                <button
                  type="button"
                  onClick={() => setMarketplaceFilter('shopee')}
                  className={cn(
                    'rounded-lg px-3 py-1 text-xs font-bold transition flex items-center gap-1.5',
                    marketplaceFilter === 'shopee'
                      ? 'bg-[#EE4D2D] text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="h-2 w-2 rounded-full bg-[#EE4D2D] ring-1 ring-white" />
                  Shopee
                </button>
              </div>
            </div>
          )}

          {/* Filtros em Pílulas com Fixação Sticky e Indicador Visual de Deslize */}
          <div className="sticky top-[132px] md:top-[88px] z-20 -mx-3 mb-5 px-3 py-2 bg-background/95 backdrop-blur-md border-b border-border/40 sm:static sm:border-none sm:bg-transparent sm:p-0">
            <div className="relative">
              <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1 pr-8">
                {FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => {
                      try {
                        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                          navigator.vibrate?.(10);
                        }
                      } catch {}
                      setCategory(filter.value);
                    }}
                    aria-pressed={category === filter.value}
                    className={cn(
                      'shrink-0 rounded-full border px-4 min-h-[40px] h-10 flex items-center justify-center text-xs sm:text-sm font-semibold transition-colors cursor-pointer',
                      category === filter.value
                        ? 'border-yellow-400 bg-yellow-400 text-slate-950 font-black shadow-xs'
                        : 'border-border bg-card text-muted-foreground hover:border-yellow-400/50 hover:text-foreground'
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          ) : c.products.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3.5 rounded-3xl border border-dashed border-border bg-card/60 p-8 sm:p-14 text-center max-w-lg mx-auto my-6 shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/10 text-[#FFE600] border border-amber-400/20">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-foreground">
                Vitrine em Preparação!
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Esta vitrine exclusiva ainda não possui ofertas ativas. Em instantes novas promoções com curadoria do Mercado Livre e Shopee estarão no ar!
              </p>
              <a
                href="/admin"
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#FFE600] px-4 py-2.5 text-xs font-black text-slate-950 shadow-md shadow-yellow-500/20 hover:bg-yellow-400 transition active:scale-95"
              >
                <span>Cadastrar a 1ª Oferta no Painel ↗</span>
              </a>
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
                      <strong className="text-foreground">{visible.length}</strong> ofertas · Página{' '}
                      <strong className="text-foreground">{Math.ceil(Math.min(visibleCount, visible.length) / ITEMS_PER_PAGE)}</strong> de{' '}
                      <strong className="text-foreground">{Math.ceil(visible.length / ITEMS_PER_PAGE)}</strong>
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
                    onClick={() => {
                      try {
                        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                          navigator.vibrate?.(10);
                        }
                      } catch {}
                      setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
                    }}
                    className="flex items-center gap-2 rounded-2xl bg-card border-2 border-ml/40 hover:border-ml hover:bg-ml/5 text-foreground font-black text-xs sm:text-sm px-6 py-3.5 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <span>Carregar mais 16 ofertas</span>
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
          </>
        )}
      </main>

      <footer className="mt-8 border-t border-border bg-card px-4 py-8 pb-24 md:pb-12 text-center text-xs text-muted-foreground">
        {/* Identidade Compacta da Loja */}
        <div className="mx-auto mb-5 max-w-md rounded-2xl border border-border/80 bg-background/80 p-3.5 shadow-sm backdrop-blur-sm sm:p-4">
          <div className="flex items-center gap-3 text-left">
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.nomeLoja}
                width={52}
                height={52}
                className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-xl border border-border object-cover shadow-sm bg-card"
              />
            ) : store.slug === 'clarice' ? (
              <picture className="shrink-0">
                <source srcSet="/brand/selo-clarice-footer.webp" type="image/webp" />
                <img
                  src="/brand/selo-clarice-footer.png"
                  alt="Selo Oficial Clarice Achadinhos"
                  width={52}
                  height={52}
                  loading="lazy"
                  className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl border border-border object-cover shadow-sm"
                />
              </picture>
            ) : (
              <div
                className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl font-black text-lg text-slate-950 shadow-sm border border-border"
                style={{
                  backgroundColor: store.corDestaque || '#FFE600',
                }}
              >
                {getStoreInitials(store.nomeLoja)}
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-0.5">
              <h3 className="text-sm font-bold text-foreground truncate">{store.nomeLoja}</h3>
              <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                {store.subtitulo || 'Ofertas verificadas no Mercado Livre e Shopee com compra segura.'}
              </p>
            </div>
          </div>
        </div>

        {/* Botão do Grupo VIP WhatsApp */}
        <div className="mx-auto mb-5 max-w-xs">
          <button
            type="button"
            onClick={() => {
              const vip = store.whatsappVipUrl || (store.slug === 'clarice' ? 'https://chat.whatsapp.com/IXxtNFu9ZppJkYFx1Jdk7o' : '');
              if (vip) window.open(vip, '_blank', 'noopener,noreferrer');
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] active:bg-[#1DA851] text-slate-950 font-black text-xs sm:text-sm py-3 px-4 shadow-md transition active:scale-[0.98] cursor-pointer"
          >
            <MessageCircle className="h-4 w-4 text-slate-950 shrink-0 fill-current" />
            <span>Entrar no Grupo VIP WhatsApp</span>
          </button>
        </div>

        {/* CTA Claro para Criar Loja */}
        <div className="mx-auto mb-5 max-w-xs rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-4 text-center">
          <h4 className="text-xs sm:text-sm font-black text-foreground">Quer faturar com sua própria vitrine?</h4>
          <p className="mt-1 text-[11px] text-muted-foreground">Divulgue produtos do ML e Shopee com sua marca.</p>
          <a
            href="/criar-loja"
            className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs py-2 px-3 shadow-sm transition active:scale-[0.98]"
          >
            <span>Crie sua vitrine de achadinhos</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        </div>

        {/* Link Discreto para Painel da Loja */}
        <div className="mb-4">
          <a
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-foreground transition underline"
          >
            <Lock className="h-3 w-3" />
            <span>Painel da Loja</span>
          </a>
        </div>

        {/* Assinatura Oficial FCIA */}
        <div className="mt-4 pt-3 border-t border-border/40 text-[11px] text-muted-foreground/80">
          <p>© 2026 Clarice Achadinhos · Tecnologia FCIA — Profº Fernando Cabral</p>
        </div>
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
          aria-label={`Falar no WhatsApp • ${store.nomeLoja || 'Atendimento'}`}
          className="flex items-center gap-2 rounded-full bg-whatsapp px-4 py-3 text-on-brand shadow-lg hover:bg-whatsapp-hover cursor-pointer"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-semibold">Peça um achadinho</span>
        </button>
      </div>

      <ConciergeDialog
        open={concierge}
        onOpenChange={setConcierge}
        storeName={store.nomeLoja}
        whatsappNumber={store.whatsappContato || undefined}
        vipUrl={store.whatsappVipUrl || undefined}
        isPartnerStore={store.slug !== 'clarice'}
      />
      <Toaster position="bottom-center" richColors />
    </div>
  );
}
