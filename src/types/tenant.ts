export type Marketplace = 'mercadolivre' | 'shopee';

export type SubscriptionPlan = 'start' | 'pro' | 'advanced';
export type SubscriptionStatus = 'ativo' | 'trial' | 'inadimplente' | 'suspenso' | 'pendente';

export interface LojaAfiliado {
  id: string;
  slug: string;
  nomeLoja: string;
  subtitulo?: string;
  corPrimaria: string;
  corDestaque: string;
  logoUrl?: string;
  heroMascoteUrl?: string;
  whatsappVipUrl?: string;
  instagramUrl?: string;
  plano: SubscriptionPlan;
  statusAssinatura: SubscriptionStatus;
  vencimentoEm?: string;
  shopeeAppId?: string;
  shopeeSecret?: string;
  ownerEmail?: string;
  ownerPassword?: string;
  ownerUserId?: string;
  asaasCustomerId?: string;
  asaasSubscriptionId?: string;
  asaasPaymentUrl?: string;
  dominioCustomizado?: string;
  whatsappContato?: string;
  cpfCnpj?: string;
  createdAt?: string;
}

export const PLANO_PRICES: Record<SubscriptionPlan, { name: string; price: string; value: number }> = {
  start: { name: 'Start', price: 'R$ 67/mês', value: 67 },
  pro: { name: 'Pro', price: 'R$ 117/mês', value: 117 },
  advanced: { name: 'Advanced', price: 'R$ 197/mês', value: 197 },
};

export const DEFAULT_CLARICE_STORE: LojaAfiliado = {
  id: '00000000-0000-0000-0000-000000000001',
  slug: 'clarice',
  nomeLoja: 'Clarice Achadinhos',
  subtitulo: 'Curadoria diária de achadinhos no Mercado Livre e Shopee',
  corPrimaria: '#0F172A',
  corDestaque: '#FFE600',
  logoUrl: '/icons/icon-192x192.png',
  heroMascoteUrl: '/brand/clarice-hero.png',
  whatsappVipUrl: 'https://chat.whatsapp.com/IXxtNFu9ZppJkYFx1Jdk7o',
  instagramUrl: 'https://instagram.com/clariceachadinhos',
  plano: 'advanced',
  statusAssinatura: 'ativo',
  ownerEmail: 'admin@clariceachadinhos.com.br',
  whatsappContato: '5511999999999',
};
