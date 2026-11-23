import type { SubscriptionPlan } from '@/types/tenant';

export interface PlanPermissions {
  /** Quantidade máxima de produtos ativos permitidos na vitrine */
  maxProducts: number;
  /** Limite de links por lote na importação automática (0 = bloqueado) */
  batchImportLimit: number;
  /** Customização de Logo, Banner Hero e Cores (liberado em todos os planos) */
  customBranding: boolean;
  /** Modo do Disparador VIP:
   * - 'basic': 1 template padrão (Oferta Verificada)
   * - 'full': 3 templates + rastreamento 'Disparado Hoje'
   * - 'advanced': 3 templates + rastreamento + assinatura/rodapé customizável
   */
  vipDispatcherMode: 'basic' | 'full' | 'advanced';
  /** Suporte a Domínio Próprio Customizado (CNAME) */
  customDomain: boolean;
}

export const PLAN_PERMISSIONS: Record<SubscriptionPlan, PlanPermissions> = {
  start: {
    maxProducts: 50,
    batchImportLimit: 0,
    customBranding: true,
    vipDispatcherMode: 'basic',
    customDomain: false,
  },
  pro: {
    maxProducts: Infinity,
    batchImportLimit: 20,
    customBranding: true,
    vipDispatcherMode: 'full',
    customDomain: false,
  },
  advanced: {
    maxProducts: Infinity,
    batchImportLimit: 50,
    customBranding: true,
    vipDispatcherMode: 'advanced',
    customDomain: true,
  },
};

/**
 * Retorna as permissões ativas para um plano específico.
 * Se o plano não for informado ou for inválido, assume o plano 'start' como fallback seguro.
 */
export function getPlanPermissions(plano?: SubscriptionPlan | string | null): PlanPermissions {
  if (plano && plano in PLAN_PERMISSIONS) {
    return PLAN_PERMISSIONS[plano as SubscriptionPlan];
  }
  return PLAN_PERMISSIONS.start;
}

export interface PlanCardItem {
  id: SubscriptionPlan;
  name: string;
  price: string;
  value: number;
  badge?: string;
  description: string;
  features: string[];
}

export const PLAN_CARDS: PlanCardItem[] = [
  {
    id: 'start',
    name: 'Start',
    price: 'R$ 67/mês',
    value: 67,
    description: 'Ideal para quem está começando na afiliação com foco rápido.',
    features: [
      'Até 50 produtos ativos na vitrine',
      'Mercado Livre + Shopee liberados',
      'Logo, Banner Hero e cores próprias',
      'Disparador VIP básico (1 template)',
      'Grupo VIP WhatsApp integrado',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 117/mês',
    value: 117,
    badge: 'Mais Popular',
    description: 'Para afiliados que buscam escala e automação diária.',
    features: [
      'Produtos ilimitados na vitrine',
      'Importação em lote (até 20 por vez)',
      'Logo, Banner Hero e cores próprias',
      'Disparador VIP completo (3 templates)',
      'Histórico de ofertas enviadas hoje',
      'Suporte prioritário',
    ],
  },
  {
    id: 'advanced',
    name: 'Advanced',
    price: 'R$ 197/mês',
    value: 197,
    badge: 'Profissional',
    description: 'Estrutura completa com marca própria e alta conversão.',
    features: [
      'Tudo do Plano Pro incluído',
      'Produtos ilimitados na vitrine',
      'Super importação em lote (até 50 por vez)',
      'Disparador VIP com assinatura customizada',
      'Domínio próprio customizado (CNAME)',
      'Consultoria e onboarding VIP',
    ],
  },
];
