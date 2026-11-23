import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useTransition, useMemo, type FormEvent } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Crown,
  DollarSign,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  Globe,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  Palette,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Share2,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Tag,
  Trash2,
  Upload,
  Users,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useCatalog } from '@/hooks/use-catalog';
import { CATEGORIES, type AffiliateProduct, type Marketplace } from '@/types/product';
import { uploadStoreImage } from '@/services/storageService';
import {
  listAllStores,
  createStore,
  updateStoreSubscriptionStatus,
  updateStoreBranding,
  fetchStoreByOwnerEmail,
  fetchStoreBySlug,
  createAsaasCheckout,
  approveStore,
  rejectStore,
  updateStorePassword,
} from '@/services/tenantService';
import {
  PLANO_PRICES,
  type LojaAfiliado,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from '@/types/tenant';
import { formatBRL, isValidShopeeUrl, extractMlbId, productFromUrl } from '@/lib/catalog';
import { isValidMercadoLivreUrl } from '@/components/store/AdminSheet';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { cn } from '@/lib/utils';

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

export const Route = createFileRoute('/admin')({
  head: () => ({
    meta: [{ title: 'Painel Administrativo & Gestão SaaS — Clarice Achadinhos' }],
  }),
  component: AdminRoutePage,
});

const DEFAULT_PIN = (import.meta.env.VITE_ADMIN_PIN as string | undefined)?.trim() || '';

type UserRole = 'super_admin' | 'lojista';

function AdminRoutePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('super_admin');
  const [loggedStore, setLoggedStore] = useState<LojaAfiliado | null>(null);

  // Modo de Login (Super Admin PIN vs. Lojista E-mail)
  const [loginMode, setLoginMode] = useState<'pin' | 'email'>('pin');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [lojistaEmailInput, setLojistaEmailInput] = useState('');
  const [lojistaPasswordInput, setLojistaPasswordInput] = useState('');
  const [showLojistaPassword, setShowLojistaPassword] = useState(false);
  const [lojistaLoginLoading, setLojistaLoginLoading] = useState(false);

  // Controle de Abas Ativas com startTransition
  const [activeTab, setActiveTab] = useState<string>('produtos');
  const [isPending, startTransition] = useTransition();

  // Estados SaaS Multi-Tenant (Super Admin)
  const [stores, setStores] = useState<LojaAfiliado[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('todos');

  // Catálogo (se for lojista, isola estritamente na loja dele)
  const catalogLojaSlug = userRole === 'lojista' && loggedStore ? loggedStore.slug : (selectedStoreFilter === 'todos' ? undefined : selectedStoreFilter);
  const c = useCatalog(catalogLojaSlug);

  // Modal de Criação de Loja (Super Admin)
  const [newStoreModal, setNewStoreModal] = useState(false);
  const [newStoreSlug, setNewStoreSlug] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreSubtitle, setNewStoreSubtitle] = useState('');
  const [newStoreOwnerEmail, setNewStoreOwnerEmail] = useState('');
  const [newStoreDomain, setNewStoreDomain] = useState('');
  const [newStorePlan, setNewStorePlan] = useState<SubscriptionPlan>('start');
  const [newStorePrimaryColor, setNewStorePrimaryColor] = useState('#0F172A');
  const [newStoreAccentColor, setNewStoreAccentColor] = useState('#FFE600');
  const [newStoreWhatsapp, setNewStoreWhatsapp] = useState('');
  const [newStoreInstagram, setNewStoreInstagram] = useState('');
  const [newStoreShopeeAppId, setNewStoreShopeeAppId] = useState('');
  const [newStoreShopeeSecret, setNewStoreShopeeSecret] = useState('');

  // Formulário de Cadastro/Edição de Produto
  const [productMarketplace, setProductMarketplace] = useState<Marketplace>('mercadolivre');
  const [productAffiliateUrl, setProductAffiliateUrl] = useState('');
  const [productTitle, setProductTitle] = useState('');
  const [productCurrentPrice, setProductCurrentPrice] = useState('');
  const [productOriginalPrice, setProductOriginalPrice] = useState('');
  const [productCategory, setProductCategory] = useState<AffiliateProduct['category']>('Casa & Cozinha');
  const [productImageUrl, setProductImageUrl] = useState('');
  const [productInstallments, setProductInstallments] = useState('em 6x sem juros');
  const [productIsFull, setProductIsFull] = useState(false);
  const [productFreeShipping, setProductFreeShipping] = useState(true);
  const [productFeatured, setProductFeatured] = useState(false);
  const [productIsActive, setProductIsActive] = useState(true);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isFetchingOg, setIsFetchingOg] = useState(false);

  // Filtros na lista de produtos
  const [productSearch, setProductSearch] = useState('');
  const [marketFilter, setMarketFilter] = useState<'todos' | Marketplace>('todos');

  // Formulário "Minha Loja" (Lojista)
  const [storeBrandName, setStoreBrandName] = useState('');
  const [storeBrandSubtitle, setStoreBrandSubtitle] = useState('');
  const [storeBrandPrimaryColor, setStoreBrandPrimaryColor] = useState('#0F172A');
  const [storeBrandAccentColor, setStoreBrandAccentColor] = useState('#FFE600');
  const [storeBrandLogoUrl, setStoreBrandLogoUrl] = useState('');
  const [storeBrandMascoteUrl, setStoreBrandMascoteUrl] = useState('');
  const [storeBrandWhatsappVip, setStoreBrandWhatsappVip] = useState('');
  const [storeBrandInstagram, setStoreBrandInstagram] = useState('');
  const [storeBrandDomain, setStoreBrandDomain] = useState('');
  const [isSavingBrand, setIsSavingBrand] = useState(false);

  // Assinatura Asaas (Lojista)
  const [isGeneratingAsaas, setIsGeneratingAsaas] = useState(false);

  // Estados de Upload de Imagens
  const [uploadingProductImage, setUploadingProductImage] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingMascote, setUploadingMascote] = useState(false);

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingProductImage(true);
      const targetLoja =
        userRole === 'lojista' && loggedStore
          ? loggedStore.slug
          : selectedStoreFilter !== 'todos'
          ? selectedStoreFilter
          : 'clarice';
      const publicUrl = await uploadStoreImage(file, 'produtos', targetLoja);
      setProductImageUrl(publicUrl);
      toast.success('Foto do produto enviada com sucesso!');
    } catch (err: any) {
      toast.error(`Erro ao subir imagem: ${err.message || 'Falha no upload'}`);
    } finally {
      setUploadingProductImage(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      const targetLoja = userRole === 'lojista' && loggedStore ? loggedStore.slug : 'clarice';
      const publicUrl = await uploadStoreImage(file, 'logos', targetLoja);
      setStoreBrandLogoUrl(publicUrl);
      toast.success('Logotipo enviado com sucesso!');
    } catch (err: any) {
      toast.error(`Erro ao subir logo: ${err.message || 'Falha no upload'}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleMascoteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingMascote(true);
      const targetLoja = userRole === 'lojista' && loggedStore ? loggedStore.slug : 'clarice';
      const publicUrl = await uploadStoreImage(file, 'banners', targetLoja);
      setStoreBrandMascoteUrl(publicUrl);
      toast.success('Banner/Mascote enviado com sucesso!');
    } catch (err: any) {
      toast.error(`Erro ao subir banner/mascote: ${err.message || 'Falha no upload'}`);
    } finally {
      setUploadingMascote(false);
    }
  };

  // Modo de Entrada de Produtos (Individual vs. Lote)
  const [productInputMode, setProductInputMode] = useState<'individual' | 'batch'>('individual');
  const [batchLinksText, setBatchLinksText] = useState('');
  const [batchDefaultCategory, setBatchDefaultCategory] = useState<AffiliateProduct['category']>('Casa & Cozinha');
  const [batchParsedProducts, setBatchParsedProducts] = useState<AffiliateProduct[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // Estados do Disparador VIP (WhatsApp)
  type VipTemplate = 'urgencia' | 'achadinho' | 'unidades';
  const [selectedVipProduct, setSelectedVipProduct] = useState<AffiliateProduct | null>(null);
  const [vipTemplate, setVipTemplate] = useState<VipTemplate>('achadinho');
  const [customCopyText, setCustomCopyText] = useState('');
  const [vipSearch, setVipSearch] = useState('');
  const [vipFilter, setVipFilter] = useState<'todos' | 'nao_disparados' | 'disparados'>('todos');
  const [disparosMap, setDisparosMap] = useState<Record<string, string>>({});

  const getTodayDateStr = () => new Date().toISOString().slice(0, 10);

  // Carrega mapa de disparos de hoje para a loja logada
  useEffect(() => {
    if (loggedStore?.slug) {
      try {
        const saved = localStorage.getItem(`disparos_vip_${loggedStore.slug}`);
        if (saved) {
          setDisparosMap(JSON.parse(saved));
        }
      } catch {
        // ignore
      }
    }
  }, [loggedStore?.slug]);

  // Helper para gerar copy persuasiva
  const generateVipCopy = (
    product: AffiliateProduct,
    template: VipTemplate,
    storeName: string,
    storeSlug: string
  ): string => {
    const isShopee = product.marketplace === 'shopee';
    const canal = isShopee ? 'SHOPEE' : 'MERCADO LIVRE';
    const vitrineUrl = `https://clariceachadinhos.vercel.app/?loja=${storeSlug}&produto=${product.id}`;
    const precoAntigo = formatBRL(product.originalPrice);
    const precoAtual = formatBRL(product.currentPrice);
    const desconto = product.discountPercent;
    const parcelas = product.installmentsText || 'em até 6x sem juros';
    const lojaNome = storeName || 'Nossa Loja';

    if (template === 'urgencia') {
      return (
        `🚨 *OFERTA RELÂMPAGO • PREÇO BAIXOU AGORA!*\n` +
        `🔥 *${product.title}*\n\n` +
        `~De: ${precoAntigo}~\n` +
        `💥 *Por apenas: ${precoAtual}* (${desconto}% OFF)\n` +
        `💳 ${parcelas}\n` +
        `⚡ *Envio Rápido & Compra 100% Garantida no app ${canal}*\n\n` +
        `👉 *Ver fotos e garantir na nossa vitrine:*\n${vitrineUrl}\n\n` +
        `🛒 *Ou compre direto pelo link oficial:*\n${product.affiliateUrl}\n\n` +
        `⏰ _Atenção: Promoção por tempo limitado enquanto durar o estoque promocional!_`
      );
    }

    if (template === 'unidades') {
      return (
        `⚠️ *ÚLTIMAS UNIDADES COM ESSE PREÇO!*\n` +
        `🏷️ *${product.title}*\n\n` +
        `Estoque com desconto quase esgotado no ${canal}!\n\n` +
        `~De: ${precoAntigo}~\n` +
        `✅ *Por apenas: ${precoAtual}* (${desconto}% OFF)\n` +
        `💳 ${parcelas}\n\n` +
        `👉 *Garanta o seu antes que volte ao preço normal:*\n${vitrineUrl}\n\n` +
        `🔗 *Link direto oficial:* ${product.affiliateUrl}\n\n` +
        `🏃‍♂️💨 _Corre antes que acabe! Equipe ${lojaNome}_`
      );
    }

    // Default: 'achadinho'
    return (
      `⭐ *ACHADINHO DO DIA • CURADORIA ${lojaNome.toUpperCase()}*\n` +
      `🛍️ *${product.title}*\n\n` +
      `Garimpamos essa oferta exclusiva com desconto real verificado no ${canal}:\n\n` +
      `~De: ${precoAntigo}~\n` +
      `✅ *Por apenas: ${precoAtual}* (${desconto}% OFF)\n` +
      `💳 ${parcelas}\n` +
      `🚚 ${product.freeShipping ? 'Frete Grátis disponível' : 'Envio Rápido'}\n\n` +
      `👉 *Ver detalhes e fotos completas na vitrine:*\n${vitrineUrl}\n\n` +
      `🔗 *Link do produto:* ${product.affiliateUrl}\n\n` +
      `✨ _Selecionado especialmente para os membros do nosso Grupo VIP!_`
    );
  };

  // Atualiza a copy sempre que o produto selecionado ou o template mudar
  useEffect(() => {
    if (selectedVipProduct && loggedStore) {
      setCustomCopyText(
        generateVipCopy(selectedVipProduct, vipTemplate, loggedStore.nomeLoja, loggedStore.slug)
      );
    }
  }, [selectedVipProduct, vipTemplate, loggedStore]);

  const markProductAsDispatched = (productId: string) => {
    if (!loggedStore?.slug) return;
    const today = getTodayDateStr();
    const updated = { ...disparosMap, [productId]: today };
    setDisparosMap(updated);
    try {
      localStorage.setItem(`disparos_vip_${loggedStore.slug}`, JSON.stringify(updated));
    } catch {}

    if (isSupabaseConfigured) {
      supabase
        .from('produtos_clarice')
        .update({ ultimo_disparo_em: new Date().toISOString() })
        .eq('id', productId)
        .then(() => {})
        .catch(() => {});
    }
  };

  const resetProductDispatch = (productId: string) => {
    if (!loggedStore?.slug) return;
    const updated = { ...disparosMap };
    delete updated[productId];
    setDisparosMap(updated);
    try {
      localStorage.setItem(`disparos_vip_${loggedStore.slug}`, JSON.stringify(updated));
    } catch {}
  };

  const handleCopyVip = () => {
    if (!customCopyText.trim()) return;
    navigator.clipboard.writeText(customCopyText);
    toast.success('Copy copiada para a área de transferência!');
  };

  const handleFireWhatsApp = () => {
    if (!selectedVipProduct || !customCopyText.trim()) {
      toast.error('Selecione um produto e revise a copy antes de disparar.');
      return;
    }
    markProductAsDispatched(selectedVipProduct.id);
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(customCopyText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    toast.success('WhatsApp aberto e produto marcado como Disparado Hoje!');
  };

  // Processamento do Lote de Produtos
  const handleProcessBatch = () => {
    const lines = batchLinksText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      toast.error('Cole ao menos um link válido para processar.');
      return;
    }

    const limitedLines = lines.slice(0, 20);
    if (lines.length > 20) {
      toast.info('Processando os primeiros 20 links da lista.');
    }

    setIsProcessingBatch(true);
    try {
      const targetLoja =
        userRole === 'lojista' && loggedStore
          ? loggedStore.slug
          : selectedStoreFilter !== 'todos'
          ? selectedStoreFilter
          : 'clarice';

      const parsed: AffiliateProduct[] = [];

      for (let i = 0; i < limitedLines.length; i++) {
        const url = limitedLines[i];
        const isShopee = url.includes('shopee.com') || url.includes('shp.ee');

        if (isShopee) {
          const slugMatch = url.match(/shopee\.com\.br\/([^?]+)-i\./i);
          const slug = slugMatch ? decodeURIComponent(slugMatch[1]).replace(/[-_]+/g, ' ').trim() : '';
          const title = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : `Oferta Shopee #${i + 1}`;
          const hashVal = Math.abs(hash(url) || Date.now() + i);
          const mlbId = `SHP-${String(hashVal).slice(0, 8)}`;
          const origPrice = 79.9 + (hashVal % 180) + 0.9;
          const disc = 20 + (hashVal % 35);
          const curPrice = Math.round(origPrice * (100 - disc)) / 100;

          parsed.push({
            id: `${mlbId}-${Date.now()}-${i}`,
            mlbId,
            title,
            originalPrice: origPrice,
            currentPrice: curPrice,
            discountPercent: disc,
            installmentsText: 'em até 6x sem juros',
            imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
            affiliateUrl: url,
            category: batchDefaultCategory,
            freeShipping: true,
            isFull: false,
            rating: 4.8,
            reviewsCount: 190,
            featured: false,
            status: 'ativo',
            marketplace: 'shopee',
            lojaSlug: targetLoja,
          });
        } else {
          // Mercado Livre
          const p = productFromUrl(url, batchDefaultCategory, url, true);
          if (p) {
            parsed.push({
              ...p,
              marketplace: 'mercadolivre',
              lojaSlug: targetLoja,
              status: 'ativo',
            });
          } else {
            const mlb = extractMlbId(url) || `MLB-${Date.now().toString().slice(-8)}`;
            const origPrice = 129.9;
            const disc = 25;
            const curPrice = Math.round(origPrice * (100 - disc)) / 100;
            parsed.push({
              id: `${mlb}-${Date.now()}-${i}`,
              mlbId: mlb,
              title: `Produto Mercado Livre ${mlb}`,
              originalPrice: origPrice,
              currentPrice: curPrice,
              discountPercent: disc,
              installmentsText: 'em até 6x sem juros',
              imageUrl: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=600&q=80',
              affiliateUrl: url,
              category: batchDefaultCategory,
              freeShipping: true,
              isFull: true,
              rating: 4.9,
              reviewsCount: 320,
              featured: false,
              status: 'ativo',
              marketplace: 'mercadolivre',
              lojaSlug: targetLoja,
            });
          }
        }
      }

      setBatchParsedProducts(parsed);
      toast.success(`${parsed.length} link(s) processado(s) com sucesso! Confira a prévia.`);
    } catch (err: any) {
      toast.error(`Erro ao processar lote: ${err?.message || 'Falha ao analisar links'}`);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Salvar Todos os Produtos do Lote
  const handleSaveBatch = async () => {
    if (batchParsedProducts.length === 0) return;

    const targetLoja =
      userRole === 'lojista' && loggedStore
        ? loggedStore.slug
        : selectedStoreFilter !== 'todos'
        ? selectedStoreFilter
        : 'clarice';

    // Trava de limite de produtos para plano Start (máximo 50)
    if (userRole === 'lojista' && loggedStore?.plano === 'start') {
      const currentCount = c.products.filter((p) => p.lojaSlug === targetLoja).length;
      const limit = 50;
      if (currentCount + batchParsedProducts.length > limit) {
        const remaining = Math.max(0, limit - currentCount);
        toast.error(
          `⚠️ Limite de 50 produtos do Plano Start atingido! Você possui ${currentCount} produtos ativos. Vagas restantes: ${remaining}. Faça upgrade para o Plano Pro na aba 'Minha Assinatura' para cadastrar produtos ilimitados!`
        );
        return;
      }
    }

    setIsSavingBatch(true);
    try {
      c.add(batchParsedProducts);

      if (isSupabaseConfigured) {
        const rows = batchParsedProducts.map((p) => ({
          id: p.id,
          mlb_id: p.mlbId,
          title: p.title,
          original_price: p.originalPrice,
          current_price: p.currentPrice,
          discount_percent: p.discountPercent,
          installments_text: p.installmentsText,
          image_url: p.imageUrl,
          affiliate_url: p.affiliateUrl,
          category: p.category,
          free_shipping: p.freeShipping,
          is_full: p.isFull,
          rating: p.rating,
          reviews_count: p.reviewsCount,
          featured: p.featured,
          active: true,
          status: 'ativo',
          marketplace: p.marketplace,
          loja_slug: p.lojaSlug,
        }));

        await supabase.from('produtos_clarice').insert(rows);
      }

      toast.success(`🎉 ${batchParsedProducts.length} produtos importados com sucesso na sua vitrine!`);
      setBatchLinksText('');
      setBatchParsedProducts([]);
      setProductInputMode('individual');
    } catch (err: any) {
      toast.error(`Erro ao salvar lote: ${err?.message || 'Falha ao salvar'}`);
    } finally {
      setIsSavingBatch(false);
    }
  };

  // Checagem de autenticação no sessionStorage
  useEffect(() => {
    try {
      const auth = sessionStorage.getItem('clarice_admin_authenticated');
      const savedRole = sessionStorage.getItem('clarice_admin_role') as UserRole | null;
      const savedStoreSlug = sessionStorage.getItem('clarice_admin_store_slug');

      if (auth === 'true') {
        setIsAuthenticated(true);
        if (savedRole) setUserRole(savedRole);
        if (savedRole === 'lojista' && savedStoreSlug) {
          fetchStoreBySlug(savedStoreSlug).then((s) => {
            setLoggedStore(s);
            populateBrandingForm(s);
          });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Preenche formulário de branding do lojista
  const populateBrandingForm = (store: LojaAfiliado) => {
    setStoreBrandName(store.nomeLoja);
    setStoreBrandSubtitle(store.subtitulo || '');
    setStoreBrandPrimaryColor(store.corPrimaria || '#0F172A');
    setStoreBrandAccentColor(store.corDestaque || '#FFE600');
    setStoreBrandLogoUrl(store.logoUrl || '');
    setStoreBrandMascoteUrl(store.heroMascoteUrl || '');
    setStoreBrandWhatsappVip(store.whatsappVipUrl || '');
    setStoreBrandInstagram(store.instagramUrl || '');
    setStoreBrandDomain(store.dominioCustomizado || '');
  };

  // Carrega lojas SaaS para o Super Admin
  const loadStores = async () => {
    setLoadingStores(true);
    try {
      const data = await listAllStores();
      setStores(data);
    } catch {
      toast.error('Erro ao carregar lojas SaaS.');
    } finally {
      setLoadingStores(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && userRole === 'super_admin') {
      loadStores();
    }
  }, [isAuthenticated, userRole]);

  // Login Super Admin via PIN
  const handlePinSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (DEFAULT_PIN && pinInput.trim() === DEFAULT_PIN) {
      try {
        sessionStorage.setItem('clarice_admin_authenticated', 'true');
        sessionStorage.setItem('clarice_admin_role', 'super_admin');
        sessionStorage.removeItem('clarice_admin_store_slug');
      } catch {
        // ignore
      }
      setUserRole('super_admin');
      setIsAuthenticated(true);
      setPinError(false);
      toast.success('Acesso concedido como Super Admin!');
    } else {
      setPinError(true);
      toast.error('PIN incorreto. Tente novamente.');
    }
  };

  // Login Lojista via E-mail + Senha
  const handleLojistaLogin = async (e: FormEvent) => {
    e.preventDefault();
    const email = lojistaEmailInput.trim().toLowerCase();
    const password = lojistaPasswordInput.trim();

    if (!email || !email.includes('@')) {
      toast.error('Informe um e-mail válido.');
      return;
    }

    setLojistaLoginLoading(true);
    try {
      const store = await fetchStoreByOwnerEmail(email);
      if (!store) {
        toast.error('Nenhuma loja encontrada para este e-mail. Fale com o suporte ou crie sua conta.');
        return;
      }

      // Validação de senha com compatibilidade para lojas antigas
      if (store.ownerPassword && store.ownerPassword.trim() !== '') {
        if (!password) {
          toast.error('Informe sua senha de acesso.');
          return;
        }
        if (password !== store.ownerPassword.trim()) {
          toast.error('Senha incorreta para esta loja. Tente novamente.');
          return;
        }
      } else {
        // Loja antiga sem senha: se o lojista digitou uma senha, salva para os próximos logins
        if (password) {
          updateStorePassword(store.slug, password).catch(() => {});
        }
      }

      try {
        sessionStorage.setItem('clarice_admin_authenticated', 'true');
        sessionStorage.setItem('clarice_admin_role', 'lojista');
        sessionStorage.setItem('clarice_admin_store_slug', store.slug);
      } catch {
        // ignore
      }

      setUserRole('lojista');
      setLoggedStore(store);
      populateBrandingForm(store);
      setIsAuthenticated(true);
      toast.success(`Bem-vindo de volta ao painel da loja ${store.nomeLoja}!`);
    } catch (err) {
      toast.error('Falha ao autenticar lojista.');
    } finally {
      setLojistaLoginLoading(false);
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('clarice_admin_authenticated');
      sessionStorage.removeItem('clarice_admin_role');
      sessionStorage.removeItem('clarice_admin_store_slug');
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setLoggedStore(null);
    setPinInput('');
    setLojistaEmailInput('');
    setLojistaPasswordInput('');
  };

  // Transição segura de abas com React.startTransition
  const handleTabChange = (value: string) => {
    startTransition(() => {
      setActiveTab(value);
    });
  };

  // Cálculo automático do desconto
  const discountPercent = useMemo(() => {
    const cur = parseFloat(productCurrentPrice.replace(',', '.')) || 0;
    const orig = parseFloat(productOriginalPrice.replace(',', '.')) || 0;
    if (orig > 0 && cur > 0 && orig > cur) {
      return Math.round(((orig - cur) / orig) * 100);
    }
    return 0;
  }, [productCurrentPrice, productOriginalPrice]);

  // Função para puxar metadados OpenGraph ou extrair da URL
  const handleFetchOgMetadata = async () => {
    const url = productAffiliateUrl.trim();
    if (!url) {
      toast.info('Cole primeiro a URL do produto antes de puxar os metadados.');
      return;
    }

    setIsFetchingOg(true);
    try {
      if (url.includes('shopee.com') || url.includes('shp.ee')) {
        setProductMarketplace('shopee');
        const slugMatch = url.match(/shopee\.com\.br\/([^?]+)-i\./i);
        if (slugMatch && !productTitle) {
          const autoTitle = decodeURIComponent(slugMatch[1]).replace(/-/g, ' ');
          setProductTitle(autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1));
        }
        if (!productImageUrl) {
          setProductImageUrl('https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80');
        }
        toast.success('Metadados da Shopee detectados!');
      } else if (url.includes('mercadolivre.com') || url.includes('meli.la')) {
        setProductMarketplace('mercadolivre');
        const mlb = extractMlbId(url);
        if (mlb && !productTitle) {
          setProductTitle(`Produto Mercado Livre ${mlb}`);
        }
        if (!productImageUrl) {
          setProductImageUrl('https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=600&q=80');
        }
        toast.success('Metadados do Mercado Livre detectados!');
      } else {
        toast.info('URL detectada. Preencha os campos abaixo.');
      }
    } finally {
      setIsFetchingOg(false);
    }
  };

  // Salvar Produto (Novo ou Edição)
  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();

    if (!productTitle.trim()) {
      toast.error('Informe o título do produto.');
      return;
    }
    if (!productAffiliateUrl.trim()) {
      toast.error('Informe o link de afiliado oficial.');
      return;
    }

    const curPrice = parseFloat(productCurrentPrice.replace(',', '.')) || 0;
    const origPrice = parseFloat(productOriginalPrice.replace(',', '.')) || curPrice;

    const mlbId =
      productMarketplace === 'mercadolivre'
        ? extractMlbId(productAffiliateUrl) || `MLB-${Date.now().toString().slice(-8)}`
        : `SHP-${Date.now().toString().slice(-8)}`;

    // Destina o produto estritamente à loja do lojista se for lojista assinante
    const assignedLojaSlug =
      userRole === 'lojista' && loggedStore
        ? loggedStore.slug
        : (selectedStoreFilter === 'todos' ? 'clarice' : selectedStoreFilter);

    // Trava de limite de produtos para plano Start (máximo 50)
    if (userRole === 'lojista' && loggedStore?.plano === 'start' && !editingProductId) {
      const currentCount = c.products.filter((p) => p.lojaSlug === assignedLojaSlug).length;
      if (currentCount >= 50) {
        toast.error(
          `⚠️ Limite de 50 produtos do Plano Start atingido! Você possui 50 produtos ativos. Faça upgrade para o Plano Pro na aba 'Minha Assinatura' para cadastrar produtos ilimitados!`
        );
        return;
      }
    }

    const newProduct: AffiliateProduct = {
      id: editingProductId || `${mlbId}-${Date.now()}`,
      mlbId,
      title: productTitle.trim(),
      originalPrice: origPrice,
      currentPrice: curPrice,
      discountPercent,
      installmentsText: productInstallments.trim() || 'À vista',
      imageUrl: productImageUrl.trim() || '/icons/icon-192x192.png',
      affiliateUrl: productAffiliateUrl.trim(),
      category: productCategory,
      badgeText: discountPercent >= 25 ? 'Oferta Relâmpago' : undefined,
      freeShipping: productFreeShipping,
      isFull: productIsFull,
      rating: 4.9,
      reviewsCount: 380,
      featured: productFeatured,
      status: productIsActive ? 'ativo' : 'inativo',
      marketplace: productMarketplace,
      lojaSlug: assignedLojaSlug,
    };

    // Atualiza estado local
    if (editingProductId) {
      c.add(c.products.map((p) => (p.id === editingProductId ? newProduct : p)));
      toast.success('Produto atualizado com sucesso!');
    } else {
      c.add([newProduct]);
      toast.success('Produto cadastrado com sucesso!');
    }

    // Persiste no Supabase
    if (isSupabaseConfigured) {
      try {
        const payload = {
          mlb_id: newProduct.mlbId,
          title: newProduct.title,
          original_price: newProduct.originalPrice,
          current_price: newProduct.currentPrice,
          discount_percent: newProduct.discountPercent,
          installments_text: newProduct.installmentsText,
          image_url: newProduct.imageUrl,
          affiliate_url: newProduct.affiliateUrl,
          category: newProduct.category,
          free_shipping: newProduct.freeShipping,
          is_full: newProduct.isFull,
          rating: newProduct.rating,
          reviews_count: newProduct.reviewsCount,
          featured: newProduct.featured,
          active: productIsActive,
          status: productIsActive ? 'ativo' : 'inativo',
          marketplace: newProduct.marketplace,
          loja_slug: newProduct.lojaSlug,
        };

        if (editingProductId) {
          await supabase.from('produtos_clarice').update(payload).eq('id', editingProductId);
        } else {
          await supabase.from('produtos_clarice').insert({ id: newProduct.id, ...payload });
        }
      } catch (err) {
        console.warn('Aviso ao sincronizar produto no Supabase:', err);
      }
    }

    // Limpa formulário
    setEditingProductId(null);
    setProductTitle('');
    setProductAffiliateUrl('');
    setProductCurrentPrice('');
    setProductOriginalPrice('');
    setProductImageUrl('');
  };

  // Salvar Customização da Vitrine ("Minha Loja" - Lojista)
  const handleSaveStoreBrand = async (e: FormEvent) => {
    e.preventDefault();
    if (!loggedStore) return;

    setIsSavingBrand(true);
    try {
      const updated = await updateStoreBranding(loggedStore.slug, {
        nomeLoja: storeBrandName.trim(),
        subtitulo: storeBrandSubtitle.trim(),
        corPrimaria: storeBrandPrimaryColor,
        corDestaque: storeBrandAccentColor,
        logoUrl: storeBrandLogoUrl.trim(),
        heroMascoteUrl: storeBrandMascoteUrl.trim(),
        whatsappVipUrl: storeBrandWhatsappVip.trim(),
        instagramUrl: storeBrandInstagram.trim(),
        dominioCustomizado: storeBrandDomain.trim(),
      });

      if (updated) {
        setLoggedStore(updated);
        toast.success('Identidade e personalização da sua vitrine salvas com sucesso!');
      }
    } catch {
      toast.error('Erro ao salvar customização da vitrine.');
    } finally {
      setIsSavingBrand(false);
    }
  };

  // Gerar Checkout / Cobrança Asaas (Lojista)
  const handleGenerateAsaasCheckout = async () => {
    if (!loggedStore) return;

    setIsGeneratingAsaas(true);
    try {
      const res = await createAsaasCheckout({
        loja_slug: loggedStore.slug,
        nome: loggedStore.nomeLoja,
        email: loggedStore.ownerEmail || 'lojista@exemplo.com.br',
        plano: loggedStore.plano,
      });

      if (res.success && res.paymentUrl) {
        setLoggedStore((prev) => prev ? { ...prev, asaasPaymentUrl: res.paymentUrl } : prev);
        toast.success('Link de pagamento Asaas gerado com sucesso!');
        window.open(res.paymentUrl, '_blank', 'noopener,noreferrer');
      } else {
        toast.error(res.error || 'Não foi possível gerar a fatura Asaas.');
      }
    } catch {
      toast.error('Erro na conexão com a API Asaas.');
    } finally {
      setIsGeneratingAsaas(false);
    }
  };

  // Alternar Status de Assinatura com startTransition (Super Admin)
  const handleToggleStoreStatus = (storeId: string, currentStatus: SubscriptionStatus) => {
    const nextStatus: SubscriptionStatus = currentStatus === 'ativo' ? 'inadimplente' : 'ativo';

    startTransition(async () => {
      setStores((prev) =>
        prev.map((s) => (s.id === storeId ? { ...s, statusAssinatura: nextStatus } : s))
      );

      const ok = await updateStoreSubscriptionStatus(storeId, nextStatus);
      if (ok) {
        toast.success(`Status da loja atualizado para ${nextStatus.toUpperCase()}!`);
      } else {
        toast.error('Erro ao salvar status no banco de dados.');
      }
    });
  };

  // Aprovar Loja Pendente (Super Admin)
  const handleApproveStore = (storeId: string) => {
    startTransition(async () => {
      const ok = await approveStore(storeId);
      if (ok) {
        setStores((prev) =>
          prev.map((s) => (s.id === storeId ? { ...s, statusAssinatura: 'ativo' } : s))
        );
        toast.success('Loja aprovada e liberada com sucesso!');
      } else {
        toast.error('Erro ao aprovar loja.');
      }
    });
  };

  // Recusar / Suspender Loja (Super Admin)
  const handleRejectStore = (storeId: string) => {
    startTransition(async () => {
      const ok = await rejectStore(storeId);
      if (ok) {
        setStores((prev) =>
          prev.map((s) => (s.id === storeId ? { ...s, statusAssinatura: 'suspenso' } : s))
        );
        toast.success('Loja suspensa/recusada.');
      } else {
        toast.error('Erro ao suspender loja.');
      }
    });
  };

  // Criar Nova Loja (Super Admin)
  const handleCreateStoreSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newStoreSlug.trim() || !newStoreName.trim()) {
      toast.error('Informe ao menos o slug e o nome da loja.');
      return;
    }

    try {
      const created = await createStore({
        slug: newStoreSlug,
        nomeLoja: newStoreName,
        subtitulo: newStoreSubtitle,
        plano: newStorePlan,
        corPrimaria: newStorePrimaryColor,
        corDestaque: newStoreAccentColor,
        whatsappVipUrl: newStoreWhatsapp,
        instagramUrl: newStoreInstagram,
        shopeeAppId: newStoreShopeeAppId,
        shopeeSecret: newStoreShopeeSecret,
        ownerEmail: newStoreOwnerEmail,
        dominioCustomizado: newStoreDomain,
      });

      setStores((prev) => [created, ...prev.filter((s) => s.slug !== created.slug)]);
      setNewStoreModal(false);
      toast.success(`Loja "${created.nomeLoja}" cadastrada com sucesso!`);

      // Limpa form
      setNewStoreSlug('');
      setNewStoreName('');
      setNewStoreSubtitle('');
      setNewStoreOwnerEmail('');
      setNewStoreDomain('');
      setNewStoreWhatsapp('');
      setNewStoreInstagram('');
      setNewStoreShopeeAppId('');
      setNewStoreShopeeSecret('');
    } catch {
      toast.error('Erro ao cadastrar loja.');
    }
  };

  // Métricas do SaaS (Super Admin)
  const saasMetrics = useMemo(() => {
    const total = stores.length;
    const active = stores.filter((s) => s.statusAssinatura === 'ativo').length;
    const pending = stores.filter((s) => s.statusAssinatura === 'pendente').length;
    const suspended = stores.filter(
      (s) => s.statusAssinatura === 'inadimplente' || s.statusAssinatura === 'suspenso'
    ).length;
    const mrr = stores
      .filter((s) => s.statusAssinatura === 'ativo')
      .reduce((acc, s) => acc + (PLANO_PRICES[s.plano]?.value || 67), 0);
    return { total, active, pending, suspended, mrr };
  }, [stores]);

  const pendingStores = useMemo(() => {
    return stores.filter((s) => s.statusAssinatura === 'pendente');
  }, [stores]);

  // Produtos filtrados para a listagem
  const filteredProducts = useMemo(() => {
    return c.products.filter((p) => {
      // Se for lojista, isolamento rigoroso por slug
      if (userRole === 'lojista' && loggedStore) {
        if (p.lojaSlug !== loggedStore.slug) return false;
      }

      const matchesSearch =
        !productSearch.trim() ||
        p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.mlbId.toLowerCase().includes(productSearch.toLowerCase());
      const matchesMarket =
        marketFilter === 'todos' || (p.marketplace || 'mercadolivre') === marketFilter;
      return matchesSearch && matchesMarket;
    });
  }, [c.products, productSearch, marketFilter, userRole, loggedStore]);

  // Produtos disponíveis para o Disparador VIP
  const filteredVipProducts = useMemo(() => {
    return c.products.filter((p) => {
      if (userRole === 'lojista' && loggedStore) {
        if (p.lojaSlug !== loggedStore.slug) return false;
      }
      if (p.status === 'inativo') return false;
      if (vipSearch.trim()) {
        const q = vipSearch.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !p.mlbId.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [c.products, userRole, loggedStore, vipSearch]);

  const todayStr = getTodayDateStr();
  const dispatchedTodayCount = useMemo(() => {
    return filteredVipProducts.filter((p) => disparosMap[p.id] === todayStr).length;
  }, [filteredVipProducts, disparosMap, todayStr]);

  const nonDispatchedCount = filteredVipProducts.length - dispatchedTodayCount;

  const displayedVipProducts = useMemo(() => {
    if (vipFilter === 'disparados') {
      return filteredVipProducts.filter((p) => disparosMap[p.id] === todayStr);
    }
    if (vipFilter === 'nao_disparados') {
      return filteredVipProducts.filter((p) => disparosMap[p.id] !== todayStr);
    }
    return filteredVipProducts;
  }, [filteredVipProducts, vipFilter, disparosMap, todayStr]);

  // =========================================================================
  // TELA DE LOGIN (DUAL: SUPER ADMIN PIN OU LOJISTA E-MAIL)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFE600]/10 text-[#FFE600]">
            <KeyRound className="h-8 w-8" />
          </div>
          <h1 className="text-center text-xl font-black tracking-tight sm:text-2xl">
            Acesso ao Painel Clarice
          </h1>
          <p className="mt-2 text-center text-xs text-slate-400">
            Selecione seu perfil de acesso para gerenciar sua vitrine ou a plataforma SaaS.
          </p>

          {/* Seletor de Perfil de Login */}
          <div className="mt-6 flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setLoginMode('pin')}
              className={cn(
                'flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5',
                loginMode === 'pin' ? 'bg-[#FFE600] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              )}
            >
              <Crown className="h-3.5 w-3.5" /> Super Admin
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('email')}
              className={cn(
                'flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5',
                loginMode === 'email' ? 'bg-[#FFE600] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              )}
            >
              <Store className="h-3.5 w-3.5" /> Lojista Assinante
            </button>
          </div>

          {loginMode === 'pin' ? (
            <form onSubmit={handlePinSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  PIN Mestre do Super Admin
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  maxLength={40}
                  autoFocus
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="••••••••"
                  className={cn(
                    'w-full rounded-2xl border bg-slate-950 px-4 py-3.5 text-center text-lg font-bold tracking-widest text-white outline-none transition focus:ring-2 focus:ring-[#FFE600]',
                    pinError ? 'border-red-500' : 'border-slate-800'
                  )}
                />
                {pinError && (
                  <p className="mt-1.5 text-center text-xs text-red-400 font-semibold">
                    PIN incorreto. Verifique a chave configurada.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-[#FFE600] py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 active:scale-[0.98] transition"
              >
                Entrar como Super Admin
              </button>
            </form>
          ) : (
            <form onSubmit={handleLojistaLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  E-mail do Lojista Cadastrado
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={lojistaEmailInput}
                    onChange={(e) => setLojistaEmailInput(e.target.value)}
                    placeholder="seuemail@exemplo.com.br"
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-3.5 text-sm font-semibold text-white outline-none transition focus:ring-2 focus:ring-[#FFE600]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showLojistaPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={lojistaPasswordInput}
                    onChange={(e) => setLojistaPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 pl-10 pr-10 py-3.5 text-sm font-semibold text-white outline-none transition focus:ring-2 focus:ring-[#FFE600]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLojistaPassword(!showLojistaPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    title={showLojistaPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showLojistaPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Acesso seguro restrito exclusivamente ao catálogo da sua vitrine afiliada.
                </p>
              </div>

              <button
                type="submit"
                disabled={lojistaLoginLoading}
                className="w-full rounded-2xl bg-[#FFE600] py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 active:scale-[0.98] transition disabled:opacity-50"
              >
                {lojistaLoginLoading ? 'Verificando loja...' : 'Entrar na Minha Loja'}
              </button>

              <div className="pt-2 text-center">
                <a
                  href="/criar-loja"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FFE600] hover:underline transition"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Ainda não tem uma loja? Criar minha loja
                </a>
              </div>
            </form>
          )}

          <a
            href="/"
            className="mt-4 block text-center text-xs text-slate-400 hover:text-white transition"
          >
            ← Voltar para a vitrine pública
          </a>
        </div>
        <Toaster position="bottom-center" richColors />
      </div>
    );
  }

  // =========================================================================
  // PAINEL AUTENTICADO (SUPER ADMIN OU LOJISTA ISOLADO)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#0B1329] text-slate-100">
      {/* Header do Painel */}
      <header className="border-b border-slate-800 bg-[#0F172A]/90 backdrop-blur-md sticky top-0 z-30 px-4 py-3.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href={userRole === 'lojista' && loggedStore ? `/?loja=${loggedStore.slug}` : '/'}
              target={userRole === 'lojista' && loggedStore ? '_blank' : undefined}
              rel={userRole === 'lojista' && loggedStore ? 'noreferrer' : undefined}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
              title={userRole === 'lojista' ? 'Ver Minha Vitrine (Nova Aba)' : 'Ver vitrine pública'}
            >
              <ArrowLeft className="h-4 w-4" />
            </a>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {userRole === 'super_admin'
                    ? 'Painel Super Admin • Clarice SaaS'
                    : `Gestão • ${loggedStore?.nomeLoja || 'Minha Loja'}`}
                </h1>
                {userRole === 'super_admin' ? (
                  <span className="rounded-md bg-[#FFE600]/20 px-2 py-0.5 text-[10px] font-black uppercase text-[#FFE600] flex items-center gap-1">
                    <Crown className="h-3 w-3" /> Super Admin
                  </span>
                ) : (
                  <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1">
                    <Store className="h-3 w-3" /> Lojista ({loggedStore?.slug})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                {userRole === 'super_admin'
                  ? 'Controle mestre de assinaturas Asaas, vitrines e automações.'
                  : `Gerencie seu catálogo exclusivo, personalize sua vitrine e acompanhe sua assinatura.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {userRole === 'lojista' && loggedStore && (
              <a
                href={`/?loja=${loggedStore.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFE600] hover:bg-yellow-400 text-slate-950 px-3.5 py-2 text-xs font-black shadow-md shadow-yellow-500/20 transition active:scale-95"
                title="Abrir minha vitrine pública em nova aba"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>↗ Ver Minha Vitrine</span>
              </a>
            )}
            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal com Abas */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          {/* Barra de Abas: Super Admin e Lojista com 4 abas estruturadas */}
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-slate-900 border border-slate-800 p-1 rounded-2xl mb-6">
            {userRole === 'super_admin' ? (
              <>
                <TabsTrigger
                  value="produtos"
                  className="rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm py-2"
                >
                  <ShoppingBag className="h-4 w-4 mr-1.5" />
                  Produtos ({c.products.length})
                </TabsTrigger>
                <TabsTrigger
                  value="saas"
                  className="rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm py-2"
                >
                  <Users className="h-4 w-4 mr-1.5" />
                  Clientes SaaS ({stores.length})
                </TabsTrigger>
                <TabsTrigger
                  value="radar"
                  className="rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm py-2"
                >
                  <Zap className="h-4 w-4 mr-1.5" />
                  Fila do Radar ({c.pendingProducts.length})
                </TabsTrigger>
                <TabsTrigger
                  value="config"
                  className="rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm py-2"
                >
                  <Settings className="h-4 w-4 mr-1.5" />
                  Configurações
                </TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger
                  value="produtos"
                  className="rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm py-2"
                >
                  <ShoppingBag className="h-4 w-4 mr-1.5" />
                  Meus Produtos ({filteredProducts.length})
                </TabsTrigger>
                <TabsTrigger
                  value="disparador-vip"
                  className="rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm py-2"
                >
                  <MessageCircle className="h-4 w-4 mr-1.5" />
                  Disparador VIP
                </TabsTrigger>
                <TabsTrigger
                  value="minha-loja"
                  className="rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm py-2"
                >
                  <Palette className="h-4 w-4 mr-1.5" />
                  Minha Loja
                </TabsTrigger>
                <TabsTrigger
                  value="minha-assinatura"
                  className="rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm py-2"
                >
                  <CreditCard className="h-4 w-4 mr-1.5" />
                  Minha Assinatura
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* ========================================================================= */}
          {/* ABA 1: PRODUTOS (MEUS PRODUTOS OU GERAL) */}
          {/* ========================================================================= */}
          <TabsContent value="produtos" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Formulário de Cadastro / Edição */}
              <div className="lg:col-span-5 rounded-3xl border border-slate-800 bg-[#0F172A] p-5 shadow-xl">
                {/* Seletor de Modo: Cadastro Individual vs. Importação em Lote */}
                <div className="flex rounded-2xl bg-slate-950 p-1 border border-slate-800 mb-4">
                  <button
                    type="button"
                    onClick={() => setProductInputMode('individual')}
                    className={cn(
                      'flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5',
                      productInputMode === 'individual'
                        ? 'bg-[#FFE600] text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{editingProductId ? 'Editar Oferta' : 'Cadastro Individual'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProductId(null);
                      setProductInputMode('batch');
                    }}
                    className={cn(
                      'flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5',
                      productInputMode === 'batch'
                        ? 'bg-[#FFE600] text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span>⚡ Importar em Lote</span>
                  </button>
                </div>

                {productInputMode === 'individual' ? (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-[#FFE600]" />
                        <h2 className="font-black text-white text-base">
                          {editingProductId ? 'Editar Oferta' : 'Cadastrar Nova Oferta'}
                        </h2>
                      </div>
                      {editingProductId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProductId(null);
                            setProductTitle('');
                            setProductAffiliateUrl('');
                            setProductCurrentPrice('');
                            setProductOriginalPrice('');
                            setProductImageUrl('');
                          }}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleSaveProduct} className="space-y-4">
                  {/* Seletor de Marketplace */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Marketplace de Origem
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setProductMarketplace('mercadolivre')}
                        className={cn(
                          'flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition',
                          productMarketplace === 'mercadolivre'
                            ? 'bg-[#FFE600] text-slate-950 border-[#FFE600] shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        )}
                      >
                        <span className="h-2 w-2 rounded-full bg-[#FFE600] ring-1 ring-slate-950" />
                        Mercado Livre
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductMarketplace('shopee')}
                        className={cn(
                          'flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition',
                          productMarketplace === 'shopee'
                            ? 'bg-[#EE4D2D] text-white border-[#EE4D2D] shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        )}
                      >
                        <span className="h-2 w-2 rounded-full bg-[#EE4D2D] ring-1 ring-white" />
                        Shopee
                      </button>
                    </div>
                  </div>

                  {/* URL de Afiliado com Auto-Detection */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Link de Afiliado Oficial
                      </label>
                      <button
                        type="button"
                        onClick={handleFetchOgMetadata}
                        disabled={isFetchingOg}
                        className="text-[11px] font-bold text-[#FFE600] hover:underline flex items-center gap-1 disabled:opacity-50"
                      >
                        <Sparkles className="h-3 w-3" />
                        {isFetchingOg ? 'Detectando...' : 'Puxar Dados'}
                      </button>
                    </div>
                    <input
                      type="url"
                      required
                      value={productAffiliateUrl}
                      onChange={(e) => setProductAffiliateUrl(e.target.value)}
                      placeholder={
                        productMarketplace === 'mercadolivre'
                          ? 'https://meli.la/... ou https://mercadolivre.com/sec/...'
                          : 'https://s.shopee.com.br/... ou https://shopee.com.br/...'
                      }
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#FFE600]"
                    />
                  </div>

                  {/* Título do Produto */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Título do Produto
                    </label>
                    <input
                      type="text"
                      required
                      value={productTitle}
                      onChange={(e) => setProductTitle(e.target.value)}
                      placeholder="Ex: Fritadeira Air Fryer 4L Inox 110V"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#FFE600]"
                    />
                  </div>

                  {/* Preços e % Desconto */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Preço Atual (R$)
                      </label>
                      <input
                        type="text"
                        required
                        value={productCurrentPrice}
                        onChange={(e) => setProductCurrentPrice(e.target.value)}
                        placeholder="Ex: 279,90"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-emerald-400 outline-none focus:ring-2 focus:ring-[#FFE600]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Preço Original (R$)
                      </label>
                      <input
                        type="text"
                        value={productOriginalPrice}
                        onChange={(e) => setProductOriginalPrice(e.target.value)}
                        placeholder="Ex: 399,90"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-400 outline-none focus:ring-2 focus:ring-[#FFE600]"
                      />
                    </div>
                  </div>

                  {/* Categoria & Parcelamento */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Categoria
                      </label>
                      <select
                        value={productCategory}
                        onChange={(e) => setProductCategory(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-[#FFE600]"
                      >
                        {CATEGORIES.filter((c) => c !== 'Todos').map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Parcelas
                      </label>
                      <input
                        type="text"
                        value={productInstallments}
                        onChange={(e) => setProductInstallments(e.target.value)}
                        placeholder="Ex: em 6x sem juros"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-[#FFE600]"
                      />
                    </div>
                  </div>

                  {/* URL da Imagem com Botão de Upload */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-300">
                        Imagem do Produto
                      </label>
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[#FFE600] rounded-lg text-[11px] font-bold cursor-pointer border border-slate-700 transition">
                        {uploadingProductImage ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Camera className="h-3.5 w-3.5" />
                        )}
                        <span>{uploadingProductImage ? 'Enviando...' : '📷 Enviar Foto'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/jpg"
                          className="hidden"
                          disabled={uploadingProductImage}
                          onChange={handleProductImageUpload}
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={productImageUrl}
                        onChange={(e) => setProductImageUrl(e.target.value)}
                        placeholder="https://... ou envie a foto acima"
                        className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#FFE600]"
                      />
                      {productImageUrl && (
                        <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center p-0.5">
                          <img
                            src={productImageUrl}
                            alt="Prévia"
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                      <Switch checked={productFreeShipping} onCheckedChange={setProductFreeShipping} />
                      Frete Grátis
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                      <Switch checked={productFeatured} onCheckedChange={setProductFeatured} />
                      Destaque Carrossel
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-[#FFE600] py-3 text-xs sm:text-sm font-black text-slate-950 shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 active:scale-[0.98] transition mt-2"
                  >
                    {editingProductId ? 'Salvar Alterações' : 'Publicar na Vitrine'}
                  </button>
                </form>
              </>
            ) : (
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3 mb-1">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-[#FFE600]" />
                    <h2 className="font-black text-white text-base">
                      Importação em Lote (ML / Shopee)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Cole uma lista de links oficiais. O robô extrai os dados e prepara as ofertas automaticamente.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      Lista de Links (1 por linha)
                    </label>
                    <span className="text-[11px] text-[#FFE600] font-bold">
                      Máx. 20 por lote
                    </span>
                  </div>
                  <textarea
                    rows={7}
                    value={batchLinksText}
                    onChange={(e) => setBatchLinksText(e.target.value)}
                    placeholder={"https://meli.la/123456\nhttps://s.shopee.com.br/...\nhttps://produto.mercadolivre.com.br/MLB-..."}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-3.5 text-xs text-white font-mono leading-relaxed outline-none focus:ring-2 focus:ring-[#FFE600]"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Suporta links do Mercado Livre (mercadolivre.com / meli.la) e Shopee (shopee.com.br / shp.ee).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Categoria Padrão do Lote
                  </label>
                  <select
                    value={batchDefaultCategory}
                    onChange={(e) => setBatchDefaultCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-[#FFE600]"
                  >
                    {CATEGORIES.filter((c) => c !== 'Todos').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={!batchLinksText.trim() || isProcessingBatch}
                  onClick={handleProcessBatch}
                  className="w-full rounded-2xl bg-slate-800 hover:bg-slate-700 py-3 text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-2 transition disabled:opacity-50 border border-slate-700"
                >
                  {isProcessingBatch ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#FFE600]" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-[#FFE600]" />
                  )}
                  <span>{isProcessingBatch ? 'Processando links...' : '🔍 Processar & Visualizar Lote'}</span>
                </button>

                {/* Prévia dos Produtos do Lote */}
                {batchParsedProducts.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>Prévia Identificada ({batchParsedProducts.length} itens)</span>
                      <button
                        type="button"
                        onClick={() => setBatchParsedProducts([])}
                        className="text-[11px] text-red-400 hover:underline"
                      >
                        Limpar Prévia
                      </button>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {batchParsedProducts.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                          <img src={p.imageUrl} alt="" className="h-10 w-10 rounded-lg object-contain bg-white p-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-white truncate">{p.title}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span className={cn(
                                'px-1 py-0.2 rounded font-bold uppercase text-[9px]',
                                p.marketplace === 'shopee' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'
                              )}>
                                {p.marketplace === 'shopee' ? 'Shopee' : 'Mercado Livre'}
                              </span>
                              <span className="text-emerald-400 font-bold">{formatBRL(p.currentPrice)}</span>
                              <span>• {p.category}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={isSavingBatch}
                      onClick={handleSaveBatch}
                      className="w-full rounded-2xl bg-[#FFE600] hover:bg-yellow-400 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-lg shadow-yellow-500/20 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSavingBatch ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                      ) : (
                        <Zap className="h-4 w-4 text-slate-950" />
                      )}
                      <span>{isSavingBatch ? 'Salvando lote...' : `Salvar Todos na Minha Loja (${batchParsedProducts.length})`}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Listagem de Produtos */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-[#0F172A] p-5 shadow-xl">
            {/* Indicador de Limite do Plano para Lojista */}
            {userRole === 'lojista' && loggedStore && (
              <div className="mb-4 px-3.5 py-2.5 rounded-2xl border border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Store className="h-3.5 w-3.5 text-[#FFE600]" />
                  <span className="text-slate-300">
                    Plano: <strong className="text-white uppercase">{loggedStore.plano}</strong>
                  </span>
                </div>
                <div className="text-slate-400 font-medium">
                  {loggedStore.plano === 'start' ? (
                    <span>
                      <strong className="text-[#FFE600]">{c.products.filter((p) => p.lojaSlug === loggedStore.slug).length}</strong>/50 produtos cadastrados
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold">
                      Produtos Ilimitados ({c.products.filter((p) => p.lojaSlug === loggedStore.slug).length} ativos)
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
                  <div>
                    <h2 className="font-black text-white text-base">
                      {userRole === 'lojista' ? 'Produtos da Minha Loja' : 'Catálogo Geral de Produtos'} ({filteredProducts.length})
                    </h2>
                    <p className="text-xs text-slate-400">
                      {userRole === 'lojista'
                        ? 'Itens cadastrados para a sua vitrine exclusiva.'
                        : 'Ofertas ativas no Mercado Livre e Shopee.'}
                    </p>
                  </div>

                  {/* Filtro de Busca & Marketplace */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Filtrar por nome ou ID..."
                      className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-[#FFE600] w-36 sm:w-44"
                    />
                    <select
                      value={marketFilter}
                      onChange={(e) => setMarketFilter(e.target.value as any)}
                      className="rounded-xl border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none"
                    >
                      <option value="todos">Todos</option>
                      <option value="mercadolivre">ML</option>
                      <option value="shopee">Shopee</option>
                    </select>
                  </div>
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <ShoppingBag className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    <p className="text-xs font-semibold">Nenhum produto cadastrado para esta visualização.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                    {filteredProducts.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 hover:border-slate-700 transition"
                      >
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="h-12 w-12 rounded-xl object-contain bg-white p-1 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span
                              className={cn(
                                'px-1.5 py-0.2 rounded text-[9px] font-black uppercase',
                                p.marketplace === 'shopee'
                                  ? 'bg-[#EE4D2D]/20 text-[#EE4D2D]'
                                  : 'bg-[#FFE600]/20 text-[#FFE600]'
                              )}
                            >
                              {p.marketplace === 'shopee' ? 'Shopee' : 'ML'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono truncate">{p.mlbId}</span>
                            {p.featured && (
                              <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1 rounded">
                                ⭐ Destaque
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-white truncate">{p.title}</p>
                          <p className="text-xs font-extrabold text-emerald-400">
                            {formatBRL(p.currentPrice)}{' '}
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({p.discountPercent}% OFF)
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProductId(p.id);
                              setProductTitle(p.title);
                              setProductAffiliateUrl(p.affiliateUrl);
                              setProductCurrentPrice(String(p.currentPrice));
                              setProductOriginalPrice(String(p.originalPrice));
                              setProductCategory(p.category);
                              setProductImageUrl(p.imageUrl);
                              setProductInstallments(p.installmentsText || 'À vista');
                              setProductFeatured(Boolean(p.featured));
                              setProductMarketplace(p.marketplace || 'mercadolivre');
                            }}
                            className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                            title="Editar oferta"
                          >
                            <Settings className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => c.remove(p.id)}
                            className="rounded-lg bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 transition"
                            title="Remover produto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 2 (LOJISTA): DISPARADOR VIP PARA WHATSAPP */}
          {/* ========================================================================= */}
          {userRole === 'lojista' && loggedStore && (
            <TabsContent value="disparador-vip" className="space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-[#0F172A] p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
                  <div>
                    <h2 className="font-black text-white text-base sm:text-lg flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                        <MessageCircle className="h-4 w-4 fill-current" />
                      </span>
                      Disparador VIP • Grupos de WhatsApp
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Gere copies persuasivas em 1 clique e envie para o seu Grupo VIP ou canais sem repetir promoções já enviadas hoje.
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-12">
                  {/* Coluna Esquerda: Lista de Produtos para Selecionar */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={vipSearch}
                        onChange={(e) => setVipSearch(e.target.value)}
                        placeholder="Buscar nos meus produtos..."
                        className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-[#FFE600]"
                      />
                    </div>

                    {/* Filtros de Status de Disparo */}
                    <div className="flex gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setVipFilter('todos')}
                        className={cn(
                          'flex-1 py-1.5 rounded-lg text-center transition',
                          vipFilter === 'todos' ? 'bg-[#FFE600] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                        )}
                      >
                        Todos ({filteredVipProducts.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setVipFilter('nao_disparados')}
                        className={cn(
                          'flex-1 py-1.5 rounded-lg text-center transition',
                          vipFilter === 'nao_disparados' ? 'bg-[#FFE600] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                        )}
                      >
                        Não Enviados ({nonDispatchedCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setVipFilter('disparados')}
                        className={cn(
                          'flex-1 py-1.5 rounded-lg text-center transition',
                          vipFilter === 'disparados' ? 'bg-[#FFE600] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                        )}
                      >
                        Disparados Hoje ({dispatchedTodayCount})
                      </button>
                    </div>

                    {/* Lista com Scroll */}
                    <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                      {displayedVipProducts.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 text-xs">
                          Nenhum produto encontrado com este filtro.
                        </div>
                      ) : (
                        displayedVipProducts.map((p) => {
                          const isDispatched = disparosMap[p.id] === getTodayDateStr();
                          const isSelected = selectedVipProduct?.id === p.id;
                          return (
                            <div
                              key={p.id}
                              onClick={() => setSelectedVipProduct(p)}
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition select-none',
                                isSelected
                                  ? 'border-[#FFE600] bg-yellow-500/10 shadow-md'
                                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60'
                              )}
                            >
                              <img
                                src={p.imageUrl}
                                alt={p.title}
                                className="h-14 w-14 rounded-xl object-contain bg-white p-1 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span
                                    className={cn(
                                      'px-1.5 py-0.2 rounded text-[9px] font-bold uppercase',
                                      p.marketplace === 'shopee'
                                        ? 'bg-orange-500/20 text-orange-400'
                                        : 'bg-yellow-500/20 text-yellow-400'
                                    )}
                                  >
                                    {p.marketplace === 'shopee' ? 'Shopee' : 'Mercado Livre'}
                                  </span>
                                  {isDispatched ? (
                                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 flex items-center gap-0.5">
                                      <CheckCircle2 className="h-2.5 w-2.5" /> Disparado Hoje
                                    </span>
                                  ) : (
                                    <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[9px] font-medium text-slate-400 flex items-center gap-0.5">
                                      <Clock className="h-2.5 w-2.5" /> Pronto
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-bold text-white truncate">{p.title}</p>
                                <p className="text-xs font-black text-emerald-400 mt-0.5">
                                  {formatBRL(p.currentPrice)}{' '}
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    ({p.discountPercent}% OFF)
                                  </span>
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Coluna Direita: Editor de Copy & Ação de Disparo */}
                  <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5 flex flex-col justify-between">
                    {!selectedVipProduct ? (
                      <div className="py-24 text-center text-slate-500">
                        <MessageCircle className="mx-auto h-12 w-12 mb-3 opacity-30 text-emerald-400" />
                        <p className="text-sm font-bold text-slate-300">Nenhum produto selecionado</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          Clique em qualquer produto da lista ao lado para carregar a copy automática pronta para disparo.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Cabeçalho do Produto Selecionado */}
                        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={selectedVipProduct.imageUrl}
                              alt={selectedVipProduct.title}
                              className="h-12 w-12 rounded-xl object-contain bg-white p-1 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{selectedVipProduct.title}</p>
                              <p className="text-xs font-black text-emerald-400">
                                {formatBRL(selectedVipProduct.currentPrice)}{' '}
                                <span className="text-[10px] text-slate-400 line-through font-normal">
                                  {formatBRL(selectedVipProduct.originalPrice)}
                                </span>
                              </p>
                            </div>
                          </div>

                          {disparosMap[selectedVipProduct.id] === getTodayDateStr() && (
                            <button
                              type="button"
                              onClick={() => resetProductDispatch(selectedVipProduct.id)}
                              className="text-[10px] text-slate-500 hover:text-slate-300 underline shrink-0"
                              title="Desmarcar se desejar disparar novamente hoje"
                            >
                              Resetar disparo de hoje
                            </button>
                          )}
                        </div>

                        {/* Seletor de Templates */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-2">
                            Escolha o Template de Mensagem:
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setVipTemplate('achadinho')}
                              className={cn(
                                'py-2 px-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1',
                                vipTemplate === 'achadinho'
                                  ? 'bg-[#FFE600] text-slate-950 border-[#FFE600] shadow-sm'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              )}
                            >
                              <span className="text-sm">⭐</span>
                              <span>Achadinho do Dia</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setVipTemplate('urgencia')}
                              className={cn(
                                'py-2 px-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1',
                                vipTemplate === 'urgencia'
                                  ? 'bg-[#FFE600] text-slate-950 border-[#FFE600] shadow-sm'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              )}
                            >
                              <span className="text-sm">🔥</span>
                              <span>Urgência / Relâmpago</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setVipTemplate('unidades')}
                              className={cn(
                                'py-2 px-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1',
                                vipTemplate === 'unidades'
                                  ? 'bg-[#FFE600] text-slate-950 border-[#FFE600] shadow-sm'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              )}
                            >
                              <span className="text-sm">🚨</span>
                              <span>Últimas Unidades</span>
                            </button>
                          </div>
                        </div>

                        {/* Textarea Editável */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-slate-300">
                              Mensagem Formatada para WhatsApp (Editável):
                            </label>
                            <span className="text-[10px] text-slate-400">
                              Emojis e links verificados
                            </span>
                          </div>
                          <textarea
                            rows={10}
                            value={customCopyText}
                            onChange={(e) => setCustomCopyText(e.target.value)}
                            className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 text-xs text-slate-100 font-mono leading-relaxed outline-none focus:ring-2 focus:ring-[#FFE600]"
                          />
                        </div>

                        {/* Botões de Ação */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <button
                            type="button"
                            onClick={handleCopyVip}
                            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 py-3.5 text-xs sm:text-sm font-bold text-white transition active:scale-95 shadow-md"
                          >
                            <Copy className="h-4 w-4" />
                            <span>Copiar Copy</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleFireWhatsApp}
                            className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#20BD5A] py-3.5 text-xs sm:text-sm font-black text-slate-950 transition active:scale-95 shadow-lg shadow-emerald-500/20"
                          >
                            <MessageCircle className="h-4 w-4 fill-current" />
                            <span>Abrir WhatsApp & Disparar</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          )}

          {/* ========================================================================= */}
          {/* ABA 3 (LOJISTA): MINHA LOJA (CUSTOMIZAÇÃO DE BRANDING) */}
          {/* ========================================================================= */}
          {userRole === 'lojista' && loggedStore && (
            <TabsContent value="minha-loja" className="space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-[#0F172A] p-6 shadow-xl max-w-3xl">
                <div className="border-b border-slate-800 pb-4 mb-5">
                  <h2 className="font-black text-white text-base sm:text-lg flex items-center gap-2">
                    <Palette className="h-5 w-5 text-[#FFE600]" />
                    Personalização da Minha Vitrine
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Configure as cores, logotipo, mascote e canais de atendimento exclusivos da sua loja.
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
                        value={loggedStore.slug}
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
                            Banner Hero / Imagem Destaque da Vitrine
                          </label>
                          <p className="text-[10px] text-slate-400">
                            Exibido no lado direito do banner no topo da sua vitrine.
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
                          <div className="h-44 sm:h-52 w-full rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-800/80 p-1">
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

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Domínio Customizado Próprio (Opcional)
                    </label>
                    <input
                      type="text"
                      value={storeBrandDomain}
                      onChange={(e) => setStoreBrandDomain(e.target.value)}
                      placeholder="Ex: achadinhos.meudominio.com.br"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#FFE600]"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Permite apontar um CNAME próprio para sua vitrine (suporte nativo na plataforma).
                    </p>
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
            </TabsContent>
          )}

          {/* ========================================================================= */}
          {/* ABA 3 (LOJISTA): MINHA ASSINATURA ASAAS */}
          {/* ========================================================================= */}
          {userRole === 'lojista' && loggedStore && (
            <TabsContent value="minha-assinatura" className="space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-[#0F172A] p-6 shadow-xl max-w-2xl">
                <div className="border-b border-slate-800 pb-4 mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="font-black text-white text-base sm:text-lg flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-emerald-400" />
                      Minha Assinatura SaaS
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Controle do seu plano, renovação recorrente e comprovantes Asaas.
                    </p>
                  </div>
                  <span
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-black uppercase',
                      loggedStore.statusAssinatura === 'ativo'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    )}
                  >
                    {loggedStore.statusAssinatura.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <span className="text-[11px] font-bold text-slate-400">Plano Atual</span>
                      <p className="mt-1 text-lg font-black text-white capitalize">
                        {loggedStore.plano}
                      </p>
                      <span className="text-xs font-semibold text-emerald-400">
                        {PLANO_PRICES[loggedStore.plano]?.price}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <span className="text-[11px] font-bold text-slate-400">Próximo Vencimento</span>
                      <p className="mt-1 text-sm font-bold text-white">
                        {loggedStore.vencimentoEm
                          ? new Date(loggedStore.vencimentoEm).toLocaleDateString('pt-BR')
                          : 'Assinatura Ativa (Recorrente)'}
                      </p>
                      <span className="text-[10px] text-slate-400">Tolerância de até 3 dias</span>
                    </div>
                  </div>

                  {loggedStore.statusAssinatura === 'inadimplente' && (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
                      <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-red-200">
                          Sua vitrine está temporariamente bloqueada por pendência financeira.
                        </p>
                        <p className="text-[11px] text-red-300/80 mt-0.5">
                          Efetue o pagamento da sua fatura Asaas para liberação instantânea da sua vitrine.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    {loggedStore.asaasPaymentUrl ? (
                      <a
                        href={loggedStore.asaasPaymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 py-3.5 text-xs sm:text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition active:scale-[0.98]"
                      >
                        <CreditCard className="h-4 w-4 text-slate-950" />
                        <span>Acessar Fatura / Pagar via Asaas (PIX / Cartão)</span>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-950" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGenerateAsaasCheckout}
                        disabled={isGeneratingAsaas}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFE600] hover:bg-yellow-400 py-3.5 text-xs sm:text-sm font-black text-slate-950 shadow-lg shadow-yellow-500/20 transition active:scale-[0.98] disabled:opacity-50"
                      >
                        <CreditCard className="h-4 w-4 text-slate-950" />
                        <span>{isGeneratingAsaas ? 'Gerando Fatura...' : 'Gerar Link de Assinatura Asaas'}</span>
                      </button>
                    )}

                    <p className="text-center text-[11px] text-slate-400">
                      🔒 Pagamento processado com segurança pela instituição autorizada Asaas Gestão Financeira.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}

          {/* ========================================================================= */}
          {/* ABA 2 (SUPER ADMIN): CLIENTES SAAS & GESTÃO MULTI-TENANT */}
          {/* ========================================================================= */}
          {userRole === 'super_admin' && (
            <TabsContent value="saas" className="space-y-6">
              {/* Cards de Métricas SaaS */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-3xl border border-slate-800 bg-[#0F172A] p-4">
                  <span className="text-xs font-bold text-slate-400">Total de Lojas</span>
                  <p className="mt-1 text-2xl font-black text-white">{saasMetrics.total}</p>
                </div>
                <div className="rounded-3xl border border-amber-500/30 bg-amber-950/20 p-4">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Aguardando Aprovação
                  </span>
                  <p className="mt-1 text-2xl font-black text-amber-400">{saasMetrics.pending}</p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-[#0F172A] p-4">
                  <span className="text-xs font-bold text-emerald-400">Assinaturas Ativas</span>
                  <p className="mt-1 text-2xl font-black text-emerald-400">{saasMetrics.active}</p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-[#0F172A] p-4">
                  <span className="text-xs font-bold text-red-400">Inadimplentes / Bloqueadas</span>
                  <p className="mt-1 text-2xl font-black text-red-400">{saasMetrics.suspended}</p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-[#0F172A] p-4">
                  <span className="text-xs font-bold text-[#FFE600]">MRR Estimado</span>
                  <p className="mt-1 text-2xl font-black text-[#FFE600]">{formatBRL(saasMetrics.mrr)}</p>
                </div>
              </div>

              {/* Fila de Aprovação de Novos Lojistas (Pendente) */}
              {pendingStores.length > 0 && (
                <div className="rounded-3xl border-2 border-amber-500/40 bg-[#0F172A] p-5 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between gap-3 border-b border-amber-500/20 pb-4 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                        <Clock className="h-5 w-5 animate-pulse" />
                      </div>
                      <div>
                        <h2 className="font-black text-white text-base sm:text-lg flex items-center gap-2">
                          Lojas Aguardando Aprovação ({pendingStores.length})
                          <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-amber-400">
                            Ação Necessária
                          </span>
                        </h2>
                        <p className="text-xs text-slate-400">
                          Novos lojistas cadastrados via auto-cadastro aguardando confirmação cadastral ou pagamento.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {pendingStores.map((store) => (
                      <div
                        key={store.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-500/20 bg-slate-900/60 p-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white text-sm">{store.nomeLoja}</span>
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-[#FFE600]">
                              /{store.slug}
                            </span>
                            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase">
                              Plano {store.plano}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                            {store.ownerEmail && (
                              <span className="flex items-center gap-1 text-slate-300">
                                <Mail className="h-3 w-3 text-slate-500" /> {store.ownerEmail}
                              </span>
                            )}
                            {store.whatsappContato && (
                              <a
                                href={`https://wa.me/55${store.whatsappContato.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-emerald-400 hover:underline"
                              >
                                <Phone className="h-3 w-3" /> WhatsApp: {store.whatsappContato}
                              </a>
                            )}
                            {store.cpfCnpj && (
                              <span className="text-slate-400">
                                CPF/CNPJ: <strong className="text-slate-300 font-mono">{store.cpfCnpj}</strong>
                              </span>
                            )}
                          </div>
                          {store.asaasPaymentUrl && (
                            <div className="pt-1">
                              <a
                                href={store.asaasPaymentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:underline"
                              >
                                Link de Cobrança Asaas <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleApproveStore(store.id)}
                            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-black text-slate-950 shadow-md shadow-emerald-500/20 hover:bg-emerald-400 transition disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" /> Aprovar & Liberar Loja
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleRejectStore(store.id)}
                            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                          >
                            Recusar / Suspender
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabela de Lojas SaaS */}
              <div className="rounded-3xl border border-slate-800 bg-[#0F172A] p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
                  <div>
                    <h2 className="font-black text-white text-base sm:text-lg">
                      Lojas Parceiras & Assinantes ({stores.length})
                    </h2>
                    <p className="text-xs text-slate-400">
                      Gerencie status de assinatura, limites e liberação instantânea de acesso.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewStoreModal(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-[#FFE600] px-3.5 py-2 text-xs font-black text-slate-950 shadow-md shadow-yellow-500/20 hover:bg-yellow-400 transition"
                  >
                    <Plus className="h-4 w-4" /> Nova Loja SaaS
                  </button>
                </div>

                {loadingStores ? (
                  <div className="py-12 text-center text-slate-400 text-xs">Carregando lojistas...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                          <th className="pb-3 pl-2">Loja / Slug</th>
                          <th className="pb-3">Lojista (E-mail)</th>
                          <th className="pb-3">Plano</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3">Asaas Cobrança</th>
                          <th className="pb-3 pr-2 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {stores.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-900/40 transition">
                            <td className="py-3 pl-2">
                              <p className="font-bold text-white">{s.nomeLoja}</p>
                              <a
                                href={`/?loja=${s.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-[#FFE600] hover:underline flex items-center gap-1"
                              >
                                /{s.slug} <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            </td>
                            <td className="py-3 text-slate-300 font-mono text-[11px]">
                              {s.ownerEmail || <span className="text-slate-500">Sem e-mail</span>}
                            </td>
                            <td className="py-3">
                              <span className="font-bold capitalize text-white">{s.plano}</span>
                              <span className="block text-[10px] text-slate-400 font-medium">
                                {PLANO_PRICES[s.plano]?.price}
                              </span>
                            </td>
                            <td className="py-3">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                                  s.statusAssinatura === 'ativo'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : s.statusAssinatura === 'pendente'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-red-500/20 text-red-400'
                                )}
                              >
                                {s.statusAssinatura === 'ativo'
                                  ? '🟢 Ativo'
                                  : s.statusAssinatura === 'pendente'
                                  ? '🟡 Pendente'
                                  : '🔴 Inadimplente'}
                              </span>
                            </td>
                            <td className="py-3">
                              {s.asaasPaymentUrl ? (
                                <a
                                  href={s.asaasPaymentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1"
                                >
                                  Ver Fatura <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-[10px] text-slate-500">Pendente</span>
                              )}
                            </td>
                            <td className="py-3 pr-2 text-right">
                              {s.slug !== 'clarice' && (
                                <div className="flex items-center justify-end gap-1.5">
                                  {s.statusAssinatura === 'pendente' ? (
                                    <>
                                      <button
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => handleApproveStore(s.id)}
                                        className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/30 transition disabled:opacity-50"
                                      >
                                        Aprovar
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => handleRejectStore(s.id)}
                                        className="rounded-lg bg-red-500/20 px-2.5 py-1 text-[11px] font-bold text-red-300 hover:bg-red-500/30 transition disabled:opacity-50"
                                      >
                                        Recusar
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={isPending}
                                      onClick={() => handleToggleStoreStatus(s.id, s.statusAssinatura)}
                                      className={cn(
                                        'rounded-lg px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-50',
                                        s.statusAssinatura === 'ativo'
                                          ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                          : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                      )}
                                    >
                                      {s.statusAssinatura === 'ativo' ? 'Bloquear' : 'Desbloquear'}
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {/* ========================================================================= */}
          {/* ABA 3 (SUPER ADMIN): FILA DO RADAR */}
          {/* ========================================================================= */}
          {userRole === 'super_admin' && (
            <TabsContent value="radar" className="space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-[#0F172A] p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
                  <div>
                    <h2 className="font-black text-white text-base sm:text-lg">
                      Fila de Aprovação do Radar ({c.pendingProducts.length})
                    </h2>
                    <p className="text-xs text-slate-400">
                      Achadinhos garimpados automaticamente aguardando confirmação de link.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => c.syncRadar()}
                    disabled={c.isSyncing}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-700 transition disabled:opacity-50"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', c.isSyncing && 'animate-spin')} />
                    {c.isSyncing ? 'Sincronizando...' : 'Recarregar Fila'}
                  </button>
                </div>

                {c.pendingProducts.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <Zap className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    <p className="text-xs font-semibold">
                      Fila do Radar vazia. Todos os achadinhos já foram aprovados ou o robô ainda não rodou.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {c.pendingProducts.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-3.5"
                      >
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="h-14 w-14 rounded-xl object-contain bg-white p-1 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{p.title}</p>
                          <p className="text-xs font-extrabold text-emerald-400 mt-0.5">
                            {formatBRL(p.currentPrice)}{' '}
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({p.discountPercent}% OFF)
                            </span>
                          </p>
                          <span className="text-[10px] text-slate-500 font-mono truncate block mt-0.5">
                            {p.affiliateUrl}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => c.approveProduct(p.id)}
                            className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-3 py-2 text-xs font-black text-slate-950 transition"
                          >
                            Aprovar
                          </button>
                          <button
                            type="button"
                            onClick={() => c.rejectPending(p.id)}
                            className="rounded-xl bg-red-500/10 hover:bg-red-500/20 px-3 py-2 text-xs font-bold text-red-400 transition"
                          >
                            Rejeitar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {/* ========================================================================= */}
          {/* ABA 4 (SUPER ADMIN): CONFIGURAÇÕES GERAIS */}
          {/* ========================================================================= */}
          {userRole === 'super_admin' && (
            <TabsContent value="config" className="space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-[#0F172A] p-6 shadow-xl max-w-2xl">
                <h2 className="font-black text-white text-base sm:text-lg mb-1">
                  Credenciais Globais & Integrações Asaas
                </h2>
                <p className="text-xs text-slate-400 mb-6">
                  Configurações de infraestrutura do sistema Clarice Achadinhos SaaS.
                </p>

                <div className="space-y-4 text-xs">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <span className="font-bold text-white">Status do Banco de Dados:</span>{' '}
                    <span className={isSupabaseConfigured ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {isSupabaseConfigured ? '🟢 Conectado ao Supabase' : '🟡 Modo Local'}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <span className="font-bold text-white">Gateway de Pagamentos Asaas:</span>{' '}
                    <span className="text-emerald-400 font-bold">🟢 Endpoints Ativos (/api/asaas/checkout + /webhook)</span>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Modal de Criação de Loja (Super Admin) */}
      {newStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-[#0F172A] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-white mb-1">Cadastrar Nova Loja SaaS</h3>
            <p className="text-xs text-slate-400 mb-5">
              Crie a loja parceira e defina o e-mail do lojista para acesso exclusivo.
            </p>

            <form onSubmit={handleCreateStoreSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Slug (URL)</label>
                  <input
                    type="text"
                    required
                    value={newStoreSlug}
                    onChange={(e) => setNewStoreSlug(e.target.value)}
                    placeholder="ex: loja-da-maria"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-[#FFE600]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nome da Loja</label>
                  <input
                    type="text"
                    required
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    placeholder="ex: Achadinhos da Maria"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-[#FFE600]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail do Lojista (Login)</label>
                <input
                  type="email"
                  required
                  value={newStoreOwnerEmail}
                  onChange={(e) => setNewStoreOwnerEmail(e.target.value)}
                  placeholder="maria@exemplo.com.br"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-[#FFE600]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Domínio Próprio (Opcional)</label>
                <input
                  type="text"
                  value={newStoreDomain}
                  onChange={(e) => setNewStoreDomain(e.target.value)}
                  placeholder="ex: ofertas.maria.com.br"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-[#FFE600]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Plano SaaS</label>
                <select
                  value={newStorePlan}
                  onChange={(e) => setNewStorePlan(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="start">Start (R$ 67/mês)</option>
                  <option value="pro">Pro (R$ 117/mês)</option>
                  <option value="advanced">Advanced (R$ 197/mês)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewStoreModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#FFE600] px-4 py-2 text-xs font-black text-slate-950 hover:bg-yellow-400"
                >
                  Cadastrar Loja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toaster position="bottom-center" richColors />
    </div>
  );
}
