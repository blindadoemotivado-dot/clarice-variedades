import type { Marketplace } from './tenant';
export type { Marketplace };

export type ProductCategory = 'Todos' | 'Infantil & Bebês' | 'Casa & Cozinha' | 'Eletroportáteis' | 'Eletrônicos' | 'Ferramentas' | 'Beleza & Saúde';

export interface AffiliateProduct {
  id: string;
  mlbId: string;
  title: string;
  originalPrice: number;
  currentPrice: number;
  discountPercent: number;
  installmentsText: string;
  imageUrl: string;
  affiliateUrl: string;
  category: Exclude<ProductCategory, 'Todos'>;
  badgeText?: 'Oferta Relâmpago' | 'Mais Vendido' | 'Menor Preço' | string;
  freeShipping: boolean;
  isFull: boolean;
  rating: number;
  reviewsCount: number;
  featured: boolean;
  status?: string;
  marketplace?: Marketplace;
  lojaSlug?: string;
}

export const CATEGORIES: ProductCategory[] = ['Todos', 'Infantil & Bebês', 'Casa & Cozinha', 'Eletroportáteis', 'Eletrônicos', 'Ferramentas', 'Beleza & Saúde'];
