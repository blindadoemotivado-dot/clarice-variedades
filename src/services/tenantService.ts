import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { lojistaUpdateStoreBrandingServerFn } from './superAdminServerFn';
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

export const PUBLIC_STORE_COLUMNS =
  'id, slug, nome_loja, subtitulo, cor_primaria, cor_destaque, logo_url, hero_mascote_url, whatsapp_vip_url, instagram_url, plano, status_assinatura, vencimento_em, dominio_customizado, whatsapp_contato, created_at';

function saveLocalStores(stores: LojaAfiliado[]) {
  if (typeof window === 'undefined') return;
  try {
    const sanitized = stores.map((s) => ({
      ...s,
      ownerPassword: undefined,
      shopeeSecret: undefined,
      cpfCnpj: undefined,
      asaasCustomerId: undefined,
      asaasSubscriptionId: undefined,
      asaasPaymentUrl: undefined,
    }));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // ignore
  }
}

export function mapRowToStore(row: any): LojaAfiliado {
  const isClarice = (row.slug || '').toLowerCase() === 'clarice';
  const rawSecret = row.shopee_secret || row.ml_affiliate_tag || '';
  let parsedTag = row.ml_affiliate_tag || rawSecret;
  let parsedTool = row.ml_matt_tool || row.mlMattTool || '';

  // Suporte a armazenamento composto tag|tool
  if (!parsedTool && typeof rawSecret === 'string' && rawSecret.includes('|')) {
    const parts = rawSecret.split('|');
    parsedTag = parts[0]?.trim() || '';
    parsedTool = parts[1]?.trim() || '';
  }

  return {
    id: row.id,
    slug: row.slug || 'clarice',
    nomeLoja: row.nome_loja || 'Clarice Achadinhos',
    subtitulo: row.subtitulo || '',
    corPrimaria: row.cor_primaria || '#0F172A',
    corDestaque: row.cor_destaque || '#FFE600',
    logoUrl: row.logo_url || (isClarice ? '/icons/icon-192x192.png' : undefined),
    heroMascoteUrl: row.hero_mascote_url || row.banner_url || (isClarice ? '/brand/clarice-hero.png' : undefined),
    bannerUrl: row.banner_url || row.hero_mascote_url || (isClarice ? '/brand/clarice-hero.png' : undefined),
    whatsappVipUrl: row.whatsapp_vip_url || '',
    instagramUrl: row.instagram_url || '',
    plano: (row.plano as SubscriptionPlan) || 'start',
    statusAssinatura: (row.status_assinatura as SubscriptionStatus) || 'ativo',
    vencimentoEm: row.vencimento_em || undefined,
    shopeeAppId: row.shopee_app_id || '',
    shopeeSecret: row.shopee_secret || '',
    mlAffiliateTag: parsedTag || '',
    mlMattTool: parsedTool || '',
    shopeeAffiliateId: row.shopee_affiliate_id || row.shopee_app_id || '',
    ownerEmail: row.owner_email || '',
    ownerPassword: row.owner_password || undefined,
    ownerUserId: row.owner_user_id || '',
    asaasCustomerId: row.asaas_customer_id || '',
    asaasSubscriptionId: row.asaas_subscription_id || '',
    asaasPaymentUrl: row.asaas_payment_url || '',
    dominioCustomizado: row.dominio_customizado || '',
    whatsappContato: row.whatsapp_contato || '',
    cpfCnpj: row.cpf_cnpj || '',
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
      .select(PUBLIC_STORE_COLUMNS)
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
      .select(PUBLIC_STORE_COLUMNS)
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

  // Se Supabase estiver configurado, busca a verdade remota prioritariamente para refletir pagamentos/bloqueios em tempo real
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('lojas_afiliados')
        .select('*')
        .ilike('owner_email', cleanEmail)
        .maybeSingle();

      if (!error && data) {
        const store = mapRowToStore(data);
        const localStores = getLocalStores();
        saveLocalStores([...localStores.filter((s) => s.slug !== store.slug), store]);
        return store;
      }
    } catch (err) {
      console.warn('[tenantService] Erro ao buscar loja por e-mail do lojista no Supabase:', err);
    }
  }

  // Fallback local caso Supabase não esteja configurado ou ocorra erro de rede
  const localStores = getLocalStores();
  const matchedLocal = localStores.find((s) => s.ownerEmail?.toLowerCase().trim() === cleanEmail);
  return matchedLocal || null;
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
  bannerUrl?: string;
  whatsappVipUrl?: string;
  instagramUrl?: string;
  plano: SubscriptionPlan;
  statusAssinatura?: SubscriptionStatus;
  shopeeAppId?: string;
  shopeeSecret?: string;
  mlAffiliateTag?: string;
  mlMattTool?: string;
  shopeeAffiliateId?: string;
  ownerEmail?: string;
  ownerPassword?: string;
  dominioCustomizado?: string;
  whatsappContato?: string;
  cpfCnpj?: string;
}): Promise<LojaAfiliado> {
  const cleanSlug =
    input.slug
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || `loja-${Date.now()}`;

  const newStore: LojaAfiliado = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `store-${Date.now()}`,
    slug: cleanSlug,
    nomeLoja: input.nomeLoja.trim(),
    subtitulo: input.subtitulo?.trim() || `Achadinhos selecionados e ofertas imperdíveis por ${input.nomeLoja.trim()}`,
    corPrimaria: input.corPrimaria || '#0F172A',
    corDestaque: input.corDestaque || '#FFE600',
    logoUrl: input.logoUrl?.trim() || (cleanSlug === 'clarice' ? '/icons/icon-192x192.png' : undefined),
    heroMascoteUrl: input.heroMascoteUrl?.trim() || (cleanSlug === 'clarice' ? '/brand/clarice-hero.png' : undefined),
    bannerUrl: input.heroMascoteUrl?.trim() || (cleanSlug === 'clarice' ? '/brand/clarice-hero.png' : undefined),
    whatsappVipUrl: input.whatsappVipUrl?.trim() || '',
    instagramUrl: input.instagramUrl?.trim() || '',
    plano: input.plano,
    statusAssinatura: input.statusAssinatura || 'ativo',
    shopeeAppId: input.shopeeAppId?.trim() || '',
    shopeeSecret: input.shopeeSecret?.trim() || '',
    mlAffiliateTag: input.mlAffiliateTag?.trim() || '',
    mlMattTool: input.mlMattTool?.trim() || '',
    shopeeAffiliateId: input.shopeeAffiliateId?.trim() || input.shopeeAppId?.trim() || '',
    ownerEmail: input.ownerEmail?.trim().toLowerCase() || '',
    ownerPassword: input.ownerPassword?.trim() || '',
    dominioCustomizado: input.dominioCustomizado?.trim().toLowerCase() || '',
    whatsappContato: input.whatsappContato?.trim() || '',
    cpfCnpj: input.cpfCnpj?.trim() || '',
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
      const insertPayload: any = {
        id: newStore.id,
        slug: newStore.slug,
        nome_loja: newStore.nomeLoja,
        subtitulo: newStore.subtitulo,
        cor_primaria: newStore.corPrimaria,
        cor_destaque: newStore.corDestaque,
        logo_url: newStore.logoUrl || null,
        hero_mascote_url: newStore.heroMascoteUrl || null,
        whatsapp_vip_url: newStore.whatsappVipUrl,
        instagram_url: newStore.instagramUrl,
        plano: newStore.plano,
        status_assinatura: newStore.statusAssinatura,
        shopee_app_id: newStore.shopeeAffiliateId || newStore.shopeeAppId || null,
        shopee_secret: newStore.mlMattTool
          ? `${newStore.mlAffiliateTag}|${newStore.mlMattTool}`
          : newStore.shopeeSecret || newStore.mlAffiliateTag || null,
        owner_email: newStore.ownerEmail,
        owner_password: newStore.ownerPassword || null,
        dominio_customizado: newStore.dominioCustomizado || null,
        whatsapp_contato: newStore.whatsappContato || null,
        cpf_cnpj: newStore.cpfCnpj || null,
      };

      const { data, error } = await supabase
        .from('lojas_afiliados')
        .insert(insertPayload)
        .select()
        .single();

      if (!error && data) {
        return mapRowToStore(data);
      }

      // Fallback seguro se as colunas da migration 0003 ainda não tiverem sido aplicadas
      if (error && (error.message.includes('column') || error.message.includes('status_assinatura') || error.message.includes('schema cache'))) {
        const fallbackStatus = newStore.statusAssinatura === 'pendente' ? 'trial' : newStore.statusAssinatura;
        const effectiveSecret = newStore.mlMattTool
          ? `${newStore.mlAffiliateTag}|${newStore.mlMattTool}`
          : newStore.shopeeSecret || newStore.mlAffiliateTag || null;

        const { data: fbData, error: fbError } = await supabase
          .from('lojas_afiliados')
          .insert({
            id: newStore.id,
            slug: newStore.slug,
            nome_loja: newStore.nomeLoja,
            subtitulo: newStore.subtitulo,
            cor_primaria: newStore.corPrimaria,
            cor_destaque: newStore.corDestaque,
            logo_url: newStore.logoUrl || null,
            hero_mascote_url: newStore.heroMascoteUrl || null,
            whatsapp_vip_url: newStore.whatsappVipUrl,
            instagram_url: newStore.instagramUrl,
            plano: newStore.plano,
            status_assinatura: fallbackStatus,
            shopee_app_id: newStore.shopeeAffiliateId || newStore.shopeeAppId || '',
            shopee_secret: effectiveSecret,
            owner_email: newStore.ownerEmail,
            owner_password: newStore.ownerPassword || null,
            dominio_customizado: newStore.dominioCustomizado || null,
            whatsapp_contato: newStore.whatsappContato || null,
            cpf_cnpj: newStore.cpfCnpj || null,
          })
          .select()
          .single();

        if (!fbError && fbData) {
          return mapRowToStore(fbData);
        }
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

  // 1. Tenta atualizar via Server Function segura (Service Role) para blindar contra bloqueios de RLS no painel do lojista
  try {
    const srvRes = await lojistaUpdateStoreBrandingServerFn({ data: { slug, updates } });
    if (srvRes?.success && srvRes.data) {
      return mapRowToStore(srvRes.data);
    }
  } catch (srvErr) {
    console.warn('[updateStoreBranding] Server function indisponível ou em ambiente estático, tentando cliente direto:', srvErr);
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
      const effectiveTag =
        updates.mlAffiliateTag !== undefined
          ? updates.mlAffiliateTag
          : local[targetIdx]?.mlAffiliateTag || '';
      const effectiveTool =
        updates.mlMattTool !== undefined
          ? updates.mlMattTool
          : local[targetIdx]?.mlMattTool || '';

      if (updates.shopeeSecret !== undefined && !updates.shopeeSecret.includes('|')) {
        dbPayload.shopee_secret = updates.shopeeSecret || null;
      } else if (effectiveTool) {
        dbPayload.shopee_secret = `${effectiveTag}|${effectiveTool}`;
      } else if (updates.mlAffiliateTag !== undefined) {
        dbPayload.shopee_secret = updates.mlAffiliateTag || null;
      }

      if (updates.shopeeAppId !== undefined && updates.shopeeAppId.trim()) {
        dbPayload.shopee_app_id = updates.shopeeAppId.trim();
      } else if (updates.shopeeAffiliateId !== undefined) {
        dbPayload.shopee_app_id = updates.shopeeAffiliateId || null;
      }

      const { data, error } = await supabase
        .from('lojas_afiliados')
        .update(dbPayload)
        .eq('slug', slug)
        .select()
        .single();

      if (!error && data) {
        return mapRowToStore(data);
      }

      // Se as colunas ml_affiliate_tag/ml_matt_tool/shopee_affiliate_id ainda não foram criadas no Supabase via migração SQL,
      // persiste nos campos de compatibilidade shopee_secret e shopee_app_id sem derrubar o salvamento
      if (error && error.message?.includes('schema cache')) {
        const { ml_affiliate_tag, ml_matt_tool, shopee_affiliate_id, ...fallbackPayload } = dbPayload;
        fallbackPayload.shopee_secret = effectiveTool ? `${effectiveTag}|${effectiveTool}` : (effectiveTag || null);
        if (updates.shopeeAffiliateId !== undefined) fallbackPayload.shopee_app_id = updates.shopeeAffiliateId || null;

        const { data: fbData, error: fbError } = await supabase
          .from('lojas_afiliados')
          .update(fallbackPayload)
          .eq('slug', slug)
          .select()
          .single();

        if (!fbError && fbData) {
          const store = mapRowToStore(fbData);
          store.mlAffiliateTag = effectiveTag;
          store.mlMattTool = effectiveTool;
          store.shopeeAffiliateId = updates.shopeeAffiliateId || local[targetIdx]?.shopeeAffiliateId || '';
          return store;
        }
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
  whatsapp?: string;
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

export async function checkSlugAvailable(slug: string): Promise<boolean> {
  const clean = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  if (!clean || clean.length < 3) return false;

  const reserved = ['admin', 'api', 'clarice', 'login', 'criar-loja', 'suporte', 'checkout', 'webhook'];
  if (reserved.includes(clean)) return false;

  const localStores = getLocalStores();
  if (localStores.some((s) => s.slug === clean)) return false;

  if (!isSupabaseConfigured) return true;

  try {
    const { data, error } = await supabase
      .from('lojas_afiliados')
      .select('slug')
      .eq('slug', clean)
      .maybeSingle();

    if (!error && data) return false;
    return true;
  } catch {
    return true;
  }
}

export async function approveStore(idOrSlug: string): Promise<boolean> {
  const nextDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const local = getLocalStores();
  const target = local.find((s) => s.id === idOrSlug || s.slug === idOrSlug);
  if (target) {
    target.statusAssinatura = 'ativo';
    target.vencimentoEm = nextDueDate;
    saveLocalStores(local);
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('lojas_afiliados')
        .update({
          status_assinatura: 'ativo',
          vencimento_em: nextDueDate,
        })
        .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`);

      if (error) {
        console.warn('[tenantService] Falha ao aprovar loja no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[tenantService] Erro ao aprovar loja:', err);
      return false;
    }
  }

  return true;
}

export async function rejectStore(idOrSlug: string): Promise<boolean> {
  return await updateStoreSubscriptionStatus(idOrSlug, 'suspenso');
}

export async function updateStorePassword(idOrSlug: string, newPassword: string): Promise<boolean> {
  if (!newPassword) return false;
  const cleanPassword = newPassword.trim();
  const local = getLocalStores();
  const target = local.find((s) => s.id === idOrSlug || s.slug === idOrSlug);
  if (target) {
    target.ownerPassword = cleanPassword;
    saveLocalStores(local);
  }

  if (isSupabaseConfigured) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
      const query = supabase.from('lojas_afiliados').update({ owner_password: cleanPassword });
      const { error } = isUuid ? await query.eq('id', idOrSlug) : await query.eq('slug', idOrSlug);
      if (error) {
        console.warn('[tenantService] Aviso ao atualizar senha no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[tenantService] Erro ao atualizar senha:', err);
      return false;
    }
  }

  return true;
}

