import React, { useState, useEffect, type FormEvent } from 'react';
import {
  Palette,
  Upload,
  Loader2,
  Globe,
  Sparkles,
  CheckCircle2,
  Lock,
  Link as LinkIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { LojaAfiliado } from '@/types/tenant';
import type { PlanPermissions } from '@/config/planPermissions';
import { uploadStoreImage } from '@/services/storageService';
import { updateStoreBranding } from '@/services/tenantService';
import { PlanGate } from './PlanGate';

export interface LojistaStoreSettingsProps {
  store: LojaAfiliado;
  permissions: PlanPermissions;
  onSaved?: (updatedStore: Partial<LojaAfiliado>) => void;
  onUpgrade?: () => void;
  className?: string;
}

export function LojistaStoreSettings({
  store,
  permissions,
  onSaved,
  onUpgrade,
  className,
}: LojistaStoreSettingsProps) {
  const [storeBrandName, setStoreBrandName] = useState(store.nomeLoja || '');
  const [storeBrandSubtitle, setStoreBrandSubtitle] = useState(store.subtitulo || '');
  const [storeBrandPrimaryColor, setStoreBrandPrimaryColor] = useState(store.corPrimaria || '#0F172A');
  const [storeBrandAccentColor, setStoreBrandAccentColor] = useState(store.corDestaque || '#FFE600');
  const [storeBrandLogoUrl, setStoreBrandLogoUrl] = useState(store.logoUrl || '');
  const [storeBrandMascoteUrl, setStoreBrandMascoteUrl] = useState(store.heroMascoteUrl || '');
  const [storeBrandWhatsappVip, setStoreBrandWhatsappVip] = useState(store.whatsappVipUrl || '');
  const [storeBrandInstagram, setStoreBrandInstagram] = useState(store.instagramUrl || '');
  const [storeBrandDomain, setStoreBrandDomain] = useState(store.dominioCustomizado || '');
  const [storeMlAffiliateTag, setStoreMlAffiliateTag] = useState(store.mlAffiliateTag || store.shopeeSecret || '');
  const [storeShopeeAffiliateId, setStoreShopeeAffiliateId] = useState(store.shopeeAffiliateId || store.shopeeAppId || '');

  // Sincroniza estado visual quando a loja for carregada ou atualizada
  useEffect(() => {
    if (store) {
      setStoreBrandName(store.nomeLoja || '');
      setStoreBrandSubtitle(store.subtitulo || '');
      setStoreBrandPrimaryColor(store.corPrimaria || '#0F172A');
      setStoreBrandAccentColor(store.corDestaque || '#FFE600');
      setStoreBrandLogoUrl(store.logoUrl || '');
      setStoreBrandMascoteUrl(store.heroMascoteUrl || '');
      setStoreBrandWhatsappVip(store.whatsappVipUrl || '');
      setStoreBrandInstagram(store.instagramUrl || '');
      setStoreBrandDomain(store.dominioCustomizado || '');
      setStoreMlAffiliateTag(store.mlAffiliateTag || store.shopeeSecret || '');
      setStoreShopeeAffiliateId(store.shopeeAffiliateId || store.shopeeAppId || '');
    }
  }, [store]);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingMascote, setUploadingMascote] = useState(false);
  const [isSavingBrand, setIsSavingBrand] = useState(false);

  // Upload do Logo da Loja
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      toast.info('Otimizando e enviando logotipo...');
      const url = await uploadStoreImage(file, 'logos', store.slug);
      setStoreBrandLogoUrl(url);
      toast.success('Logotipo enviado com sucesso!');
    } catch (err: any) {
      console.error('[LojistaStoreSettings] Falha no upload do logo:', err);
      toast.error(`Erro ao subir logotipo: ${err?.message || 'Tente novamente'}`);
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  // Upload do Banner Hero / Imagem Destaque
  const handleMascoteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMascote(true);
    try {
      toast.info('Otimizando e enviando imagem do Banner Hero...');
      const url = await uploadStoreImage(file, 'banners', store.slug);
      setStoreBrandMascoteUrl(url);
      toast.success('Banner Hero enviado com sucesso!');
    } catch (err: any) {
      console.error('[LojistaStoreSettings] Falha no upload do banner hero:', err);
      toast.error(`Erro ao subir imagem: ${err?.message || 'Tente novamente'}`);
    } finally {
      setUploadingMascote(false);
      e.target.value = '';
    }
  };

  // Salvar Personalização
  const handleSaveStoreBrand = async (e: FormEvent) => {
    e.preventDefault();
    if (!store?.slug) return;

    setIsSavingBrand(true);
    try {
      const updates: Partial<LojaAfiliado> = {
        nomeLoja: storeBrandName.trim(),
        subtitulo: storeBrandSubtitle.trim(),
        corPrimaria: storeBrandPrimaryColor,
        corDestaque: storeBrandAccentColor,
        logoUrl: storeBrandLogoUrl.trim(),
        heroMascoteUrl: storeBrandMascoteUrl.trim(),
        whatsappVipUrl: storeBrandWhatsappVip.trim(),
        instagramUrl: storeBrandInstagram.trim(),
        dominioCustomizado: permissions.customDomain ? storeBrandDomain.trim() : undefined,
        mlAffiliateTag: storeMlAffiliateTag.trim(),
        shopeeAffiliateId: storeShopeeAffiliateId.trim(),
        shopeeAppId: storeShopeeAffiliateId.trim(),
      };

      const ok = await updateStoreBranding(store.slug, updates);
      if (ok) {
        toast.success('Identidade visual da sua vitrine atualizada com sucesso!');
        onSaved?.(updates);
      } else {
        toast.error('Não foi possível salvar as alterações no momento. Tente novamente.');
      }
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err?.message || 'Falha inesperada'}`);
    } finally {
      setIsSavingBrand(false);
    }
  };

  return (
    <div className={cn('rounded-3xl border border-slate-800 bg-[#0F172A] p-6 shadow-xl max-w-3xl space-y-6', className)}>
      <div className="border-b border-slate-800 pb-4">
        <h2 className="font-black text-white text-base sm:text-lg flex items-center gap-2">
          <Palette className="h-5 w-5 text-[#FFE600]" />
          Personalização da Minha Vitrine
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure as cores, logotipo, banner destaque e canais de atendimento exclusivos da sua loja.
        </p>
      </div>

      <form onSubmit={handleSaveStoreBrand} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nome da Loja
            </label>
            <input
              type="text"
              required
              value={storeBrandName}
              onChange={(e) => setStoreBrandName(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#FFE600]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Slug Exclusivo da URL
            </label>
            <input
              type="text"
              disabled
              value={store.slug}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Subtítulo / Chamada da Loja
          </label>
          <input
            type="text"
            value={storeBrandSubtitle}
            onChange={(e) => setStoreBrandSubtitle(e.target.value)}
            placeholder="Ex: Ofertas garimpadas todos os dias com desconto real"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#FFE600]"
          />
        </div>

        {/* Cores */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Cor Primária (Fundo/Header)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={storeBrandPrimaryColor}
                onChange={(e) => setStoreBrandPrimaryColor(e.target.value)}
                className="h-9 w-9 rounded-lg border border-slate-800 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={storeBrandPrimaryColor}
                onChange={(e) => setStoreBrandPrimaryColor(e.target.value)}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Cor de Destaque (Botões/Selos)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={storeBrandAccentColor}
                onChange={(e) => setStoreBrandAccentColor(e.target.value)}
                className="h-9 w-9 rounded-lg border border-slate-800 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={storeBrandAccentColor}
                onChange={(e) => setStoreBrandAccentColor(e.target.value)}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Logo & Banner Hero */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300">
                Logo da Loja (Ícone)
              </label>
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[#FFE600] rounded-lg text-[11px] font-bold cursor-pointer border border-slate-700 transition">
                {uploadingLogo ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                <span>{uploadingLogo ? 'Enviando...' : '📤 Subir Logo'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                  disabled={uploadingLogo}
                  onChange={handleLogoUpload}
                />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={storeBrandLogoUrl}
                onChange={(e) => setStoreBrandLogoUrl(e.target.value)}
                placeholder="https://... ou suba seu logo ao lado"
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#FFE600]"
              />
              {storeBrandLogoUrl && (
                <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center p-0.5">
                  <img
                    src={storeBrandLogoUrl}
                    alt="Logo"
                    className="h-full w-full object-cover rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Banner Hero / Imagem Destaque
                </label>
                <p className="text-[10px] text-slate-400">
                  Exibido no lado direito do banner no topo da vitrine.
                </p>
              </div>
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-[#FFE600] rounded-xl text-[11px] font-bold cursor-pointer border border-slate-700 transition shrink-0">
                {uploadingMascote ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                <span>{uploadingMascote ? 'Enviando...' : '📤 Subir Banner Hero'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                  disabled={uploadingMascote}
                  onChange={handleMascoteUpload}
                />
              </label>
            </div>
            <input
              type="url"
              value={storeBrandMascoteUrl}
              onChange={(e) => setStoreBrandMascoteUrl(e.target.value)}
              placeholder="https://... ou clique em 'Subir Banner Hero'"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#FFE600]"
            />
            {storeBrandMascoteUrl && (
              <div className="mt-2.5 rounded-2xl border border-slate-800 bg-slate-950/80 p-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 px-1">
                  <span className="font-semibold text-slate-300">Prévia do Banner Hero da Vitrine:</span>
                  <button
                    type="button"
                    onClick={() => setStoreBrandMascoteUrl('')}
                    className="text-red-400 hover:text-red-300 underline text-[10px]"
                  >
                    Remover
                  </button>
                </div>
                <div className="h-36 sm:h-44 w-full rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-800/80 p-1">
                  <img
                    src={storeBrandMascoteUrl}
                    alt="Prévia do Banner Hero"
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Canais */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Link do Grupo VIP WhatsApp
            </label>
            <input
              type="url"
              value={storeBrandWhatsappVip}
              onChange={(e) => setStoreBrandWhatsappVip(e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#FFE600]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Link do Instagram
            </label>
            <input
              type="url"
              value={storeBrandInstagram}
              onChange={(e) => setStoreBrandInstagram(e.target.value)}
              placeholder="https://instagram.com/..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#FFE600]"
            />
          </div>
        </div>

        {/* Domínio Customizado (CNAME) — Travado pelo PlanGate */}
        <div>
          <PlanGate
            allowed={permissions.customDomain}
            requiredPlan="Advanced"
            featureName="Domínio Próprio Customizado (CNAME)"
            onUpgrade={onUpgrade}
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Domínio Customizado Próprio
              </label>
              <input
                type="text"
                value={storeBrandDomain}
                onChange={(e) => setStoreBrandDomain(e.target.value)}
                placeholder="Ex: achadinhos.meudominio.com.br"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#FFE600]"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Permite apontar um CNAME próprio (ex: ofertas.seusite.com.br) diretamente para sua vitrine.
              </p>
            </div>
          </PlanGate>
        </div>

        {/* ========================================================================= */}
        {/* CARD DESTACADO: CREDENCIAIS PERMANENTES DE AFILIADO                      */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-950/15 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <LinkIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                🔗 Credenciais Permanentes de Afiliado (Comissões Automáticas)
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Configure uma única vez. Seus links de produtos colarão ou injetarão suas tags automaticamente.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tag Social / ID Mercado Livre
              </label>
              <input
                type="text"
                value={storeMlAffiliateTag}
                onChange={(e) => setStoreMlAffiliateTag(e.target.value)}
                placeholder="Ex: seuusuario ou link social ML"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#FFE600]"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Injeta automaticamente <code className="text-[#FFE600]">matt_word</code> nos links longos do Mercado Livre.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ID de Afiliado Shopee
              </label>
              <input
                type="text"
                value={storeShopeeAffiliateId}
                onChange={(e) => setStoreShopeeAffiliateId(e.target.value)}
                placeholder="Ex: 18318420060"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#FFE600]"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Injeta automaticamente <code className="text-[#FFE600]">af_siteid</code> e <code className="text-[#FFE600]">utm_source</code> nos links da Shopee.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSavingBrand}
          className="w-full rounded-2xl bg-[#FFE600] py-3 text-xs sm:text-sm font-black text-slate-950 shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 active:scale-[0.98] transition disabled:opacity-50"
        >
          {isSavingBrand ? 'Salvando...' : 'Salvar Alterações da Minha Loja'}
        </button>
      </form>
    </div>
  );
}
