import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useTransition, useMemo, type FormEvent } from 'react';
import {
  AlertTriangle,
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
  GraduationCap,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  LogIn,
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
  Video,
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
  DEFAULT_CLARICE_STORE,
  PLANO_PRICES,
  type LojaAfiliado,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from '@/types/tenant';
import {
  getPlanPermissions,
  PLAN_CARDS,
  type PlanPermissions,
} from '@/config/planPermissions';
import { PlanGate } from '@/components/admin/PlanGate';
import { LojistaBatchImport } from '@/components/admin/LojistaBatchImport';
import { LojistaVipDispatcher } from '@/components/admin/LojistaVipDispatcher';
import { LojistaStoreSettings } from '@/components/admin/LojistaStoreSettings';
import { LojistaTutorialGuide } from '@/components/admin/LojistaTutorialGuide';
import { SuperAdminTenantDrawer } from '@/components/admin/SuperAdminTenantDrawer';
import { recordProductAuditServerFn } from '@/services/superAdminServerFn';
import { applyStoreAffiliateTracking } from '@/utils/affiliateUrl';
import { cloneStarterCatalogToStore } from '@/services/starterCatalogService';
import { resolveMlAffiliateLinkServerFn } from '@/services/mlAffiliateServerFn';
import { extractProductMetadataServerFn } from '@/services/productMetadataServerFn';
import {
  fetchTutorials,
  updateTutorialVideo,
  uploadTutorialVideo,
  type TutorialLesson,
} from '@/services/tutorialService';
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
    meta: [
      { title: 'Painel Administrativo & Gestão SaaS — Clarice Achadinhos' },
      { name: 'robots', content: 'noindex, nofollow' },
      { httpEquiv: 'Cache-Control', content: 'no-cache, no-store, must-revalidate' },
      { httpEquiv: 'Pragma', content: 'no-cache' },
      { httpEquiv: 'Expires', content: '0' },
    ],
  }),
  component: AdminRoutePage,
});

const DEFAULT_PIN = (import.meta.env.VITE_ADMIN_PIN as string | undefined)?.trim() || '';

type UserRole = 'super_admin' | 'lojista';

function getInitialAdminAuthState(): {
  isAuthenticated: boolean;
  userRole: UserRole;
  loggedStore: LojaAfiliado | null;
} {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, userRole: 'super_admin', loggedStore: null };
  }
  try {
    const authSession = sessionStorage.getItem('clarice_admin_authenticated');
    const roleSession = sessionStorage.getItem('clarice_admin_role') as UserRole | null;
    const slugSession = sessionStorage.getItem('clarice_admin_store_slug');

    const lojistaRaw = localStorage.getItem('clarice_lojista_session');
    let lojistaStore: LojaAfiliado | null = null;
    let lojistaSlug: string | null = null;
    if (lojistaRaw) {
      try {
        const parsed = JSON.parse(lojistaRaw);
        if (parsed?.store) lojistaStore = parsed.store;
        if (parsed?.slug) lojistaSlug = parsed.slug;
      } catch {
        // ignore
      }
    }

    if (authSession === 'true') {
      return {
        isAuthenticated: true,
        userRole: roleSession || (slugSession || lojistaSlug ? 'lojista' : 'super_admin'),
        loggedStore: lojistaStore,
      };
    }

    if (lojistaStore || lojistaSlug) {
      return {
        isAuthenticated: true,
        userRole: 'lojista',
        loggedStore: lojistaStore,
      };
    }

    const adminSessionRaw = localStorage.getItem('clarice_admin_session');
    if (adminSessionRaw) {
      try {
        const parsed = JSON.parse(adminSessionRaw);
        if (parsed?.authenticated || parsed === true) {
          return { isAuthenticated: true, userRole: 'super_admin', loggedStore: null };
        }
      } catch {
        if (adminSessionRaw === 'true') {
          return { isAuthenticated: true, userRole: 'super_admin', loggedStore: null };
        }
      }
    }
  } catch {
    // ignore
  }

  return { isAuthenticated: false, userRole: 'super_admin', loggedStore: null };
}

