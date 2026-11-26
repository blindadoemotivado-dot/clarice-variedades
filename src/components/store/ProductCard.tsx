import { ExternalLink, Heart, Share2, Sparkles, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import type { AffiliateProduct } from '@/types/product';
import { buildWhatsAppCopy, formatBRL } from '@/lib/catalog';
import { cn } from '@/lib/utils';

export interface ProductCardProps { product: AffiliateProduct; isFavorite: boolean; onToggleFavorite: (id: string) => void }

export async function copyText(text: string, success: string) {
  try { await navigator.clipboard.writeText(text); toast.success(success); } catch { toast.error('Não foi possível copiar. Tente novamente.'); }
}

const floatBtn = 'flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card/90 shadow-2xs backdrop-blur-xs transition-colors';

export function ProductCard({ product: p, isFavorite, onToggleFavorite }: ProductCardProps) {
  const isShopee = p.marketplace === 'shopee';
  const hasRating = (p.rating ?? 0) > 0 && (p.reviewsCount ?? 0) > 0;

  const handleLinkClick = () => {
    toast.info('Ativando link de apoio...', {
      description: isShopee
        ? 'Redirecionando para o ambiente seguro da Shopee.'
        : 'Redirecionando para o ambiente seguro do Mercado Livre.',
    });
  };

  const analysisPoints = [
    `${p.discountPercent}% de desconto sobre o preço original`,
    p.freeShipping ? 'Frete grátis informado na oferta' : 'Confira o valor final do frete no app',
    hasRating ? `Nota ${p.rating.toLocaleString('pt-BR')} com ${p.reviewsCount.toLocaleString('pt-BR')} avaliações` : 'Oferta verificada pela curadoria',
  ];

  return (
    <motion.article id={`produto-${p.id}`} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }} whileHover={{ y: -4 }}
      className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-200 hover:shadow-lg scroll-mt-24">
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden border-b border-slate-100 bg-white p-4 group">
        <img
          src={p.imageUrl}
          alt={p.title}
          loading="lazy"
          width={600}
          height={600}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/icon-192.png';
          }}
          className="h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-105"
        />
        {/* 1. Selo de Desconto Único no Canto Superior Esquerdo */}
        <div className="absolute left-2 top-2 flex items-center gap-1">
          {p.discountPercent > 0 && (
            <span className="rounded-lg bg-emerald-600 px-2 py-0.5 text-[11px] font-black uppercase text-white shadow-xs">
              -{p.discountPercent}%
            </span>
          )}
        </div>

        {/* 2. Pílula de Origem (ML ou Shopee) e Botões de Apoio no Canto Superior Direito */}
        <div className="absolute right-2 top-2 flex items-center gap-1.5">
          {isShopee ? (
            <span className="rounded-md bg-[#EE4D2D] px-2 py-0.5 text-[10px] font-extrabold uppercase text-white shadow-xs">
              Shopee
            </span>
          ) : (
            <span className="rounded-md bg-[#FFE600] px-2 py-0.5 text-[10px] font-black uppercase text-slate-950 shadow-xs">
              ML
            </span>
          )}
          <button type="button" onClick={() => onToggleFavorite(p.id)} aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} aria-pressed={isFavorite} className={cn(floatBtn, isFavorite ? 'text-destructive' : 'text-muted-foreground hover:text-destructive')}>
            <Heart className={cn('h-3.5 w-3.5', isFavorite && 'fill-current')} />
          </button>
          <button type="button" onClick={() => copyText(buildWhatsAppCopy(p), 'Copiado com sucesso!')} aria-label="Copiar oferta para WhatsApp" className={cn(floatBtn, 'text-muted-foreground hover:bg-deal-soft hover:text-deal')}>
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-2.5 sm:p-3.5">
        <div>
          {hasRating && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span>{p.rating.toLocaleString('pt-BR')}</span>
              <span className="text-muted-foreground/70">({p.reviewsCount.toLocaleString('pt-BR')})</span>
            </div>
          )}
          <h3 className="my-1 line-clamp-2 min-h-[36px] text-xs font-semibold leading-snug text-foreground/90 sm:min-h-[40px] sm:text-sm">{p.title}</h3>
          {p.originalPrice > p.currentPrice && (
            <p className="text-[11px] text-muted-foreground line-through sm:text-xs">{formatBRL(p.originalPrice)}</p>
          )}
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-black tracking-tight text-foreground sm:text-xl">{formatBRL(p.currentPrice)}</span>
          </div>
          {p.installmentsText && (
            <p className="line-clamp-1 text-[11px] text-muted-foreground mt-0.5">{p.installmentsText}</p>
          )}
          {/* 3. Frete Grátis em Verde Esmeralda apenas se real */}
          {p.freeShipping && (
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-emerald-500">
              Frete grátis {p.isFull && <span className="italic text-amber-400 font-extrabold">⚡ FULL</span>}
            </p>
          )}
        </div>

        <div className="mt-2.5 border-t border-border/60 pt-2">
          {/* Botão Único Amarelo da Marca com 'Ver oferta' em 1 linha */}
          <a
            href={p.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLinkClick}
            className="flex w-full min-h-[44px] h-11 items-center justify-center gap-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-black font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98]"
          >
            <span>Ver oferta</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>

          {/* Vale a pena rebaixado para link discreto de texto */}
          <details className="group/analysis mt-1.5 text-center">
            <summary className="cursor-pointer list-none text-xs text-zinc-500 hover:text-zinc-300 underline font-medium inline-block">
              Vale a pena?
            </summary>
            <div className="mt-2 rounded-xl bg-muted/40 p-2 text-left text-xs text-muted-foreground border border-border/50">
              <ul className="space-y-1 leading-relaxed">
                {analysisPoints.map((point) => (
                  <li key={point} className="flex gap-1.5">
                    <span className="text-yellow-400">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </div>
      </div>
    </motion.article>
  );
}
