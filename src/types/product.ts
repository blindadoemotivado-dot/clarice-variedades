export type ProductCategory = 'Todos' | 'Casa & Cozinha' | 'Eletroportáteis' | 'Eletrônicos' | 'Ferramentas' | 'Beleza & Saúde';

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
  badgeText?: 'Oferta Relâmpago' | 'Mais Vendido' | 'Menor Preço';
  freeShipping: boolean;
  isFull: boolean;
  rating: number;
  reviewsCount: number;
  featured: boolean;
}

export const CATEGORIES: ProductCategory[] = ['Todos', 'Casa & Cozinha', 'Eletroportáteis', 'Eletrônicos', 'Ferramentas', 'Beleza & Saúde'];
