import { BadgeCheck, Heart, MessageCircle, Search, ShoppingBag, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StoreHeaderProps {
  query: string;
  onQuery: (q: string) => void;
  favCount: number;
  favoritesOnly: boolean;
  onToggleFavorites: () => void;
  onVip: () => void;
}

export function StoreHeader({ query, onQuery, favCount, favoritesOnly, onToggleFavorites, onVip }: StoreHeaderProps) {
  return (
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
              className="h-10 w-10 rounded-full object-cover ring-2 ring-[#FFE600] shadow-sm bg-[#0F172A]"
            />
            <span className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">Clarice Achadinhos</span>
            <BadgeCheck className="h-5 w-5 text-ml" aria-label="Loja verificada" />
          </a>
          <div className="ml-auto flex items-center gap-2 md:order-3">
            <button
              type="button"
              onClick={onToggleFavorites}
              aria-pressed={favoritesOnly}
              aria-label="Meus Favoritos"
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors',
                favoritesOnly ? 'bg-destructive/10 text-destructive' : 'bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              <Heart className={cn('h-5 w-5', favoritesOnly && 'fill-current')} />
              {favCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-on-brand">
                  {favCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onVip}
              className="flex items-center gap-1.5 rounded-full bg-whatsapp px-3.5 py-2 text-xs font-bold text-on-brand shadow-xs hover:bg-whatsapp-hover"
            >
              <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">Grupo VIP</span> WhatsApp
            </button>
          </div>
          <div className="relative w-full md:order-2 md:mx-4 md:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Buscar produto ou código MLB..."
              aria-label="Buscar produtos"
              className="h-10 w-full rounded-full border border-border bg-muted pl-9 pr-8 text-sm outline-none focus:bg-card focus:ring-2 focus:ring-ml"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQuery('')}
                aria-label="Limpar busca"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
