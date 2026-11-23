import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  DEFAULT_CLARICE_STORE,
  type LojaAfiliado,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from '@/types/tenant';

const LOCAL_STORAGE_KEY = 'clarice:saas:stores:v1';

function getLocalStores(): LojaAfiliado[] {
  if (typeof window === 'undefined') return [DEFAULT_CLARICE_STORE];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [DEFAULT_CLARICE_STORE];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // fallback
  }
  return [DEFAULT_CLARICE_STORE];
}

function saveLocalStores(stores: LojaAfiliado[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stores));
  } catch {
    // ignore
  }
}

export function mapRowToStore(row: any): LojaAfiliado {
  return {
    id: row.id,
    slug: row.slug || 'clarice',
    nomeLoja: row.nome_loja || 'Clarice Achadinhos',
    subtitulo: row.subtitulo || '',
    corPrimaria: row.cor_primaria || '#0F172A',
    corDestaque: row.cor_destaque || '#FFE600',
    logoUrl: row.logo_url || '/icons/icon-192x192.png',
    heroMascoteUrl: row.hero_mascote_url || '/brand/clarice-hero.png',
    whatsappVipUrl: row.whatsapp_vip_url || '',
    instagramUrl: row.instagram_url || '',
    plano: (row.plano as SubscriptionPlan) || 'start',
    statusAssinatura: (row.status_assinatura as SubscriptionStatus) || 'ativo',
    vencimentoEm: row.vencimento_em || undefined,
    shopeeAppId: row.shopee_app_id || '',
    shopeeSecret: row.shopee_secret || '',
    ownerEmail: row.owner_email || '',
    ownerUserId: row.owner_user_id || '',
    asaasCustomerId: row.asaas_customer_id || '',
    asaasSubscriptionId: row.asaas_subscription_id || '',
    asaasPaymentUrl: row.asaas_payment_url || '',
    dominioCustomizado: row.dominio_customizado || '',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export async function fetchStoreBySlug(slug: string = 'clarice'): Promise<LojaAfiliado> {
  const localStores = getLocalStores();
  const matchedLocal = localStores.find((s) => s.slug === slug);

  if (!isSupabaseConfigured) {
    return matchedLocal || DEFAULT_CLARICE_STORE;
  }

  try {
    const { data, error } = await supabase
      .from('lojas_afiliados')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (!error && data) {
      const store = mapRowToStore(data);
      const updated = localStores.map((s) => (s.slug === slug ? store : s));
      if (!localStores.some((s) => s.slug === slug)) {
        updated.push(store);
      }
      saveLocalStores(updated);
      return store;
    }
  } catch (err) {
    console.warn('[tenantService] Aviso ao buscar loja no Supabase, usando cache local:', err);
  }

  return matchedLocal || DEFAULT_CLARICE_STORE;
}

export async function fetchStoreByDomain(domain: string): Promise<LojaAfiliado | null> {
  if (!domain) return null;
  const cleanDomain = domain.toLowerCase().trim();

  // 1. Checa local
  const localStores = getLocalStores();
  const matchedLocal = localStores.find((s) => s.dominioCustomizado?.toLowerCase().trim() === cleanDomain);
  if (matchedLocal) return matchedLocal;

  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('lojas_afiliados')
      .select('*')
      .eq('dominio_customizado', cleanDomain)
      .maybeSingle();

    if (!error && data) {
      const store = mapRowToStore(data);
      saveLocalStores([...localStores.filter((s) => s.slug !== store.slug), store]);
      return store;
    }
  } catch (err) {
    console.warn('[tenantService] Erro ao buscar por domínio customizado:', err);
  }

  return null;
}

export async function fetchStoreByOwnerEmail(email: string): Promise<LojaAfiliado | null> {
  if (!email) return null;
  const cleanEmail = email.toLowerCase().trim();

  // 1. Checa local
  const localStores = getLocalStores();
  const matchedLocal = localStores.find((s) => s.ownerEmail?.toLowerCase().trim() === cleanEmail);
  if (matchedLocal) return matchedLocal;

  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('lojas_afiliados')
      .select('*')
      .ilike('owner_email', cleanEmail)
      .maybeSingle();

    if (!error && data) {
      const store = mapRowToStore(data);
      saveLocalStores([...localStores.filter((s) => s.slug !== store.slug), store]);
      return store;
    }
  } catch (err) {
    console.warn('[tenantService] Erro ao buscar loja por e-mail do lojista:', err);
  }

  return null;
}

export async function listAllStores(): Promise<LojaAfiliado[]> {
  const localStores = getLocalStores();

  if (!isSupabaseConfigured) {
    return localStores;
  }

  try {
    const { data, error } = await supabase
      .from('lojas_afiliados')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const stores = data.map(mapRowToStore);
      saveLocalStores(stores);
      return stores;
    }
  } catch (err) {
    console.warn('[tenantService] Aviso ao listar lojas no Supabase:', err);
  }

  return localStores;
}

