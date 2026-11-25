import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Store,
  Key,
  ShoppingBag,
  History,
  ShieldAlert,
  CheckCircle2,
  Copy,
  RotateCcw,
  Trash2,
  ExternalLink,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  Search,
  Power,
  RefreshCw,
  Crown,
  AlertTriangle,
  LogIn,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { LojaAfiliado, SubscriptionPlan, SubscriptionStatus } from '@/types/tenant';
import { PLANO_PRICES } from '@/types/tenant';
import {
  adminUpdateTenantDataServerFn,
  adminResetTenantPasswordServerFn,
  adminDeleteTenantServerFn,
  adminGetTenantOverviewServerFn,
  adminRestoreProductServerFn,
  recordProductAuditServerFn,
  type AuditLogEntry,
} from '@/services/superAdminServerFn';
import { supabase } from '@/lib/supabase';

interface SuperAdminTenantDrawerProps {
  open: boolean;
  onClose: () => void;
  store: LojaAfiliado | null;
  onStoreUpdated: (updatedStore: LojaAfiliado) => void;
  onStoreDeleted: (slug: string) => void;
  onEnterSupportMode: (store: LojaAfiliado) => void;
  superAdminEmail?: string;
}

type DrawerTab = 'dados' | 'acesso' | 'produtos' | 'auditoria';

