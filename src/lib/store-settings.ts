import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface StoreSettings {
  mlAffiliateTag: string;
  whatsappNumber: string;
  whatsappVipGroupUrl: string;
  adminPin: string;
  generalAffiliateUrl: string;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  mlAffiliateTag: 'clarice-achadinhos',
  whatsappNumber: '5511999999999',
  whatsappVipGroupUrl: 'https://chat.whatsapp.com/IXxtNFu9ZppJkYFx1Jdk7o',
  adminPin: 'clarice2026',
  generalAffiliateUrl: 'https://www.mercadolivre.com.br/ofertas?matt_tool=clarice-achadinhos',
};

const STORAGE_KEY = 'clarice_store_settings_v1';
const SETTINGS_EVENT = 'clarice:settings_updated';

export function getStoreSettings(): StoreSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_STORE_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};

    const envPin = (import.meta.env.VITE_ADMIN_PIN as string | undefined)?.trim();
    const fallbackPin = envPin || DEFAULT_STORE_SETTINGS.adminPin;
    const envVip = (import.meta.env.VITE_WHATSAPP_VIP_URL as string | undefined)?.trim();
    const fallbackVip = envVip || DEFAULT_STORE_SETTINGS.whatsappVipGroupUrl;

    return {
      mlAffiliateTag: parsed.mlAffiliateTag?.trim() || DEFAULT_STORE_SETTINGS.mlAffiliateTag,
      whatsappNumber: parsed.whatsappNumber?.trim() || DEFAULT_STORE_SETTINGS.whatsappNumber,
      whatsappVipGroupUrl: parsed.whatsappVipGroupUrl?.trim() || fallbackVip,
      adminPin: parsed.adminPin?.trim() || fallbackPin,
      generalAffiliateUrl: parsed.generalAffiliateUrl?.trim() || DEFAULT_STORE_SETTINGS.generalAffiliateUrl,
    };
  } catch {
    return DEFAULT_STORE_SETTINGS;
  }
}

export function saveStoreSettings(partial: Partial<StoreSettings>): StoreSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_STORE_SETTINGS, ...partial };
  }

  const current = getStoreSettings();
  const next: StoreSettings = {
    ...current,
    ...partial,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: next }));
  } catch (err) {
    console.warn('[store-settings] Falha ao salvar no localStorage:', err);
  }

  return next;
}

export async function fetchStoreSettingsFromSupabase(): Promise<StoreSettings> {
  if (!isSupabaseConfigured) {
    return getStoreSettings();
  }

  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (!error && data) {
      const fromCloud: StoreSettings = {
        mlAffiliateTag: data.affiliate_tag?.trim() || DEFAULT_STORE_SETTINGS.mlAffiliateTag,
        whatsappNumber: data.whatsapp_number?.trim() || DEFAULT_STORE_SETTINGS.whatsappNumber,
        whatsappVipGroupUrl: data.whatsapp_group_url?.trim() || DEFAULT_STORE_SETTINGS.whatsappVipGroupUrl,
        adminPin: data.admin_pin_hash?.trim() || DEFAULT_STORE_SETTINGS.adminPin,
        generalAffiliateUrl: data.general_affiliate_url?.trim() || DEFAULT_STORE_SETTINGS.generalAffiliateUrl,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fromCloud));
        window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: fromCloud }));
      }
      return fromCloud;
    }
  } catch (err) {
    console.warn('[store-settings] Aviso ao buscar configurações no Supabase:', err);
  }

  return getStoreSettings();
}

export async function saveStoreSettingsToSupabase(partial: Partial<StoreSettings>): Promise<StoreSettings> {
  const next = saveStoreSettings(partial);

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('store_settings').upsert({
        id: 'default',
        affiliate_tag: next.mlAffiliateTag,
        whatsapp_number: next.whatsappNumber,
        whatsapp_group_url: next.whatsappVipGroupUrl,
        admin_pin_hash: next.adminPin,
        general_affiliate_url: next.generalAffiliateUrl,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.warn('[store-settings] Erro ao sincronizar configurações no Supabase:', error.message);
      }
    } catch (err) {
      console.warn('[store-settings] Falha ao persistir configurações no Supabase:', err);
    }
  }

  return next;
}

export function useStoreSettings(): [
  StoreSettings,
  (next: Partial<StoreSettings>) => Promise<StoreSettings>,
  boolean
] {
  const [settings, setSettings] = useState<StoreSettings>(getStoreSettings);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // 1. Carrega inicial do cache local
    setSettings(getStoreSettings());

    // 2. Hidrata do Supabase para todos os visitantes em qualquer dispositivo
    fetchStoreSettingsFromSupabase().then((cloud) => {
      setSettings(cloud);
      setIsHydrated(true);
    });

    const handleUpdate = () => {
      setSettings(getStoreSettings());
    };

    window.addEventListener(SETTINGS_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(SETTINGS_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const update = useCallback(async (next: Partial<StoreSettings>) => {
    const updated = await saveStoreSettingsToSupabase(next);
    setSettings(updated);
    return updated;
  }, []);

  return [settings, update, isHydrated];
}

/**
 * Aplica ou substitui a tag de afiliado (matt_tool) em uma URL do Mercado Livre.
 */
export function applyAffiliateTag(rawUrl: string, customTag?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  const tag = (customTag?.trim() || getStoreSettings().mlAffiliateTag || 'clarice-achadinhos').trim();

  try {
    const parsed = new URL(trimmed);
    parsed.searchParams.set('matt_tool', tag);
    return parsed.toString();
  } catch {
    const sep = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${sep}matt_tool=${encodeURIComponent(tag)}`;
  }
}

/**
 * Abre o grupo VIP configurado ou direciona para o WhatsApp de atendimento
 */
export function openVipGroup(greeting: string = 'Olá! Quero entrar no Grupo VIP da Clarice Achadinhos 🛍️') {
  const settings = getStoreSettings();
  const url = settings.whatsappVipGroupUrl?.trim();

  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  const num = settings.whatsappNumber.replace(/\D/g, '') || '5511999999999';
  window.open(
    `https://wa.me/${num}?text=${encodeURIComponent(greeting)}`,
    '_blank',
    'noopener,noreferrer'
  );
}

/**
 * Abre o WhatsApp de pedidos (Concierge / Peça um achadinho)
 */
export function openOrderWhatsApp(message: string) {
  const settings = getStoreSettings();
  const num = settings.whatsappNumber.replace(/\D/g, '') || '5511999999999';
  window.open(
    `https://wa.me/${num}?text=${encodeURIComponent(message)}`,
    '_blank',
    'noopener,noreferrer'
  );
}
