import type { AffiliateProduct } from '@/types/product';

const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&q=80`;
const ml = (mlb: string) => `https://www.mercadolivre.com.br/p/${mlb.replace('-', '')}`;

type Seed = Omit<AffiliateProduct, 'id' | 'affiliateUrl' | 'imageUrl' | 'freeShipping' | 'isFull' | 'featured'> & { photo: string; isFull?: boolean };

const seeds: Seed[] = [
  { mlbId: 'MLB-3491827', title: 'Fritadeira Elétrica Air Fryer Mondial Family IV 4L Preta/Inox', originalPrice: 429.9, currentPrice: 279.9, discountPercent: 35, installmentsText: 'em 6x sem juros', category: 'Casa & Cozinha', badgeText: 'Mais Vendido', photo: '1626074353765-517a681e40be', rating: 4.8, reviewsCount: 12843 },
  { mlbId: 'MLB-9928172', title: 'Smart TV 50" Crystal UHD 4K Samsung 50DU8000 Painel Dynamic', originalPrice: 3199, currentPrice: 2249, discountPercent: 30, installmentsText: 'em 10x sem juros', category: 'Eletrônicos', badgeText: 'Oferta Relâmpago', photo: '1593359677879-a4bb92f829d1', rating: 4.9, reviewsCount: 5320 },
  { mlbId: 'MLB-1182934', title: 'Jogo de Panelas Tramontina Turim 10 Peças Alumínio Antiaderente Starflon', originalPrice: 549.9, currentPrice: 349.9, discountPercent: 36, installmentsText: 'em 7x sem juros', category: 'Casa & Cozinha', badgeText: 'Mais Vendido', photo: '1556909114-f6e7ad7d3136', rating: 4.7, reviewsCount: 8912, isFull: false },
  { mlbId: 'MLB-7748291', title: 'Liquidificador Oster OLIQ610 1400W Full Jarra 3,2L 15 Velocidades', originalPrice: 319, currentPrice: 199.9, discountPercent: 37, installmentsText: 'em 4x sem juros', category: 'Eletroportáteis', badgeText: 'Menor Preço', photo: '1570222094114-d054a817e56b', rating: 4.6, reviewsCount: 3471 },
  { mlbId: 'MLB-5561928', title: 'Smartphone Motorola Moto G84 5G 256GB 16GB RAM Boost Câmera 50MP', originalPrice: 1899, currentPrice: 1349, discountPercent: 29, installmentsText: 'em 10x sem juros', category: 'Eletrônicos', badgeText: 'Oferta Relâmpago', photo: '1511707171634-5f897ff02aa9', rating: 4.8, reviewsCount: 21087 },
  { mlbId: 'MLB-6629104', title: 'Aspirador de Pó Robô Inteligente 3 em 1 Passa Pano Recarregável Bivolt', originalPrice: 699, currentPrice: 389.9, discountPercent: 44, installmentsText: 'em 8x sem juros', category: 'Eletroportáteis', badgeText: 'Mais Vendido', photo: '1518640467707-6811f4a6ab73', rating: 4.5, reviewsCount: 6204 },
  { mlbId: 'MLB-8837162', title: 'Parafusadeira e Furadeira de Impacto Bosch GSB 180-LI 18V com Maleta', originalPrice: 899, currentPrice: 589, discountPercent: 34, installmentsText: 'em 10x sem juros', category: 'Ferramentas', badgeText: 'Menor Preço', photo: '1504148455328-c376907d081c', rating: 4.9, reviewsCount: 4458, isFull: false },
  { mlbId: 'MLB-4419283', title: 'Secador de Cabelos Profissional Taiff Tourmaline Íon Cerâmica 2100W', originalPrice: 459, currentPrice: 289.9, discountPercent: 37, installmentsText: 'em 6x sem juros', category: 'Beleza & Saúde', badgeText: 'Mais Vendido', photo: '1522338140262-f46f5913618a', rating: 4.7, reviewsCount: 9733 },
];

export const MOCK_PRODUCTS: AffiliateProduct[] = seeds.map(({ photo, isFull = true, ...s }, i) => ({
  ...s,
  id: `seed-${i + 1}`,
  imageUrl: img(photo),
  affiliateUrl: ml(s.mlbId),
  freeShipping: true,
  isFull,
  featured: i < 2,
}));