export function SuperAdminTenantDrawer({
  open,
  onClose,
  store,
  onStoreUpdated,
  onStoreDeleted,
  onEnterSupportMode,
  superAdminEmail = 'super_admin@clarice.com',
}: SuperAdminTenantDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('dados');
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Form State: Dados & Afiliados
  const [nomeLoja, setNomeLoja] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [whatsappContato, setWhatsappContato] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [plano, setPlano] = useState<SubscriptionPlan>('pro');
  const [statusAssinatura, setStatusAssinatura] = useState<SubscriptionStatus>('ativo');
  const [whatsappVipUrl, setWhatsappVipUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [mlAffiliateTag, setMlAffiliateTag] = useState('');
  const [mlMattTool, setMlMattTool] = useState('');
  const [shopeeAffiliateId, setShopeeAffiliateId] = useState('');
  const [shopeeAppId, setShopeeAppId] = useState('');
  const [shopeeSecret, setShopeeSecret] = useState('');
  const [showShopeeSecret, setShowShopeeSecret] = useState(false);
  const [dominioCustomizado, setDominioCustomizado] = useState('');
  const [savingDados, setSavingDados] = useState(false);

  // Form State: Acesso & Senha
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // State: Produtos
  const [productSearch, setProductSearch] = useState('');
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);

  // State: Exclusão Permanente
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmationSlug, setConfirmationSlug] = useState('');
  const [deletingTenant, setDeletingTenant] = useState(false);

  // State: Restauração
  const [restoringLogId, setRestoringLogId] = useState<string | null>(null);

  // Sincroniza formulário com loja selecionada
  useEffect(() => {
    if (!store) return;
    setNomeLoja(store.nomeLoja || '');
    setSubtitulo(store.subtitulo || '');
    setOwnerEmail(store.ownerEmail || '');
    setWhatsappContato(store.whatsappContato || '');
    setCpfCnpj(store.cpfCnpj || '');
    setPlano(store.plano || 'pro');
    setStatusAssinatura(store.statusAssinatura || 'ativo');
    setWhatsappVipUrl(store.whatsappVipUrl || '');
    setInstagramUrl(store.instagramUrl || '');
    setMlAffiliateTag(store.mlAffiliateTag || '');
    setMlMattTool(store.mlMattTool || '');
    setShopeeAffiliateId(store.shopeeAffiliateId || '');
    setShopeeAppId(store.shopeeAppId || '');
    setShopeeSecret(
      store.shopeeSecret && !store.shopeeSecret.includes('|') ? store.shopeeSecret : ''
    );
    setDominioCustomizado(store.dominioCustomizado || '');
    setNewPassword('');
    setProductSearch('');
    setActiveTab('dados');
  }, [store]);

  // Carrega produtos e logs de auditoria do servidor via Service Role
  const loadOverview = async (targetSlug?: string) => {
    const slug = targetSlug || store?.slug;
    if (!slug) return;
    setLoadingOverview(true);
    try {
      const res = await adminGetTenantOverviewServerFn({ data: { slug } });
      if (res.success) {
        setProducts(res.products || []);
        setAuditLogs(res.auditLogs || []);
      } else {
        toast.error(res.error || 'Falha ao carregar visão geral da loja.');
      }
    } catch (err: any) {
      console.warn('[SuperAdminTenantDrawer] Erro ao carregar overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    if (open && store?.slug) {
      loadOverview(store.slug);
    }
  }, [open, store?.slug]);

  // 1. Salvar Dados & Afiliados
  const handleSaveDados = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setSavingDados(true);
    try {
      const res = await adminUpdateTenantDataServerFn({
        data: {
          slug: store.slug,
          actorEmail: superAdminEmail,
          updates: {
            nome_loja: nomeLoja,
            subtitulo,
            owner_email: ownerEmail,
            whatsapp_contato: whatsappContato,
            cpf_cnpj: cpfCnpj,
            plano,
            status_assinatura: statusAssinatura,
            whatsapp_vip_url: whatsappVipUrl,
            instagram_url: instagramUrl,
            ml_affiliate_tag: mlAffiliateTag,
            ml_matt_tool: mlMattTool,
            shopee_affiliate_id: shopeeAffiliateId,
            shopee_app_id: shopeeAppId,
            shopee_secret: shopeeSecret,
            dominio_customizado: dominioCustomizado,
          },
        },
      });

      if (res.success && res.store) {
        toast.success(`Dados da loja "${nomeLoja}" atualizados com sucesso!`);
        onStoreUpdated({
          ...store,
          nomeLoja,
          subtitulo,
          ownerEmail,
          whatsappContato,
          cpfCnpj,
          plano,
          statusAssinatura,
          whatsappVipUrl,
          instagramUrl,
          mlAffiliateTag,
          mlMattTool,
          shopeeAffiliateId,
          shopeeAppId,
          shopeeSecret,
          dominioCustomizado,
        });
        loadOverview(store.slug);
      } else {
        toast.error(res.error || 'Erro ao salvar alterações da loja.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Falha na comunicação com o servidor.');
    } finally {
      setSavingDados(false);
    }
  };

  // 2. Gerar e Redefinir Senha
  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pass = 'P@ss';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setShowPassword(true);
    toast.info('Senha forte gerada com sucesso!');
  };

  const handleResetPassword = async () => {
    if (!store) return;
    if (!ownerEmail || !ownerEmail.includes('@')) {
      toast.error('Informe um e-mail válido para a loja antes de salvar a senha.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await adminResetTenantPasswordServerFn({
        data: {
          slug: store.slug,
          ownerEmail,
          newPassword,
          actorEmail: superAdminEmail,
        },
      });

      if (res.success) {
        toast.success('Senha de acesso redefinida com sucesso!');
        loadOverview(store.slug);
      } else {
        toast.error(res.error || 'Erro ao redefinir senha.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao redefinir senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  const copyCredentialsForWhatsApp = () => {
    if (!store) return;
    const pass = newPassword || '••••••••';
    const msg = `🎉 *Acesso ao Painel Lojista • ${nomeLoja}*\n\n` +
      `Olá! Aqui estão as suas credenciais para gerenciar sua vitrine de ofertas:\n\n` +
      `🔗 *Painel Administrativo:* https://clariceachadinhos.vercel.app/admin\n` +
      `📧 *E-mail de Login:* ${ownerEmail}\n` +
      `🔑 *Senha:* ${pass}\n\n` +
      `🌐 *Sua Vitrine Pública:* https://clariceachadinhos.vercel.app/?loja=${store.slug}\n\n` +
      `Qualquer dúvida, conte com o nosso suporte!`;

    navigator.clipboard.writeText(msg);
    toast.success('Mensagem de credenciais copiada para o WhatsApp!');
  };

  // 3. Ativar/Pausar Produto
  const handleToggleProductStatus = async (product: any) => {
    if (!store) return;
    const newActive = !product.active;
    setTogglingProductId(product.id);
    try {
      const { error } = await supabase
        .from('produtos_clarice')
        .update({
          active: newActive,
          status: newActive ? 'ativo' : 'inativo',
        })
        .eq('id', product.id);

      if (error) throw error;

      await recordProductAuditServerFn({
        data: {
          lojaSlug: store.slug,
          actorRole: 'super_admin',
          actorEmail: superAdminEmail,
          action: 'PRODUTO_EDITADO',
          entityId: product.id,
          entityTitle: product.title,
          payload: {
            field: 'active',
            from: product.active,
            to: newActive,
          },
        },
      });

      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, active: newActive, status: newActive ? 'ativo' : 'inativo' } : p))
      );
      toast.success(newActive ? 'Produto reativado na vitrine!' : 'Produto pausado na vitrine.');
      loadOverview(store.slug);
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao atualizar status do produto.');
    } finally {
      setTogglingProductId(null);
    }
  };

  // 4. Excluir Produto (com snapshot em saas_audit_logs)
  const handleDeleteProduct = async (product: any) => {
    if (!store) return;
    if (!confirm(`Deseja remover "${product.title}"? O item será movido para a lixeira/auditoria e poderá ser restaurado.`)) return;

    try {
      // Grava snapshot de auditoria primeiro para segurança
      await recordProductAuditServerFn({
        data: {
          lojaSlug: store.slug,
          actorRole: 'super_admin',
          actorEmail: superAdminEmail,
          action: 'PRODUTO_EXCLUIDO',
          entityId: product.id,
          entityTitle: product.title,
          payload: { product },
        },
      });

      const { error } = await supabase
        .from('produtos_clarice')
        .delete()
        .eq('id', product.id);

      if (error) throw error;

      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast.success('Produto removido! O snapshot está disponível na aba "Auditoria & Lixeira".');
      loadOverview(store.slug);
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao excluir produto.');
    }
  };

  // 5. Restaurar Produto a partir da Lixeira
  const handleRestoreProduct = async (logId: string) => {
    if (!store) return;
    setRestoringLogId(logId);
    try {
      const res = await adminRestoreProductServerFn({
        data: { logId, actorEmail: superAdminEmail },
      });

      if (res.success && res.restoredProduct) {
        toast.success(`Produto "${res.restoredProduct.title}" restaurado com sucesso!`);
        loadOverview(store.slug);
      } else {
        toast.error(res.error || 'Erro ao restaurar produto.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao restaurar produto.');
    } finally {
      setRestoringLogId(null);
    }
  };

  // 6. Excluir Loja Permanentemente
  const handleDeleteTenant = async () => {
    if (!store) return;
    if (confirmationSlug.trim().toLowerCase() !== store.slug.toLowerCase()) {
      toast.error(`Digite exatamente "${store.slug}" para confirmar a exclusão.`);
      return;
    }

    setDeletingTenant(true);
    try {
      const res = await adminDeleteTenantServerFn({
        data: {
          slug: store.slug,
          confirmationSlug,
          actorEmail: superAdminEmail,
        },
      });

      if (res.success) {
        toast.success(`Loja "${store.nomeLoja}" (${store.slug}) e seus produtos foram excluídos permanentemente.`);
        onStoreDeleted(store.slug);
        setDeleteModalOpen(false);
        onClose();
      } else {
        toast.error(res.error || 'Falha ao excluir loja.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro inesperado na exclusão.');
    } finally {
      setDeletingTenant(false);
    }
  };

  // Produtos filtrados na busca interna
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase().trim();
    return products.filter(
      (p) => p.title?.toLowerCase().includes(q) || p.mlb_id?.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  if (!open || !store) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Container Drawer Responsivo: 100% no mobile (360px), max-w-2xl no desktop */}
      <div className="flex h-full w-full max-w-2xl flex-col bg-[#0F172A] text-slate-100 shadow-2xl border-l border-slate-800 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#0A0E17]/90 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Crown className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white truncate max-w-[200px] sm:max-w-xs">
                  {store.nomeLoja}
                </h2>
                <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-purple-300">
                  /{store.slug}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {store.ownerEmail || 'Sem e-mail cadastrado'} • Plano {store.plano.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Botão Modo Suporte (Entrar no Painel da Loja) */}
            <button
              type="button"
              onClick={() => {
                onEnterSupportMode(store);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-[#FFE600] px-3 py-1.5 text-xs font-black text-slate-950 shadow-md shadow-yellow-500/20 hover:bg-yellow-400 transition active:scale-95"
              title="Abrir o painel como lojista (Modo Suporte)"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Entrar no Painel</span>
              <span className="sm:hidden">Entrar</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Barra de Abas */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('dados')}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-3.5 py-3 text-xs font-bold transition whitespace-nowrap',
              activeTab === 'dados'
                ? 'border-[#FFE600] text-[#FFE600]'
                : 'border-transparent text-slate-400 hover:text-white'
            )}
          >
            <Store className="h-3.5 w-3.5" />
            <span>Dados & Afiliados</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('acesso')}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-3.5 py-3 text-xs font-bold transition whitespace-nowrap',
              activeTab === 'acesso'
                ? 'border-[#FFE600] text-[#FFE600]'
                : 'border-transparent text-slate-400 hover:text-white'
            )}
          >
            <Key className="h-3.5 w-3.5" />
            <span>Acesso & Senha</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('produtos')}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-3.5 py-3 text-xs font-bold transition whitespace-nowrap',
              activeTab === 'produtos'
                ? 'border-[#FFE600] text-[#FFE600]'
                : 'border-transparent text-slate-400 hover:text-white'
            )}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Produtos ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('auditoria')}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-3.5 py-3 text-xs font-bold transition whitespace-nowrap',
              activeTab === 'auditoria'
                ? 'border-[#FFE600] text-[#FFE600]'
                : 'border-transparent text-slate-400 hover:text-white'
            )}
          >
            <History className="h-3.5 w-3.5" />
            <span>Auditoria & Lixeira ({auditLogs.length})</span>
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ========================================================================= */}
          {/* ABA 1: DADOS & AFILIADOS */}
          {/* ========================================================================= */}
          {activeTab === 'dados' && (
            <form onSubmit={handleSaveDados} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nome da Loja</label>
                  <input
                    type="text"
                    value={nomeLoja}
                    onChange={(e) => setNomeLoja(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-white outline-none focus:ring-1 focus:ring-[#FFE600]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Slug da Vitrine (Fixo)</label>
                  <input
                    type="text"
                    value={store.slug}
                    disabled
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-slate-400 cursor-not-allowed font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">E-mail do Lojista (Login)</label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-white outline-none focus:ring-1 focus:ring-[#FFE600]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">WhatsApp de Contato</label>
                  <input
                    type="text"
                    value={whatsappContato}
                    onChange={(e) => setWhatsappContato(e.target.value)}
                    placeholder="Ex: 11999998888"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-white outline-none focus:ring-1 focus:ring-[#FFE600]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">CPF / CNPJ</label>
                  <input
                    type="text"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    placeholder="Documento cadastral"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-white outline-none focus:ring-1 focus:ring-[#FFE600]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Plano Assinado</label>
                  <select
                    value={plano}
                    onChange={(e) => setPlano(e.target.value as SubscriptionPlan)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-white outline-none focus:ring-1 focus:ring-[#FFE600]"
                  >
                    <option value="start">START (R$ 47/mês • 20 produtos)</option>
                    <option value="pro">PRO (R$ 97/mês • 100 produtos)</option>
                    <option value="vip">VIP (R$ 197/mês • Ilimitado)</option>
                    <option value="enterprise">ENTERPRISE (Custom)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Status da Assinatura</label>
                  <select
                    value={statusAssinatura}
                    onChange={(e) => setStatusAssinatura(e.target.value as SubscriptionStatus)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-white outline-none focus:ring-1 focus:ring-[#FFE600]"
                  >
                    <option value="ativo">🟢 Ativo (Vitrine Liberada)</option>
                    <option value="pendente">🟡 Pendente (Aguardando Aprovação)</option>
                    <option value="inadimplente">🔴 Inadimplente / Bloqueado</option>
                    <option value="cancelado">⚫ Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Domínio Customizado (Opcional)</label>
                  <input
                    type="text"
                    value={dominioCustomizado}
                    onChange={(e) => setDominioCustomizado(e.target.value)}
                    placeholder="ex: ofertas.minhaloja.com.br"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-white outline-none focus:ring-1 focus:ring-[#FFE600]"
                  />
                </div>
              </div>

              {/* Seção de Tags de Afiliado */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 mt-4">
                <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Parâmetros de Afiliado Exclusivos
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Mercado Livre: matt_word (Tag)
                    </label>
                    <input
                      type="text"
                      value={mlAffiliateTag}
                      onChange={(e) => setMlAffiliateTag(e.target.value)}
                      placeholder="Ex: tatianemirianbernardoconcei"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Mercado Livre: matt_tool (ID Ferramenta)
                    </label>
                    <input
                      type="text"
                      value={mlMattTool}
                      onChange={(e) => setMlMattTool(e.target.value)}
                      placeholder="Ex: 51555285"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono text-[11px]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Shopee: Affiliate ID (af_siteid)
                    </label>
                    <input
                      type="text"
                      value={shopeeAffiliateId}
                      onChange={(e) => setShopeeAffiliateId(e.target.value)}
                      placeholder="Ex: 18318420060"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono text-[11px]"
                    />
                  </div>

                  {/* Shopee Open API Opcional */}
                  <div className="sm:col-span-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3 space-y-2 mt-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <Sparkles className="h-3.5 w-3.5 text-[#FFE600]" />
                      <span>Shopee Affiliate Open API (GraphQL)</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Opcional: preencha para puxar preços da Shopee 100% no automático apenas com o link.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                          App ID Shopee Open API
                        </label>
                        <input
                          type="text"
                          value={shopeeAppId}
                          onChange={(e) => setShopeeAppId(e.target.value)}
                          placeholder="Ex: 18364201389"
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                          Secret Shopee Open API
                        </label>
                        <div className="relative">
                          <input
                            type={showShopeeSecret ? 'text' : 'password'}
                            value={shopeeSecret}
                            onChange={(e) => setShopeeSecret(e.target.value)}
                            placeholder="••••••••••••••••"
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-3 pr-8 py-2 text-white font-mono text-[11px]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowShopeeSecret(!showShopeeSecret)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            title={showShopeeSecret ? 'Ocultar secret' : 'Ver secret'}
                          >
                            {showShopeeSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Redes e VIP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Link do Grupo VIP WhatsApp</label>
                  <input
                    type="url"
                    value={whatsappVipUrl}
                    onChange={(e) => setWhatsappVipUrl(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Instagram da Loja</label>
                  <input
                    type="url"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="https://instagram.com/..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="submit"
                  disabled={savingDados}
                  className="flex-1 rounded-xl bg-[#FFE600] py-3 text-xs font-black text-slate-950 shadow-md shadow-yellow-500/20 hover:bg-yellow-400 transition disabled:opacity-50"
                >
                  {savingDados ? 'Salvando Alterações...' : 'Salvar Alterações da Loja'}
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: ACESSO & SENHA */}
          {/* ========================================================================= */}
          {activeTab === 'acesso' && (
            <div className="space-y-5 text-xs">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#FFE600]" /> Credenciais de Login do Lojista
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Redefina a senha de acesso da cliente instantaneamente no Supabase Auth e gere o texto formatado para envio direto via WhatsApp.
                </p>

                <div className="pt-2">
                  <label className="block text-slate-300 font-semibold mb-1">E-mail Cadastrado</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={ownerEmail}
                      disabled
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-slate-300 font-mono text-xs cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-slate-300 font-semibold mb-1">Nova Senha de Acesso</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 pr-10 text-white font-mono text-xs outline-none focus:ring-1 focus:ring-[#FFE600]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      title={showPassword ? 'Ocultar' : 'Exibir'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={generateStrongPassword}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                  >
                    🎲 Gerar Senha Forte
                  </button>
                  <button
                    type="button"
                    disabled={savingPassword}
                    onClick={handleResetPassword}
                    className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950 shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
                  >
                    {savingPassword ? 'Salvando...' : 'Salvar Nova Senha'}
                  </button>
                </div>
              </div>

              {/* Botão de Envio WhatsApp */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                  <Copy className="h-3.5 w-3.5 text-emerald-400" /> Comunicação com a Cliente
                </h4>
                <p className="text-[11px] text-slate-400">
                  Copie a mensagem de boas-vindas/recuperação com link oficial e credenciais para enviar no WhatsApp da lojista:
                </p>
                <button
                  type="button"
                  onClick={copyCredentialsForWhatsApp}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] py-2.5 text-xs font-black text-slate-950 shadow-md shadow-emerald-500/20 transition active:scale-95"
                >
                  <Copy className="h-4 w-4" /> Copiar Credenciais Prontas para WhatsApp
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: PRODUTOS DA LOJA */}
          {/* ========================================================================= */}
          {activeTab === 'produtos' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar por título ou MLB..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-[#FFE600]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => loadOverview(store.slug)}
                  disabled={loadingOverview}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:text-white transition"
                  title="Recarregar catálogo"
                >
                  <RefreshCw className={cn('h-4 w-4', loadingOverview && 'animate-spin')} />
                </button>
              </div>

              {loadingOverview ? (
                <div className="py-12 text-center text-slate-400 text-xs">Carregando catálogo da loja...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 text-slate-400 text-xs">
                  Nenhum produto cadastrado para esta loja.
                </div>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-3 hover:border-slate-700 transition"
                    >
                      <img
                        src={p.image_url}
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
                          <span
                            className={cn(
                              'px-1.5 py-0.2 rounded text-[9px] font-bold uppercase',
                              p.active !== false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'
                            )}
                          >
                            {p.active !== false ? 'Ativo' : 'Pausado'}
                          </span>
                        </div>
                        <p className="font-bold text-white text-xs truncate">{p.title}</p>
                        <p className="text-[11px] text-slate-400">
                          R$ {Number(p.current_price).toFixed(2).replace('.', ',')}{' '}
                          <span className="text-emerald-400 font-semibold">({p.discount_percent || 0}% OFF)</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Ativar/Pausar */}
                        <button
                          type="button"
                          onClick={() => handleToggleProductStatus(p)}
                          disabled={togglingProductId === p.id}
                          className={cn(
                            'p-2 rounded-xl transition',
                            p.active !== false
                              ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          )}
                          title={p.active !== false ? 'Pausar oferta na vitrine' : 'Reativar oferta'}
                        >
                          <Power className="h-4 w-4" />
                        </button>

                        {/* Excluir */}
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p)}
                          className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                          title="Excluir produto (enviar para lixeira)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 4: AUDITORIA & LIXEIRA */}
          {/* ========================================================================= */}
          {activeTab === 'auditoria' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">Histórico de Alterações & Lixeira</h3>
                  <p className="text-[11px] text-slate-400">
                    Registro forense imutável de todas as ações executadas pelo Super Admin ou Lojista.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadOverview(store.slug)}
                  disabled={loadingOverview}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:text-white transition"
                  title="Atualizar logs"
                >
                  <RefreshCw className={cn('h-4 w-4', loadingOverview && 'animate-spin')} />
                </button>
              </div>

              {loadingOverview ? (
                <div className="py-12 text-center text-slate-400 text-xs">Carregando auditoria...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 text-slate-400 text-xs">
                  Nenhum registro de auditoria registrado ainda para esta loja.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {auditLogs.map((log) => {
                    const isDelete = log.action === 'PRODUTO_EXCLUIDO';
                    const isRestore = log.action === 'PRODUTO_RESTAURADO';
                    const isPassword = log.action === 'SENHA_REDEFINIDA';
                    const isUpdateStore = log.action === 'LOJA_ATUALIZADA';

                    return (
                      <div
                        key={log.id}
                        className={cn(
                          'rounded-2xl border p-3.5 space-y-2 transition',
                          isDelete
                            ? 'border-red-500/30 bg-red-950/10'
                            : isRestore
                            ? 'border-emerald-500/30 bg-emerald-950/10'
                            : 'border-slate-800 bg-slate-950/60'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider',
                                isDelete
                                  ? 'bg-red-500/20 text-red-400'
                                  : isRestore
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : isPassword
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : isUpdateStore
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : 'bg-blue-500/20 text-blue-400'
                              )}
                            >
                              {log.action}
                            </span>
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-300">
                              {log.actor_role === 'super_admin' ? '🛡️ Super Admin' : '👤 Lojista'}
                            </span>
                          </div>

                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>

                        <div>
                          <p className="font-bold text-white text-xs">
                            {log.entity_title || log.entity_id || 'Ação do Sistema'}
                          </p>
                          {log.actor_email && (
                            <p className="text-[10px] text-slate-400 font-mono">Autor: {log.actor_email}</p>
                          )}
                        </div>

                        {/* Botão de Restauração para Itens Excluídos */}
                        {isDelete && (
                          <div className="pt-1 flex items-center justify-between border-t border-slate-800/60 mt-2">
                            <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                              <Trash2 className="h-3 w-3" /> Item na Lixeira
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRestoreProduct(log.id)}
                              disabled={restoringLogId === log.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2.5 py-1 text-[11px] font-black transition disabled:opacity-50"
                            >
                              <RotateCcw className={cn('h-3.5 w-3.5', restoringLogId === log.id && 'animate-spin')} />
                              <span>Restaurar Produto</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* ZONA DE PERIGO: EXCLUIR LOJA PERMANENTEMENTE */}
          {/* ========================================================================= */}
          {store.slug !== 'clarice' && (
            <div className="rounded-2xl border border-red-500/30 bg-red-950/15 p-4 space-y-2 mt-8">
              <h4 className="font-black text-red-400 text-xs flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Zona de Perigo • Exclusão Permanente
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Esta ação remove permanentemente a loja, o catálogo de produtos em <code>produtos_clarice</code> e o usuário correspondente no Supabase Auth.
              </p>
              <button
                type="button"
                onClick={() => {
                  setConfirmationSlug('');
                  setDeleteModalOpen(true);
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition"
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir Loja Permanentemente
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação para Excluir Loja */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#0F172A] p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-white">Excluir Loja Permanentemente?</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Você está prestes a excluir <strong className="text-white">"{store.nomeLoja}"</strong> e todos os seus produtos.
                Esta ação não pode ser desfeita.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs space-y-1">
              <p className="text-[11px] text-slate-400">
                Digite o slug da loja <code className="text-[#FFE600] font-bold">"{store.slug}"</code> para confirmar:
              </p>
              <input
                type="text"
                value={confirmationSlug}
                onChange={(e) => setConfirmationSlug(e.target.value)}
                placeholder={store.slug}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white font-mono outline-none focus:ring-1 focus:ring-red-400"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingTenant || confirmationSlug.trim().toLowerCase() !== store.slug.toLowerCase()}
                onClick={handleDeleteTenant}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-500 py-2.5 text-xs font-black text-white transition disabled:opacity-40"
              >
                {deletingTenant ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