export function AdminRoutePage() {
  const [initialAuth] = useState(getInitialAdminAuthState);
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth.isAuthenticated);
  const [userRole, setUserRole] = useState<UserRole>(initialAuth.userRole);
  const [loggedStore, setLoggedStore] = useState<LojaAfiliado | null>(initialAuth.loggedStore);

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

  // Gestão de Vídeos Tutoriais da Clarice (Super Admin)
  const [adminTutorials, setAdminTutorials] = useState<TutorialLesson[]>([]);
  const [loadingAdminTutorials, setLoadingAdminTutorials] = useState(false);
  const [savingTutorialId, setSavingTutorialId] = useState<string | null>(null);
  const [uploadingTutorialId, setUploadingTutorialId] = useState<string | null>(null);
  const [tutorialUrlDrafts, setTutorialUrlDrafts] = useState<Record<string, string>>({});

  // Alternância rápida entre Painel Super Admin e Painel Clarice
  const [isSwitchedToClarice, setIsSwitchedToClarice] = useState(false);
  const [impersonatedStore, setImpersonatedStore] = useState<LojaAfiliado | null>(null);
  const [drawerStore, setDrawerStore] = useState<LojaAfiliado | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Catálogo (se for lojista, isola estritamente na loja dele com fallback para sessão)
  const catalogLojaSlug = useMemo(() => {
    if (userRole === 'lojista') {
      const slug =
        loggedStore?.slug ||
        (typeof window !== 'undefined'
          ? sessionStorage.getItem('clarice_admin_store_slug')
          : null);
      return (slug || '').toLowerCase().trim() || undefined;
    }
    return selectedStoreFilter === 'todos' ? undefined : selectedStoreFilter;
  }, [userRole, loggedStore?.slug, selectedStoreFilter]);
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
  const [newStoreMlTag, setNewStoreMlTag] = useState('');
  const [newStoreMlTool, setNewStoreMlTool] = useState('');
  const [newStoreExtractUrl, setNewStoreExtractUrl] = useState('');
  const [newStoreExtracting, setNewStoreExtracting] = useState(false);
  const [isCloningStarter, setIsCloningStarter] = useState(false);

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

  // Permissões ativas do lojista baseado no seu plano
  const lojistaPermissions = useMemo(() => {
    return getPlanPermissions(loggedStore?.plano);
  }, [loggedStore?.plano]);

  // Assinatura Asaas (Lojista)
  const [isGeneratingAsaas, setIsGeneratingAsaas] = useState(false);

  // Estados de Upload de Imagens do Produto
  const [uploadingProductImage, setUploadingProductImage] = useState(false);

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

  // Modo de Entrada de Produtos (Individual vs. Lote)
  const [productInputMode, setProductInputMode] = useState<'individual' | 'batch'>('individual');

  // Checagem de autenticação no sessionStorage e localStorage (com proteção SSR)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      let auth = sessionStorage.getItem('clarice_admin_authenticated');
      let savedRole = sessionStorage.getItem('clarice_admin_role') as UserRole | null;
      let savedStoreSlug = sessionStorage.getItem('clarice_admin_store_slug');

      // Fallback para localStorage persistente
      if (!auth) {
        const adminSessionRaw = localStorage.getItem('clarice_admin_session');
        if (adminSessionRaw) {
          try {
            const parsed = JSON.parse(adminSessionRaw);
            if (parsed && (parsed.authenticated || parsed === true)) {
              auth = 'true';
              savedRole = 'super_admin';
            }
          } catch {
            if (adminSessionRaw === 'true') {
              auth = 'true';
              savedRole = 'super_admin';
            }
          }
        }
      }

      if (!auth) {
        const lojistaSessionRaw = localStorage.getItem('clarice_lojista_session');
        if (lojistaSessionRaw) {
          try {
            const parsed = JSON.parse(lojistaSessionRaw);
            if (parsed?.slug) {
              auth = 'true';
              savedRole = 'lojista';
              savedStoreSlug = parsed.slug;
              if (parsed.store) {
                setLoggedStore(parsed.store);
              }
            }
          } catch {
            // ignore
          }
        }
      }

      if (auth === 'true') {
        setIsAuthenticated(true);
        if (savedRole) setUserRole(savedRole);
        if (savedRole === 'lojista' && savedStoreSlug) {
          fetchStoreBySlug(savedStoreSlug).then((s) => {
            if (s) {
              if (s.statusAssinatura === 'pendente' || s.statusAssinatura === 'suspenso') {
                handleLogout();
                return;
              }
              setLoggedStore(s);
            }
          }).catch(() => {});
        }
      }
    } catch {
      // ignore
    }
  }, []);

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
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('clarice_admin_authenticated', 'true');
          sessionStorage.setItem('clarice_admin_role', 'super_admin');
          sessionStorage.removeItem('clarice_admin_store_slug');
          localStorage.setItem('clarice_admin_session', JSON.stringify({ authenticated: true, timestamp: Date.now() }));
          localStorage.removeItem('clarice_lojista_session');
        } catch {
          // ignore
        }
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

      // Validação de status da assinatura para login
      if (store.statusAssinatura === 'pendente') {
        toast.error('Acesso bloqueado: Seu cadastro ou pagamento está pendente de confirmação. Efetue o pagamento da sua assinatura para liberar o painel.');
        return;
      }
      if (store.statusAssinatura === 'suspenso') {
        toast.error('Acesso suspenso: Sua conta está desativada. Fale com a equipe de suporte.');
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

      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('clarice_admin_authenticated', 'true');
          sessionStorage.setItem('clarice_admin_role', 'lojista');
          sessionStorage.setItem('clarice_admin_store_slug', store.slug);
          localStorage.setItem('clarice_lojista_session', JSON.stringify({ slug: store.slug, store, timestamp: Date.now() }));
          localStorage.removeItem('clarice_admin_session');
        } catch {
          // ignore
        }
      }

      setUserRole('lojista');
      setLoggedStore(store);
      setIsAuthenticated(true);
      toast.success(`Bem-vindo de volta ao painel da loja ${store.nomeLoja}!`);
    } catch (err) {
      toast.error('Falha ao autenticar lojista.');
    } finally {
      setLojistaLoginLoading(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('clarice_admin_authenticated');
        sessionStorage.removeItem('clarice_admin_role');
        sessionStorage.removeItem('clarice_admin_store_slug');
        localStorage.removeItem('clarice_admin_session');
        localStorage.removeItem('clarice_lojista_session');
      } catch {
        // ignore
      }
    }
    setIsAuthenticated(false);
    setLoggedStore(null);
    setIsSwitchedToClarice(false);
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

  // Carrega vídeos tutoriais quando o Super Admin acessa as configurações
  useEffect(() => {
    if (isAuthenticated && userRole === 'super_admin' && activeTab === 'config') {
      setLoadingAdminTutorials(true);
      fetchTutorials()
        .then((lessons) => {
          setAdminTutorials(lessons);
          const drafts: Record<string, string> = {};
          lessons.forEach((l) => {
            drafts[l.id] = l.videoUrl || '';
          });
          setTutorialUrlDrafts(drafts);
        })
        .finally(() => setLoadingAdminTutorials(false));
    }
  }, [isAuthenticated, userRole, activeTab]);

  const handleSaveTutorialVideo = async (id: string) => {
    setSavingTutorialId(id);
    const newUrl = tutorialUrlDrafts[id]?.trim() || null;
    const res = await updateTutorialVideo(id, newUrl);
    setSavingTutorialId(null);
    if (res.success) {
      toast.success('Vídeo tutorial atualizado com sucesso!');
      setAdminTutorials((prev) =>
        prev.map((l) => (l.id === id ? { ...l, videoUrl: newUrl } : l))
      );
    } else {
      toast.error(res.error || 'Erro ao atualizar vídeo tutorial.');
    }
  };

  const handleUploadTutorialFile = async (
    lessonId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingTutorialId(lessonId);
      toast.loading('Enviando vídeo...', { id: `upload-tut-${lessonId}` });

      const publicUrl = await uploadTutorialVideo(file, lessonId);

      setTutorialUrlDrafts((prev) => ({
        ...prev,
        [lessonId]: publicUrl,
      }));

      const res = await updateTutorialVideo(lessonId, publicUrl);
      if (res.success) {
        setAdminTutorials((prev) =>
          prev.map((l) => (l.id === lessonId ? { ...l, videoUrl: publicUrl } : l))
        );
        toast.success('Vídeo tutorial enviado e publicado com sucesso!', {
          id: `upload-tut-${lessonId}`,
        });
      } else {
        toast.error(res.error || 'Falha ao salvar vídeo após upload.', {
          id: `upload-tut-${lessonId}`,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao fazer upload do vídeo.', {
        id: `upload-tut-${lessonId}`,
      });
    } finally {
      setUploadingTutorialId(null);
      e.target.value = '';
    }
  };

  const handleSwitchToClaricePanel = () => {
    const clariceStore = stores.find((s) => s.slug === 'clarice') || DEFAULT_CLARICE_STORE;
    setLoggedStore(clariceStore);
    setUserRole('lojista');
    setIsSwitchedToClarice(true);
    setActiveTab('produtos');
    toast.success('Alternado para o Painel da Clarice Achadinhos!');
  };

  const handleReturnToSuperAdmin = () => {
    setUserRole('super_admin');
    setLoggedStore(null);
    setIsSwitchedToClarice(false);
    setImpersonatedStore(null);
    setActiveTab('produtos');
    toast.success('Retornado ao Painel Super Admin!');
  };

  const handleEnterSupportMode = (targetStore: LojaAfiliado) => {
    setLoggedStore(targetStore);
    setUserRole('lojista');
    setImpersonatedStore(targetStore);
    setIsSwitchedToClarice(false);
    setActiveTab('produtos');
    toast.success(`Modo Suporte ativado para "${targetStore.nomeLoja}"!`);
  };

  const handleExitSupportMode = () => {
    setUserRole('super_admin');
    setLoggedStore(null);
    setImpersonatedStore(null);
    setIsSwitchedToClarice(false);
    setActiveTab('saas-clientes');
    toast.success('Retornado ao Painel Super Admin!');
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
    let url = productAffiliateUrl.trim();
    if (!url) {
      toast.info('Cole primeiro a URL do produto antes de puxar os metadados.');
      return;
    }

    const activeStore =
      userRole === 'lojista' && loggedStore
        ? loggedStore
        : stores.find((s) => s.slug === (selectedStoreFilter === 'todos' ? 'clarice' : selectedStoreFilter));

    // Injeta automaticamente parâmetros de rastreamento permanente se configurado
    const tracking = applyStoreAffiliateTracking(url, activeStore);
    if (tracking.tracked && tracking.finalUrl !== url) {
      url = tracking.finalUrl;
      setProductAffiliateUrl(url);
      toast.success(
        `Rastreamento permanente aplicado (${tracking.network === 'ml' ? 'Mercado Livre' : 'Shopee'})!`
      );
    }

    setIsFetchingOg(true);
    try {
      const res = await extractProductMetadataServerFn({ data: { url } });
      if (res && res.success) {
        if (res.title) setProductTitle(res.title);
        if (res.currentPrice) setProductCurrentPrice(res.currentPrice);
        if (res.originalPrice) setProductOriginalPrice(res.originalPrice);
        if (res.imageUrl) setProductImageUrl(res.imageUrl);
        if (res.marketplace) setProductMarketplace(res.marketplace);
        if (res.category) {
          const matchedCategory = CATEGORIES.find(
            (c) => c.toLowerCase() === (res.category || '').toLowerCase()
          );
          if (matchedCategory) setProductCategory(matchedCategory);
        }
        toast.success('⚡ Dados do produto puxados com sucesso!');
        return;
      }

      // Fallback local caso a Server Function não consiga extrair
      if (url.includes('shopee.com') || url.includes('shp.ee')) {
        setProductMarketplace('shopee');
        const slugMatch = url.match(/shopee\.com\.br\/([^?]+)-i\./i);
        if (slugMatch && !productTitle) {
          const autoTitle = decodeURIComponent(slugMatch[1]).replace(/[-_]+/g, ' ');
          setProductTitle(autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1));
        }
        if (!productImageUrl) {
          setProductImageUrl('https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80');
        }
        if (!productCurrentPrice) setProductCurrentPrice('79,90');
        if (!productOriginalPrice) setProductOriginalPrice('129,90');
        toast.success('Metadados da Shopee detectados!');
      } else if (url.includes('mercadolivre.com') || url.includes('meli.la')) {
        setProductMarketplace('mercadolivre');
        const mlb = extractMlbId(url);
        const p = productFromUrl(url, productCategory, url, true);
        if (p) {
          if (!productTitle || productTitle.startsWith('Produto Mercado Livre')) {
            setProductTitle(p.title);
          }
          if (!productCurrentPrice) {
            setProductCurrentPrice(p.currentPrice.toFixed(2).replace('.', ','));
          }
          if (!productOriginalPrice) {
            setProductOriginalPrice(p.originalPrice.toFixed(2).replace('.', ','));
          }
          if (!productImageUrl) {
            setProductImageUrl(p.imageUrl);
          }
        } else {
          if (mlb && !productTitle) {
            setProductTitle(`Produto Mercado Livre ${mlb}`);
          }
          if (!productCurrentPrice) setProductCurrentPrice('149,90');
          if (!productOriginalPrice) setProductOriginalPrice('199,90');
          if (!productImageUrl) {
            setProductImageUrl('https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=600&q=80');
          }
        }
        toast.success('Metadados do Mercado Livre detectados!');
      } else {
        toast.info('URL detectada. Preencha os campos abaixo.');
      }
    } catch {
      toast.error('Não foi possível extrair dados automaticamente. Preencha os campos abaixo.');
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

    const activeStore =
      userRole === 'lojista' && loggedStore
        ? loggedStore
        : stores.find((s) => s.slug === assignedLojaSlug);

    // Aplica injeção de rastreamento permanente de afiliado
    const tracking = applyStoreAffiliateTracking(productAffiliateUrl.trim(), activeStore);
    const finalAffiliateUrl = tracking.finalUrl || productAffiliateUrl.trim();

    // Trava de limite de produtos para plano do lojista
    if (userRole === 'lojista' && !editingProductId) {
      const currentCount = c.products.filter((p) => p.lojaSlug === assignedLojaSlug).length;
      if (currentCount >= lojistaPermissions.maxProducts) {
        toast.error(
          `⚠️ Limite de ${lojistaPermissions.maxProducts} produtos do seu plano atingido! Você possui ${currentCount} produtos ativos. Faça upgrade na aba 'Minha Assinatura' para cadastrar produtos ilimitados!`
        );
        return;
      }
    }

    const generatedId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `prod-${Date.now()}`;

    const newProduct: AffiliateProduct = {
      id: editingProductId || generatedId,
      mlbId,
      title: productTitle.trim(),
      originalPrice: origPrice,
      currentPrice: curPrice,
      discountPercent,
      installmentsText: productInstallments.trim() || 'À vista',
      imageUrl: productImageUrl.trim() || '/icons/icon-192x192.png',
      affiliateUrl: finalAffiliateUrl,
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
      c.update(newProduct);
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
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(editingProductId);
          let updateQuery = supabase.from('produtos_clarice').update(payload);
          updateQuery = isUuid ? updateQuery.eq('id', editingProductId) : updateQuery.eq('mlb_id', editingProductId);
          const { error: updErr } = await updateQuery;
          if (updErr) {
            console.warn('[Admin] Erro ao atualizar no Supabase:', updErr.message);
            toast.error(`Erro ao salvar no banco: ${updErr.message}`);
          } else {
            await recordProductAuditServerFn({
              data: {
                lojaSlug: newProduct.lojaSlug,
                actorRole: userRole,
                actorEmail: userRole === 'super_admin' ? 'super_admin@clarice.com' : (loggedStore?.ownerEmail || undefined),
                action: 'PRODUTO_EDITADO',
                entityId: editingProductId,
                entityTitle: newProduct.title,
                payload: { product: newProduct },
              },
            }).catch(() => {});
          }
        } else {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newProduct.id);
          const insertPayload = isUuid ? { id: newProduct.id, ...payload } : payload;
          const { data: inserted, error: insErr } = await supabase.from('produtos_clarice').insert(insertPayload).select('id').single();
          if (inserted?.id && inserted.id !== newProduct.id) {
            c.update({ ...newProduct, id: inserted.id });
          }
          if (insErr) {
            console.warn('[Admin] Aviso ao inserir no Supabase:', insErr.message);
            toast.error(`Aviso banco: ${insErr.message}`);
          } else {
            await recordProductAuditServerFn({
              data: {
                lojaSlug: newProduct.lojaSlug,
                actorRole: userRole,
                actorEmail: userRole === 'super_admin' ? 'super_admin@clarice.com' : (loggedStore?.ownerEmail || undefined),
                action: 'PRODUTO_CRIADO',
                entityId: inserted?.id || newProduct.id,
                entityTitle: newProduct.title,
                payload: { product: newProduct },
              },
            }).catch(() => {});
          }
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

  // Gerar Checkout / Cobrança Asaas (Lojista)
  const handleGenerateAsaasCheckout = async (newPlan?: SubscriptionPlan) => {
    if (!loggedStore) return;
    const targetPlan = newPlan || loggedStore.plano;

    setIsGeneratingAsaas(true);
    try {
      const res = await createAsaasCheckout({
        loja_slug: loggedStore.slug,
        nome: loggedStore.nomeLoja,
        email: loggedStore.ownerEmail || 'lojista@exemplo.com.br',
        plano: targetPlan,
      });

      if (res.success && res.paymentUrl) {
        setLoggedStore((prev) =>
          prev ? { ...prev, plano: targetPlan, asaasPaymentUrl: res.paymentUrl } : prev
        );
        toast.success(`Link de pagamento Asaas gerado com sucesso!`);
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
      if (userRole === 'lojista') {
        const targetSlug = (loggedStore?.slug || catalogLojaSlug || '').toLowerCase().trim();
        const prodSlug = (p.lojaSlug || '').toLowerCase().trim();
        if (targetSlug && prodSlug !== targetSlug) return false;
      }

      const matchesSearch =
        !productSearch.trim() ||
        p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.mlbId.toLowerCase().includes(productSearch.toLowerCase());
      const matchesMarket =
        marketFilter === 'todos' || (p.marketplace || 'mercadolivre') === marketFilter;
      return matchesSearch && matchesMarket;
    });
  }, [c.products, productSearch, marketFilter, userRole, loggedStore?.slug, catalogLojaSlug]);

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

          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-[11px] text-slate-500">
            © 2026 FCIA • Todos os direitos reservados.
          </div>
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
      {/* Banner Fixo: Modo Suporte Super Admin */}
      {impersonatedStore && (
        <div className="sticky top-0 z-40 flex items-center justify-between bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-4 py-2 text-xs font-black text-slate-950 shadow-md">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-2.5 w-2.5 rounded-full bg-slate-950 animate-ping shrink-0" />
            <span className="truncate">
              🛡️ Modo Suporte Super Admin • Gerenciando: <strong>{impersonatedStore.nomeLoja}</strong> (/{impersonatedStore.slug})
            </span>
          </div>
          <button
            type="button"
            onClick={handleExitSupportMode}
            className="ml-3 shrink-0 rounded-xl bg-slate-950 text-white px-3 py-1.5 text-xs font-black shadow hover:bg-slate-900 transition flex items-center gap-1.5 active:scale-95"
          >
            <Crown className="h-3.5 w-3.5 text-[#FFE600]" />
            <span>Voltar ao Super Admin</span>
          </button>
        </div>
      )}

      {/* Header do Painel */}
      <header className="border-b border-slate-800 bg-[#0F172A]/90 backdrop-blur-md sticky top-0 z-30 px-4 py-3 sm:py-3.5">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Linha 1 (Mobile) / Lado Esquerdo (Desktop) */}
          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto min-w-0">
            <a
              href={userRole === 'lojista' && loggedStore ? `/?loja=${loggedStore.slug}` : '/'}
              target={userRole === 'lojista' && loggedStore ? '_blank' : undefined}
              rel={userRole === 'lojista' && loggedStore ? 'noreferrer' : undefined}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
              title={userRole === 'lojista' ? 'Ver Minha Vitrine (Nova Aba)' : 'Ver vitrine pública'}
            >
              <ArrowLeft className="h-4 w-4" />
            </a>
            <div className="min-w-0 flex-1 sm:flex-initial">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
                <h1 className="text-sm sm:text-lg font-black tracking-tight text-white truncate min-w-0 max-w-[160px] xs:max-w-[200px] sm:max-w-none">
                  {userRole === 'super_admin'
                    ? 'Painel Super Admin • Clarice SaaS'
                    : `Gestão • ${loggedStore?.nomeLoja || 'Minha Loja'}`}
                </h1>
                {userRole === 'super_admin' ? (
                  <span className="shrink-0 whitespace-nowrap rounded-md bg-[#FFE600]/20 px-2 py-0.5 text-[10px] font-black uppercase text-[#FFE600] flex items-center gap-1">
                    <Crown className="h-3 w-3" /> SUPER ADMIN
                  </span>
                ) : (
                  <span className="shrink-0 whitespace-nowrap rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1">
                    <Store className="h-3 w-3" /> {loggedStore?.plano ? loggedStore.plano.toUpperCase() : 'PRO'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                {userRole === 'super_admin'
                  ? 'Controle mestre de assinaturas Asaas, vitrines e automações.'
                  : `Gerencie seu catálogo exclusivo, personalize sua vitrine e acompanhe sua assinatura.`}
              </p>
            </div>
            {/* Botão Sair na Linha 1 no mobile */}
            <button
              onClick={handleLogout}
              className="ml-auto sm:hidden shrink-0 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              Sair
            </button>
          </div>

          {/* Linha 2 (Mobile) / Lado Direito (Desktop) */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Se estiver no Painel Clarice após alternância rápida, Modo Suporte ou se logado na clarice */}
            {userRole === 'lojista' && (isSwitchedToClarice || impersonatedStore || loggedStore?.slug === 'clarice') && (
              <button
                type="button"
                onClick={impersonatedStore ? handleExitSupportMode : handleReturnToSuperAdmin}
                className="inline-flex w-full sm:w-auto justify-center min-h-[40px] items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 text-xs font-black shadow-md shadow-purple-600/30 transition active:scale-95"
                title="Retornar ao Painel Master Super Admin"
              >
                <Crown className="h-3.5 w-3.5" />
                <span>👑 Voltar ao Super Admin</span>
              </button>
            )}

            {/* No Painel Super Admin: botão de alternância rápida para o Painel Clarice */}
            {userRole === 'super_admin' && (
              <button
                type="button"
                onClick={handleSwitchToClaricePanel}
                className="inline-flex w-full sm:w-auto justify-center min-h-[40px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 px-3.5 py-2 text-xs font-black shadow-md shadow-yellow-500/20 transition active:scale-95"
                title="Acessar o Painel de Controle oficial da Clarice Achadinhos"
              >
                <Store className="h-3.5 w-3.5" />
                <span>🏪 Painel Clarice</span>
              </button>
            )}

            {userRole === 'lojista' && loggedStore && (
              <a
                href={`/?loja=${loggedStore.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full sm:w-auto justify-center min-h-[40px] items-center gap-1.5 rounded-xl bg-[#FFE600] hover:bg-yellow-400 text-slate-950 px-3.5 py-2 text-xs font-black shadow-md shadow-yellow-500/20 transition active:scale-95"
                title="Abrir minha vitrine pública em nova aba"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>↗ Ver Minha Vitrine</span>
              </a>
            )}
            <button
              onClick={handleLogout}
              className="hidden sm:inline-flex shrink-0 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal com Abas */}
      <main className="mx-auto max-w-7xl px-3 sm:px-4 py-3 sm:py-6 overflow-x-hidden w-full max-w-full">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full overflow-x-hidden">
          {/* Barra de Abas: Super Admin e Lojista com navegação responsiva */}
          <TabsList
            className={cn(
              'grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 w-full h-auto p-1.5 rounded-2xl mb-3 sm:mb-5 bg-slate-900 border border-slate-800',
              userRole === 'super_admin'
                ? 'lg:grid lg:grid-cols-4'
                : 'lg:grid lg:grid-cols-5'
            )}
          >
            {userRole === 'super_admin' ? (
              <>
                <TabsTrigger
                  value="produtos"
                  className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm min-h-[42px] rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold transition flex items-center justify-center text-center"
                >
                  <ShoppingBag className="h-4 w-4 mr-1.5 shrink-0" />
                  <span className="truncate">Produtos ({c.products.length})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="saas"
                  className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm min-h-[42px] rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold transition flex items-center justify-center text-center"
                >
                  <Users className="h-4 w-4 mr-1.5 shrink-0" />
                  <span className="truncate">Clientes SaaS ({stores.length})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="radar"
                  className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm min-h-[42px] rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold transition flex items-center justify-center text-center"
                >
                  <Zap className="h-4 w-4 mr-1.5 shrink-0" />
                  <span className="truncate">Fila do Radar ({c.pendingProducts.length})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="config"
                  className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm min-h-[42px] rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold transition flex items-center justify-center text-center"
                >
                  <Settings className="h-4 w-4 mr-1.5 shrink-0" />
                  <span className="truncate">Configurações</span>
                </TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger
                  value="produtos"
                  className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm min-h-[42px] rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold transition flex items-center justify-center text-center"
                >
                  <ShoppingBag className="h-4 w-4 mr-1.5 shrink-0" />
                  <span className="truncate">Meus Produtos ({filteredProducts.length})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="disparador-vip"
                  className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm min-h-[42px] rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold transition flex items-center justify-center text-center"
                >
                  <MessageCircle className="h-4 w-4 mr-1.5 shrink-0" />
                  <span>Disparador VIP</span>
                </TabsTrigger>
                <TabsTrigger
                  value="minha-loja"
                  className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm min-h-[42px] rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold transition flex items-center justify-center text-center"
                >
                  <Palette className="h-4 w-4 mr-1.5 shrink-0" />
                  <span>Minha Loja</span>
                </TabsTrigger>
                <TabsTrigger
                  value="minha-assinatura"
                  className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm min-h-[42px] rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold transition flex items-center justify-center text-center"
                >
                  <CreditCard className="h-4 w-4 mr-1.5 shrink-0" />
                  <span>Minha Assinatura</span>
                </TabsTrigger>
                <TabsTrigger
                  value="guia-uso"
                  className="col-span-2 sm:col-span-1 px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm min-h-[42px] rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold transition flex items-center justify-center text-center"
                >
                  <GraduationCap className="h-4 w-4 mr-1.5 shrink-0" />
                  <span>🎓 Guia de Uso</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* ========================================================================= */}
          {/* ABA 1: PRODUTOS (MEUS PRODUTOS OU GERAL) */}
          {/* ========================================================================= */}
          <TabsContent value="produtos" className="space-y-6 overflow-x-hidden w-full max-w-full">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 w-full max-w-full min-w-0">
              {/* Formulário de Cadastro / Edição */}
              <div className="w-full max-w-full min-w-0 lg:col-span-5 rounded-3xl border border-slate-800 bg-[#0F172A] p-4 sm:p-5 shadow-xl">
                {/* Seletor de Modo: Cadastro Individual vs. Importação em Lote */}
                <div className="grid grid-cols-2 gap-2 w-full rounded-2xl bg-slate-950 p-1 border border-slate-800 mb-4">
                  <button
                    type="button"
                    onClick={() => setProductInputMode('individual')}
                    className={cn(
                      'py-2.5 px-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-center min-h-[40px]',
                      productInputMode === 'individual'
                        ? 'bg-[#FFE600] text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{editingProductId ? 'Editar Oferta' : 'Cadastro Individual'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProductId(null);
                      setProductInputMode('batch');
                    }}
                    className={cn(
                      'py-2.5 px-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-center min-h-[40px]',
                      productInputMode === 'batch'
                        ? 'bg-[#FFE600] text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    <Zap className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Puxar Dados / Lote</span>
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

                  {/* Selo Permanente de Rastreamento de Afiliado */}
                  {(() => {
                    const activeStore =
                      userRole === 'lojista' && loggedStore
                        ? loggedStore
                        : stores.find(
                            (s) =>
                              s.slug ===
                              (selectedStoreFilter === 'todos' ? 'clarice' : selectedStoreFilter)
                          ) || (selectedStoreFilter === 'todos' || selectedStoreFilter === 'clarice' ? DEFAULT_CLARICE_STORE : undefined);
                    const hasMl = Boolean(activeStore?.mlAffiliateTag);
                    const hasShopee = Boolean(
                      activeStore?.shopeeAffiliateId || activeStore?.shopeeAppId
                    );
                    const isConfigured = hasMl || hasShopee;

                    if (isConfigured) {
                      return (
                        <div className="w-full min-w-0 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-[11px] font-semibold text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                          <span className="truncate min-w-0 flex-1">
                            ✅ Rastreamento Permanente Ativo: ML ({activeStore?.mlAffiliateTag || 'padrão'}) • Shopee ({activeStore?.shopeeAffiliateId || activeStore?.shopeeAppId || 'padrão'})
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div className="w-full min-w-0 flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-[11px] text-amber-300">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                          <span className="truncate">Credenciais de afiliado não configuradas nesta loja.</span>
                        </div>
                        {userRole === 'lojista' && (
                          <button
                            type="button"
                            onClick={() => handleTabChange('minha-loja')}
                            className="underline font-bold text-amber-300 hover:text-white shrink-0 text-[10px]"
                          >
                            Configurar em Minha Loja ↗
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* URL de Afiliado com Auto-Detection */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Link de Afiliado Oficial
                      </label>
                      <button
                        type="button"
                        onClick={handleFetchOgMetadata}
                        disabled={isFetchingOg || !productAffiliateUrl.trim()}
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

                    {/* Botão Destaque: Puxar Dados do Link Automaticamente */}
                    <button
                      type="button"
                      onClick={handleFetchOgMetadata}
                      disabled={isFetchingOg || !productAffiliateUrl.trim()}
                      className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-amber-400 to-[#FFE600] hover:from-yellow-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-2"
                    >
                      {isFetchingOg ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                          <span>Puxando dados do link...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 shrink-0 fill-current" />
                          <span>⚡ Puxar Dados do Link Automaticamente</span>
                        </>
                      )}
                    </button>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer p-3 rounded-xl border border-slate-800 bg-slate-950/60 min-h-[46px]">
                      <Switch checked={productFreeShipping} onCheckedChange={setProductFreeShipping} />
                      <span>Frete Grátis</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer p-3 rounded-xl border border-slate-800 bg-slate-950/60 min-h-[46px]">
                      <Switch checked={productFeatured} onCheckedChange={setProductFeatured} />
                      <span>Destaque Carrossel</span>
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
              <LojistaBatchImport
                lojaSlug={
                  userRole === 'lojista' && loggedStore
                    ? loggedStore.slug
                    : selectedStoreFilter !== 'todos'
                    ? selectedStoreFilter
                    : 'clarice'
                }
                store={
                  userRole === 'lojista' && loggedStore
                    ? loggedStore
                    : stores.find(
                        (s) =>
                          s.slug ===
                          (selectedStoreFilter !== 'todos' ? selectedStoreFilter : 'clarice')
                      ) || (selectedStoreFilter === 'todos' || selectedStoreFilter === 'clarice' ? DEFAULT_CLARICE_STORE : undefined)
                }
                currentProductCount={
                  c.products.filter(
                    (p) =>
                      p.lojaSlug ===
                      (userRole === 'lojista' && loggedStore
                        ? loggedStore.slug
                        : selectedStoreFilter !== 'todos'
                        ? selectedStoreFilter
                        : 'clarice')
                  ).length
                }
                permissions={
                  userRole === 'super_admin'
                    ? getPlanPermissions('advanced')
                    : lojistaPermissions
                }
                isSuperAdmin={userRole === 'super_admin'}
                onImported={(imported) => {
                  c.add(imported);
                  setProductInputMode('individual');
                }}
                onUpgrade={() => handleTabChange('minha-assinatura')}
                onNavigateTab={handleTabChange}
              />
            )}
          </div>

          {/* Listagem de Produtos */}
          <div className="w-full max-w-full min-w-0 lg:col-span-7 rounded-3xl border border-slate-800 bg-[#0F172A] p-4 sm:p-5 shadow-xl">
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
                  {lojistaPermissions.maxProducts < Infinity ? (
                    <span>
                      <strong className="text-[#FFE600]">{c.products.filter((p) => p.lojaSlug === loggedStore.slug).length}</strong>/{lojistaPermissions.maxProducts} produtos cadastrados
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
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Filtrar por nome ou ID..."
                      className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-[#FFE600] w-full sm:w-48"
                    />
                    <select
                      value={marketFilter}
                      onChange={(e) => setMarketFilter(e.target.value as any)}
                      className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none shrink-0"
                    >
                      <option value="todos">Todos</option>
                      <option value="mercadolivre">ML</option>
                      <option value="shopee">Shopee</option>
                    </select>
                  </div>
                </div>

                {c.products.filter((p) => p.lojaSlug === (loggedStore?.slug || 'clarice')).length === 0 ? (
                  <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFE600]/10 text-[#FFE600] border border-yellow-500/20">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      Sua loja ainda não tem produtos cadastrados
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">
                      Cole um link do Mercado Livre ou Shopee no formulário ao lado e clique em <strong>"⚡ Puxar Dados do Link Automaticamente"</strong> para publicar sua 1ª oferta em segundos!
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const inputEl = document.querySelector('input[placeholder*="meli.la"], input[placeholder*="shopee.com"]') as HTMLInputElement;
                        inputEl?.focus();
                        inputEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-[#FFE600] px-4 py-2.5 text-xs font-black text-slate-950 shadow-md shadow-yellow-500/20 cursor-pointer active:scale-95 transition"
                    >
                      <Plus className="h-3.5 w-3.5" /> Cadastrar 1ª Oferta Agora
                    </button>
                  </div>
                ) : filteredProducts.length === 0 ? (
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

                        <div className="flex items-center gap-1.5 shrink-0">
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
                            className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition min-h-[40px] min-w-[40px] flex items-center justify-center"
                            title="Editar oferta"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await c.remove(p.id, {
                                role: userRole,
                                email: userRole === 'super_admin' ? 'super_admin@clarice.com' : (loggedStore?.ownerEmail || undefined),
                              });
                              toast.success('Produto removido com sucesso!');
                            }}
                            className="rounded-lg bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
                            title="Remover produto"
                          >
                            <Trash2 className="h-4 w-4" />
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
            <TabsContent value="disparador-vip" className="space-y-6 overflow-x-hidden w-full max-w-full">
              <LojistaVipDispatcher
                store={loggedStore}
                products={c.products}
                permissions={lojistaPermissions}
                onUpgrade={() => handleTabChange('minha-assinatura')}
              />
            </TabsContent>
          )}

          {/* ========================================================================= */}
          {/* ABA 3 (LOJISTA): MINHA LOJA (CUSTOMIZAÇÃO DE BRANDING) */}
          {/* ========================================================================= */}
          {userRole === 'lojista' && loggedStore && (
            <TabsContent value="minha-loja" className="space-y-6 overflow-x-hidden w-full max-w-full">
              <LojistaStoreSettings
                store={loggedStore}
                permissions={lojistaPermissions}
                onSaved={(updates) => {
                  setLoggedStore((prev) => (prev ? { ...prev, ...updates } : prev));
                }}
                onUpgrade={() => handleTabChange('minha-assinatura')}
              />
            </TabsContent>
          )}

          {/* ========================================================================= */}
          {/* ABA 3 (LOJISTA): MINHA ASSINATURA ASAAS */}
          {/* ========================================================================= */}
          {userRole === 'lojista' && loggedStore && (
            <TabsContent value="minha-assinatura" className="space-y-6 overflow-x-hidden w-full max-w-full">
              <div className="rounded-3xl border border-slate-800 bg-[#0F172A] p-4 sm:p-6 shadow-xl max-w-2xl overflow-x-hidden w-full">
                <div className="border-b border-slate-800 pb-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
                      'px-2.5 py-1 rounded-full text-xs font-black uppercase shrink-0',
                      loggedStore.statusAssinatura === 'ativo'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    )}
                  >
                    {loggedStore.statusAssinatura.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        onClick={() => handleGenerateAsaasCheckout()}
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

                  {/* Comparativo de Planos & Opções de Upgrade */}
                  <div className="pt-5 border-t border-slate-800">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">
                      Comparativo de Planos & Upgrades
                    </h3>
                    <div className="grid sm:grid-cols-3 gap-3">
                      {PLAN_CARDS.map((card) => {
                        const isCurrent = loggedStore.plano === card.id;
                        return (
                          <div
                            key={card.id}
                            className={cn(
                              'rounded-2xl border p-3.5 flex flex-col justify-between',
                              isCurrent
                                ? 'border-[#FFE600] bg-yellow-500/10'
                                : 'border-slate-800 bg-slate-950'
                            )}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-white text-xs">{card.name}</span>
                                {isCurrent && (
                                  <span className="text-[9px] font-black uppercase bg-[#FFE600] text-slate-950 px-1.5 py-0.5 rounded">
                                    Atual
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-sm font-black text-white">{card.price}</div>
                              <ul className="mt-2.5 space-y-1 text-[10px] text-slate-300">
                                {card.features.slice(0, 3).map((f, i) => (
                                  <li key={i} className="flex items-center gap-1">
                                    <Check className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                                    <span className="truncate">{f}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {!isCurrent && (
                              <button
                                type="button"
                                disabled={isGeneratingAsaas}
                                onClick={() => handleGenerateAsaasCheckout(card.id)}
                                className="mt-3 w-full py-1.5 rounded-xl bg-slate-800 hover:bg-[#FFE600] hover:text-slate-950 text-xs font-bold text-white transition active:scale-95 border border-slate-700"
                              >
                                Mudar para {card.name}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}

          {/* ========================================================================= */}
          {/* ABA 5 (LOJISTA): GUIA DE USO COM VÍDEOS TUTORIAIS DA CLARICE */}
          {/* ========================================================================= */}
          {userRole === 'lojista' && loggedStore && (
            <TabsContent value="guia-uso" className="space-y-6 overflow-x-hidden w-full max-w-full">
              <LojistaTutorialGuide
                store={loggedStore}
                onNavigateTab={handleTabChange}
              />
            </TabsContent>
          )}

          {/* ========================================================================= */}
          {/* ABA 2 (SUPER ADMIN): CLIENTES SAAS & GESTÃO MULTI-TENANT */}
          {/* ========================================================================= */}
          {userRole === 'super_admin' && (
            <TabsContent value="saas" className="space-y-6 overflow-x-hidden w-full max-w-full">
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
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* Botão Gerenciar (Abre Drawer de Governança do Super Admin) */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDrawerStore(s);
                                    setDrawerOpen(true);
                                  }}
                                  className="rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 px-2.5 py-1 text-[11px] font-bold transition flex items-center gap-1 shadow-xs"
                                  title="Abrir painel de governança, dados e senha"
                                >
                                  <Settings className="h-3 w-3" />
                                  <span>Gerenciar</span>
                                </button>

                                {/* Botão Entrar no Painel (Modo Suporte) */}
                                <button
                                  type="button"
                                  onClick={() => handleEnterSupportMode(s)}
                                  className="rounded-lg bg-gradient-to-r from-amber-400 to-[#FFE600] px-2.5 py-1 text-[11px] font-black text-slate-950 shadow-xs hover:bg-yellow-400 transition flex items-center gap-1 active:scale-95"
                                  title="Acessar o painel desta loja em Modo Suporte"
                                >
                                  <LogIn className="h-3 w-3" />
                                  <span>Entrar no Painel</span>
                                </button>

                                {s.slug !== 'clarice' && (
                                  <>
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
                                  </>
                                )}
                              </div>
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
            <TabsContent value="radar" className="space-y-6 overflow-x-hidden w-full max-w-full">
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
            <TabsContent value="config" className="space-y-6 overflow-x-hidden w-full max-w-full">
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

                {/* Gerenciador de Vídeos Tutoriais da Clarice */}
                <div className="mt-8 pt-6 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-[#FFE600]" />
                        Vídeos da Central de Ajuda • Guia de Uso da Clarice
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Defina as URLs dos vídeos tutoriais para os lojistas parceiros (YouTube, Vimeo ou .mp4). O primeiro slot é exibido em destaque principal como Guia Rápido (45s). As aulas 2 a 5 só são exibidas para os lojistas caso possuam um vídeo cadastrado.
                      </p>
                    </div>
                    {loadingAdminTutorials && (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    )}
                  </div>

                  <div className="space-y-3">
                    {adminTutorials.map((lesson, idx) => (
                      <div
                        key={lesson.id}
                        className={cn(
                          'rounded-2xl border p-3.5 space-y-2.5 transition',
                          idx === 0
                            ? 'border-[#FFE600]/40 bg-gradient-to-r from-amber-500/10 via-slate-950 to-slate-950'
                            : 'border-slate-800 bg-slate-950'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FFE600] text-slate-950 font-black text-[10px]">
                              {lesson.ordem}
                            </span>
                            <span className="font-bold text-white text-xs sm:text-sm">
                              {lesson.titulo}
                            </span>
                            {idx === 0 ? (
                              <span className="rounded-full bg-[#FFE600]/20 border border-[#FFE600]/40 px-2 py-0.5 text-[10px] font-black uppercase text-[#FFE600]">
                                ⚡ Destaque Principal
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                                {tutorialUrlDrafts[lesson.id] ? '✅ Ativo no Painel' : 'Oculto sem vídeo'}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {lesson.duracao}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {lesson.descricao}
                        </p>

                        <div className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
                          <input
                            type="url"
                            value={tutorialUrlDrafts[lesson.id] ?? ''}
                            onChange={(e) =>
                              setTutorialUrlDrafts((prev) => ({
                                ...prev,
                                [lesson.id]: e.target.value,
                              }))
                            }
                            placeholder={idx === 0 ? "Ex: https://youtu.be/... ou URL direta .mp4 (Guia Rápido)" : "Ex: https://youtu.be/... ou URL direta .mp4"}
                            className="flex-1 min-w-[200px] rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-[#FFE600] focus:outline-none"
                          />

                          {/* Upload direto de vídeo MP4/WebM */}
                          <input
                            id={`tutorial-file-${lesson.id}`}
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            className="hidden"
                            onChange={(e) => handleUploadTutorialFile(lesson.id, e)}
                          />
                          <button
                            type="button"
                            disabled={uploadingTutorialId === lesson.id}
                            onClick={() => document.getElementById(`tutorial-file-${lesson.id}`)?.click()}
                            className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 hover:text-white px-3 py-1.5 text-xs font-bold text-slate-200 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                            title="Enviar vídeo .mp4 ou .webm do computador"
                          >
                            {uploadingTutorialId === lesson.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FFE600]" />
                                <span className="text-[#FFE600]">Enviando...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="h-3.5 w-3.5 text-[#FFE600]" />
                                <span>📤 Enviar MP4</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSaveTutorialVideo(lesson.id)}
                            disabled={savingTutorialId === lesson.id}
                            className="rounded-xl bg-[#FFE600] hover:bg-yellow-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                          >
                            {savingTutorialId === lesson.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            <span>Salvar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Rodapé Institucional FCIA */}
      <footer className="mt-12 border-t border-slate-800/80 bg-[#0F172A] py-6 px-4 text-center text-xs text-slate-400">
        <p>© 2026 FCIA • Todos os direitos reservados.</p>
      </footer>

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

      {/* Drawer de Governança e Controle Total do Super Admin */}
      <SuperAdminTenantDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerStore(null);
        }}
        store={drawerStore}
        superAdminEmail="super_admin@clarice.com"
        onStoreUpdated={(updatedStore) => {
          setStores((prev) =>
            prev.map((s) => (s.id === updatedStore.id || s.slug === updatedStore.slug ? updatedStore : s))
          );
          if (loggedStore?.slug === updatedStore.slug) {
            setLoggedStore(updatedStore);
          }
        }}
        onStoreDeleted={(deletedSlug) => {
          setStores((prev) => prev.filter((s) => s.slug !== deletedSlug));
          if (loggedStore?.slug === deletedSlug) {
            handleExitSupportMode();
          }
        }}
        onEnterSupportMode={(targetStore) => {
          handleEnterSupportMode(targetStore);
        }}
      />

      <Toaster position="bottom-center" richColors />
    </div>
  );
}
