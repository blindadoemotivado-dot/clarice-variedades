import { useCallback, useEffect, useState } from 'react';

export interface StoreSettings {
  mlAffiliateTag: string;
  whatsappNumber: string;
  whatsappVipGroupUrl: string;
  adminPin: string;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  mlAffiliateTag: 'clarice-achadinhos',
  whatsappNumber: '5511999999999',
  whatsappVipGroupUrl: 'https://chat.whatsapp.com/ClariceAchadinhosVIP',
  adminPin: 'clarice2026',
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

    return {
      mlAffiliateTag: parsed.mlAffiliateTag?.trim() || DEFAULT_STORE_SETTINGS.mlAffiliateTag,
      whatsappNumber: parsed.whatsappNumber?.trim() || DEFAULT_STORE_SETTINGS.whatsappNumber,
      whatsappVipGroupUrl: parsed.whatsappVipGroupUrl?.trim() || DEFAULT_STORE_SETTINGS.whatsappVipGroupUrl,
      adminPin: parsed.adminPin?.trim() || fallbackPin,
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

export function useStoreSettings(): [StoreSettings, (next: Partial<StoreSettings>) => void] {
  const [settings, setSettings] = useState<StoreSettings>(getStoreSettings);

  useEffect(() => {
    // Carrega versão mais recente no mount
    setSettings(getStoreSettings());

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

  const update = useCallback((next: Partial<StoreSettings>) => {
    const updated = saveStoreSettings(next);
    setSettings(updated);
  }, []);

  return [settings, update];
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