export async function createStore(input: {
  slug: string;
  nomeLoja: string;
  subtitulo?: string;
  corPrimaria?: string;
  corDestaque?: string;
  logoUrl?: string;
  heroMascoteUrl?: string;
  whatsappVipUrl?: string;
  instagramUrl?: string;
  plano: SubscriptionPlan;
  statusAssinatura?: SubscriptionStatus;
  shopeeAppId?: string;
  shopeeSecret?: string;
  ownerEmail?: string;
  dominioCustomizado?: string;
}): Promise<LojaAfiliado> {
  const newStore: LojaAfiliado = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `store-${Date.now()}`,
    slug: input.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
    nomeLoja: input.nomeLoja.trim(),
    subtitulo: input.subtitulo?.trim() || '',
    corPrimaria: input.corPrimaria || '#0F172A',
    corDestaque: input.corDestaque || '#FFE600',
    logoUrl: input.logoUrl?.trim() || '/icons/icon-192x192.png',
    heroMascoteUrl: input.heroMascoteUrl?.trim() || '/brand/clarice-hero.png',
    whatsappVipUrl: input.whatsappVipUrl?.trim() || '',
    instagramUrl: input.instagramUrl?.trim() || '',
    plano: input.plano,
    statusAssinatura: input.statusAssinatura || 'ativo',
    shopeeAppId: input.shopeeAppId?.trim() || '',
    shopeeSecret: input.shopeeSecret?.trim() || '',
    ownerEmail: input.ownerEmail?.trim().toLowerCase() || '',
    dominioCustomizado: input.dominioCustomizado?.trim().toLowerCase() || '',
    createdAt: new Date().toISOString(),
  };

  // Salva localmente primeiro
  const localStores = getLocalStores();
  const existingIdx = localStores.findIndex((s) => s.slug === newStore.slug);
  if (existingIdx >= 0) {
    localStores[existingIdx] = newStore;
  } else {
    localStores.unshift(newStore);
  }
  saveLocalStores(localStores);

  // Tenta persistir no Supabase se configurado
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('lojas_afiliados')
        .insert({
          id: newStore.id,
          slug: newStore.slug,
          nome_loja: newStore.nomeLoja,
          subtitulo: newStore.subtitulo,
          cor_primaria: newStore.corPrimaria,
          cor_destaque: newStore.corDestaque,
          logo_url: newStore.logoUrl,
          hero_mascote_url: newStore.heroMascoteUrl,
          whatsapp_vip_url: newStore.whatsappVipUrl,
          instagram_url: newStore.instagramUrl,
          plano: newStore.plano,
          status_assinatura: newStore.statusAssinatura,
          shopee_app_id: newStore.shopeeAppId,
          shopee_secret: newStore.shopeeSecret,
          owner_email: newStore.ownerEmail,
          dominio_customizado: newStore.dominioCustomizado || null,
        })
        .select()
        .single();

      if (!error && data) {
        return mapRowToStore(data);
      }
    } catch (err) {
      console.warn('[tenantService] Erro ao criar loja no Supabase, mantido em cache local:', err);
    }
  }

  return newStore;
}

export async function updateStoreBranding(
  slug: string,
  updates: Partial<LojaAfiliado>
): Promise<LojaAfiliado | null> {
  const local = getLocalStores();
  const targetIdx = local.findIndex((s) => s.slug === slug);
  if (targetIdx >= 0) {
    local[targetIdx] = { ...local[targetIdx]!, ...updates };
    saveLocalStores(local);
  }

  if (isSupabaseConfigured) {
    try {
      const dbPayload: any = {};
      if (updates.nomeLoja !== undefined) dbPayload.nome_loja = updates.nomeLoja;
      if (updates.subtitulo !== undefined) dbPayload.subtitulo = updates.subtitulo;
      if (updates.corPrimaria !== undefined) dbPayload.cor_primaria = updates.corPrimaria;
      if (updates.corDestaque !== undefined) dbPayload.cor_destaque = updates.corDestaque;
      if (updates.logoUrl !== undefined) dbPayload.logo_url = updates.logoUrl;
      if (updates.heroMascoteUrl !== undefined) dbPayload.hero_mascote_url = updates.heroMascoteUrl;
      if (updates.whatsappVipUrl !== undefined) dbPayload.whatsapp_vip_url = updates.whatsappVipUrl;
      if (updates.instagramUrl !== undefined) dbPayload.instagram_url = updates.instagramUrl;
      if (updates.dominioCustomizado !== undefined) dbPayload.dominio_customizado = updates.dominioCustomizado || null;
      if (updates.shopeeAppId !== undefined) dbPayload.shopee_app_id = updates.shopeeAppId;
      if (updates.shopeeSecret !== undefined) dbPayload.shopee_secret = updates.shopeeSecret;

      const { data, error } = await supabase
        .from('lojas_afiliados')
        .update(dbPayload)
        .eq('slug', slug)
        .select()
        .single();

      if (!error && data) {
        return mapRowToStore(data);
      }
    } catch (err) {
      console.warn('[tenantService] Falha ao atualizar branding no Supabase:', err);
    }
  }

  return targetIdx >= 0 ? local[targetIdx]! : null;
}

export async function updateStoreSubscriptionStatus(
  id: string,
  newStatus: SubscriptionStatus
): Promise<boolean> {
  const local = getLocalStores();
  const target = local.find((s) => s.id === id || s.slug === id);
  if (target) {
    target.statusAssinatura = newStatus;
    saveLocalStores(local);
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('lojas_afiliados')
        .update({ status_assinatura: newStatus })
        .or(`id.eq.${id},slug.eq.${id}`);

      if (error) {
        console.warn('[tenantService] Falha ao atualizar status no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[tenantService] Conexão falhou ao atualizar status:', err);
      return false;
    }
  }

  return true;
}

export async function createAsaasCheckout(payload: {
  loja_slug: string;
  nome: string;
  email: string;
  cpfCnpj?: string;
  plano: SubscriptionPlan;
}): Promise<{ success: boolean; paymentUrl?: string; error?: string }> {
  try {
    const res = await fetch('/api/asaas/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
