import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import type { SubscriptionPlan, SubscriptionStatus } from '@/types/tenant';
import type { AffiliateProduct } from '@/types/product';

const DEFAULT_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eHZwemVjaXd4Z3hobWNycHJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDk5NjY2MSwiZXhwIjoyMTEwNTcyNjYxfQ.62yQ_MWEcDL3kmU_sdC4hLQuUQYECZn63wnm3HjJ7uE';

export function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://tuxvpzeciwxgxhmcrprt.supabase.co';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    DEFAULT_SERVICE_ROLE_KEY;

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface AuditLogEntry {
  id: string;
  created_at: string;
  loja_slug: string;
  actor_role: string;
  actor_email: string | null;
  action: string;
  entity_id: string | null;
  entity_title: string | null;
  payload: Record<string, any>;
}

export interface AdminUpdateTenantDataInput {
  slug: string;
  updates: {
    nome_loja?: string;
    owner_email?: string;
    whatsapp_contato?: string;
    cpf_cnpj?: string;
    plano?: SubscriptionPlan;
    status_assinatura?: SubscriptionStatus;
    ml_affiliate_tag?: string;
    ml_matt_tool?: string;
    shopee_affiliate_id?: string;
    whatsapp_vip_url?: string;
    instagram_url?: string;
    subtitulo?: string;
    cor_primaria?: string;
    cor_destaque?: string;
    dominio_customizado?: string;
  };
  actorEmail?: string;
}

/**
 * 1. Atualiza qualquer dado cadastral / afiliado da loja com auditoria
 */
export const adminUpdateTenantDataServerFn = createServerFn({ method: 'POST' })
  .validator((d: AdminUpdateTenantDataInput) => d)
  .handler(async (ctx) => {
    const { slug, updates, actorEmail } = ctx.data;
    const supabaseAdmin = getSupabaseAdmin();

    try {
      // 1. Busca dados atuais para histórico
      const { data: currentStore, error: fetchErr } = await supabaseAdmin
        .from('lojas_afiliados')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (fetchErr || !currentStore) {
        return { success: false, error: 'Loja não encontrada no banco de dados.' };
      }

      // 2. Prepara o payload para o banco
      const dbPayload: any = {};
      if (updates.nome_loja !== undefined) dbPayload.nome_loja = updates.nome_loja.trim();
      if (updates.subtitulo !== undefined) dbPayload.subtitulo = updates.subtitulo.trim();
      if (updates.owner_email !== undefined) dbPayload.owner_email = updates.owner_email.trim().toLowerCase();
      if (updates.whatsapp_contato !== undefined) dbPayload.whatsapp_contato = updates.whatsapp_contato.trim();
      if (updates.cpf_cnpj !== undefined) dbPayload.cpf_cnpj = updates.cpf_cnpj.trim();
      if (updates.plano !== undefined) dbPayload.plano = updates.plano;
      if (updates.status_assinatura !== undefined) dbPayload.status_assinatura = updates.status_assinatura;
      if (updates.whatsapp_vip_url !== undefined) dbPayload.whatsapp_vip_url = updates.whatsapp_vip_url.trim();
      if (updates.instagram_url !== undefined) dbPayload.instagram_url = updates.instagram_url.trim();
      if (updates.cor_primaria !== undefined) dbPayload.cor_primaria = updates.cor_primaria;
      if (updates.cor_destaque !== undefined) dbPayload.cor_destaque = updates.cor_destaque;
      if (updates.dominio_customizado !== undefined) dbPayload.dominio_customizado = updates.dominio_customizado.trim().toLowerCase() || null;

      // Tratamento de tags de afiliado
      const effectiveMlTag =
        updates.ml_affiliate_tag !== undefined
          ? updates.ml_affiliate_tag.trim()
          : (currentStore.ml_affiliate_tag || currentStore.shopee_secret?.split('|')[0] || '');
      const effectiveMlTool =
        updates.ml_matt_tool !== undefined
          ? updates.ml_matt_tool.trim()
          : (currentStore.ml_matt_tool || currentStore.shopee_secret?.split('|')[1] || '');
      const effectiveShopeeId =
        updates.shopee_affiliate_id !== undefined
          ? updates.shopee_affiliate_id.trim()
          : (currentStore.shopee_affiliate_id || currentStore.shopee_app_id || '');

      // Campos compatíveis universais
      dbPayload.shopee_secret = effectiveMlTool
        ? `${effectiveMlTag}|${effectiveMlTool}`
        : effectiveMlTag || null;
      dbPayload.shopee_app_id = effectiveShopeeId || null;

      // Tenta atualizar colunas diretas caso existam na tabela
      if (updates.ml_affiliate_tag !== undefined) dbPayload.ml_affiliate_tag = effectiveMlTag || null;
      if (updates.ml_matt_tool !== undefined) dbPayload.ml_matt_tool = effectiveMlTool || null;
      if (updates.shopee_affiliate_id !== undefined) dbPayload.shopee_affiliate_id = effectiveShopeeId || null;

      let { data: updated, error: updateErr } = await supabaseAdmin
        .from('lojas_afiliados')
        .update(dbPayload)
        .eq('slug', slug)
        .select()
        .single();

      // Fallback se colunas diretas não existirem no schema cache
      if (updateErr && updateErr.message?.includes('schema cache')) {
        delete dbPayload.ml_affiliate_tag;
        delete dbPayload.ml_matt_tool;
        delete dbPayload.shopee_affiliate_id;

        const fb = await supabaseAdmin
          .from('lojas_afiliados')
          .update(dbPayload)
          .eq('slug', slug)
          .select()
          .single();

        updated = fb.data;
        updateErr = fb.error;
      }

      if (updateErr) {
        return { success: false, error: `Erro ao atualizar loja: ${updateErr.message}` };
      }

      // 3. Registra auditoria
      await supabaseAdmin.from('saas_audit_logs').insert({
        loja_slug: slug,
        actor_role: 'super_admin',
        actor_email: actorEmail || 'super_admin@clarice.com',
        action: 'LOJA_ATUALIZADA',
        entity_id: slug,
        entity_title: updates.nome_loja || currentStore.nome_loja,
        payload: {
          updates,
          previous: {
            nome_loja: currentStore.nome_loja,
            plano: currentStore.plano,
            status_assinatura: currentStore.status_assinatura,
            owner_email: currentStore.owner_email,
            shopee_secret: currentStore.shopee_secret,
            shopee_app_id: currentStore.shopee_app_id,
          },
        },
      });

      return { success: true, store: updated };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro inesperado ao atualizar loja.' };
    }
  });

/**
 * 2. Redefine a senha do lojista no Supabase Auth e lojas_afiliados com auditoria
 */
export const adminResetTenantPasswordServerFn = createServerFn({ method: 'POST' })
  .validator((d: { slug: string; ownerEmail: string; newPassword: string; actorEmail?: string }) => d)
  .handler(async (ctx) => {
    const { slug, ownerEmail, newPassword, actorEmail } = ctx.data;
    const supabaseAdmin = getSupabaseAdmin();
    const cleanEmail = ownerEmail.trim().toLowerCase();

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'A senha deve conter no mínimo 6 caracteres.' };
    }

    try {
      // 1. Procura usuário existente no Supabase Auth
      const { data: usersData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (listErr) {
        console.warn('[superAdminServerFn] Falha ao listar usuários no Auth:', listErr.message);
      }

      const existingUser = usersData?.users?.find(
        (u) => u.email?.trim().toLowerCase() === cleanEmail
      );

      if (existingUser) {
        const { error: updUserErr } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          { password: newPassword, email_confirm: true }
        );
        if (updUserErr) {
          return { success: false, error: `Erro no Supabase Auth: ${updUserErr.message}` };
        }
      } else {
        const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: newPassword,
          email_confirm: true,
        });
        if (createErr) {
          return { success: false, error: `Erro ao criar usuário no Auth: ${createErr.message}` };
        }
      }

      // 2. Sincroniza owner_password na tabela lojas_afiliados se a coluna existir
      try {
        await supabaseAdmin
          .from('lojas_afiliados')
          .update({ owner_password: newPassword, owner_email: cleanEmail })
          .eq('slug', slug);
      } catch {
        // Coluna opcional
      }

      // 3. Registra auditoria
      await supabaseAdmin.from('saas_audit_logs').insert({
        loja_slug: slug,
        actor_role: 'super_admin',
        actor_email: actorEmail || 'super_admin@clarice.com',
        action: 'SENHA_REDEFINIDA',
        entity_id: slug,
        entity_title: cleanEmail,
        payload: {
          ownerEmail: cleanEmail,
          resetAt: new Date().toISOString(),
        },
      });

      return { success: true, message: 'Senha redefinida com sucesso!' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha ao redefinir senha do lojista.' };
    }
  });

/**
 * 3. Exclui a loja permanentemente (produtos + lojas_afiliados + Auth) com auditoria
 */
export const adminDeleteTenantServerFn = createServerFn({ method: 'POST' })
  .validator((d: { slug: string; confirmationSlug: string; actorEmail?: string }) => d)
  .handler(async (ctx) => {
    const { slug, confirmationSlug, actorEmail } = ctx.data;
    const cleanSlug = slug.trim().toLowerCase();

    if (cleanSlug === 'clarice') {
      return { success: false, error: 'A loja matriz Clarice não pode ser excluída.' };
    }

    if (cleanSlug !== confirmationSlug.trim().toLowerCase()) {
      return { success: false, error: 'O slug digitado não corresponde à loja a ser excluída.' };
    }

    const supabaseAdmin = getSupabaseAdmin();

    try {
      // 1. Pega dados para auditoria
      const { data: store } = await supabaseAdmin
        .from('lojas_afiliados')
        .select('*')
        .eq('slug', cleanSlug)
        .maybeSingle();

      // 2. Exclui todos os produtos da loja
      const { error: prodDelErr } = await supabaseAdmin
        .from('produtos_clarice')
        .delete()
        .eq('loja_slug', cleanSlug);

      if (prodDelErr) {
        console.warn('[superAdminServerFn] Falha ao deletar produtos:', prodDelErr.message);
      }

      // 3. Exclui a loja de lojas_afiliados
      const { error: storeDelErr } = await supabaseAdmin
        .from('lojas_afiliados')
        .delete()
        .eq('slug', cleanSlug);

      if (storeDelErr) {
        return { success: false, error: `Erro ao excluir loja: ${storeDelErr.message}` };
      }

      // 4. Remove usuário no Supabase Auth se existir
      if (store?.owner_email) {
        try {
          const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
          const user = usersData?.users?.find(
            (u) => u.email?.trim().toLowerCase() === store.owner_email.trim().toLowerCase()
          );
          if (user) {
            await supabaseAdmin.auth.admin.deleteUser(user.id);
          }
        } catch (e) {
          console.warn('[superAdminServerFn] Falha ao remover usuário do Auth:', e);
        }
      }

      // 5. Registra auditoria
      await supabaseAdmin.from('saas_audit_logs').insert({
        loja_slug: cleanSlug,
        actor_role: 'super_admin',
        actor_email: actorEmail || 'super_admin@clarice.com',
        action: 'LOJA_EXCLUIDA',
        entity_id: cleanSlug,
        entity_title: store?.nome_loja || cleanSlug,
        payload: {
          deletedStore: store,
          deletedAt: new Date().toISOString(),
        },
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha ao excluir loja.' };
    }
  });

/**
 * 4. Retorna panorama completo da loja (dados, produtos e últimos 100 logs de auditoria)
 */
export const adminGetTenantOverviewServerFn = createServerFn({ method: 'POST' })
  .validator((d: { slug: string }) => d)
  .handler(async (ctx) => {
    const { slug } = ctx.data;
    const cleanSlug = slug.trim().toLowerCase();
    const supabaseAdmin = getSupabaseAdmin();

    try {
      const [storeRes, productsRes, logsRes] = await Promise.all([
        supabaseAdmin
          .from('lojas_afiliados')
          .select('*')
          .eq('slug', cleanSlug)
          .maybeSingle(),
        supabaseAdmin
          .from('produtos_clarice')
          .select('*')
          .eq('loja_slug', cleanSlug)
          .order('featured', { ascending: false })
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('saas_audit_logs')
          .select('*')
          .eq('loja_slug', cleanSlug)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      return {
        success: true,
        store: storeRes.data || null,
        products: productsRes.data || [],
        auditLogs: (logsRes.data as AuditLogEntry[]) || [],
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Falha ao buscar dados da loja.',
        store: null,
        products: [],
        auditLogs: [],
      };
    }
  });

/**
 * 5. Restaura produto excluído a partir do snapshot salvo em saas_audit_logs
 */
export const adminRestoreProductServerFn = createServerFn({ method: 'POST' })
  .validator((d: { logId: string; actorEmail?: string }) => d)
  .handler(async (ctx) => {
    const { logId, actorEmail } = ctx.data;
    const supabaseAdmin = getSupabaseAdmin();

    try {
      const { data: log, error: logErr } = await supabaseAdmin
        .from('saas_audit_logs')
        .select('*')
        .eq('id', logId)
        .single();

      if (logErr || !log || log.action !== 'PRODUTO_EXCLUIDO') {
        return { success: false, error: 'Registro de exclusão não encontrado.' };
      }

      const raw = log.payload?.product || log.payload;
      if (!raw || (!raw.title && !raw.titulo)) {
        return { success: false, error: 'Snapshot do produto indisponível no log.' };
      }

      const newId = crypto.randomUUID();
      const title = raw.title || raw.titulo;
      const currentPrice = Number(raw.currentPrice ?? raw.current_price ?? raw.preco_atual ?? 0);
      const originalPrice = Number(raw.originalPrice ?? raw.original_price ?? raw.preco_original ?? currentPrice);
      const discountPercent = Number(raw.discountPercent ?? raw.discount_percent ?? raw.desconto_percentual ?? 0);
      const installmentsText = raw.installmentsText ?? raw.installments_text ?? 'À vista';
      const affiliateUrl = raw.affiliateUrl ?? raw.affiliate_url ?? raw.link_afiliado;
      const imageUrl = raw.imageUrl ?? raw.image_url ?? raw.imagem_url;
      const category = raw.category || raw.categoria || 'Casa & Cozinha';
      const marketplace = raw.marketplace || 'mercadolivre';
      const lojaSlug = log.loja_slug;

      const restorePayload = {
        id: newId,
        mlb_id: raw.mlbId || raw.mlb_id || `MLB-${Date.now()}`,
        title,
        current_price: currentPrice,
        original_price: originalPrice,
        discount_percent: discountPercent,
        installments_text: installmentsText,
        affiliate_url: affiliateUrl,
        image_url: imageUrl,
        category,
        badge_text: raw.badgeText || raw.badge_text || 'Oferta Restaurada',
        free_shipping: Boolean(raw.freeShipping ?? raw.free_shipping),
        is_full: Boolean(raw.isFull ?? raw.is_full),
        rating: Number(raw.rating || 4.8),
        reviews_count: Number(raw.reviewsCount || raw.reviews_count || 10),
        featured: Boolean(raw.featured),
        active: true,
        status: 'ativo',
        marketplace,
        loja_slug: lojaSlug,
        created_at: new Date().toISOString(),
      };

      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('produtos_clarice')
        .insert(restorePayload)
        .select()
        .single();

      if (insErr) {
        return { success: false, error: `Erro ao reinserir produto: ${insErr.message}` };
      }

      // Registra restauração na auditoria
      await supabaseAdmin.from('saas_audit_logs').insert({
        loja_slug: lojaSlug,
        actor_role: 'super_admin',
        actor_email: actorEmail || 'super_admin@clarice.com',
        action: 'PRODUTO_RESTAURADO',
        entity_id: newId,
        entity_title: title,
        payload: {
          originalLogId: logId,
          restoredProduct: inserted,
          restoredAt: new Date().toISOString(),
        },
      });

      return { success: true, restoredProduct: inserted };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha ao restaurar produto.' };
    }
  });

/**
 * 6. Registra ação de auditoria de produtos (CRIADO, EDITADO, EXCLUÍDO) de forma segura
 */
export const recordProductAuditServerFn = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      lojaSlug: string;
      actorRole: 'super_admin' | 'lojista';
      actorEmail?: string;
      action: 'PRODUTO_CRIADO' | 'PRODUTO_EDITADO' | 'PRODUTO_EXCLUIDO' | 'PRODUTO_RESTAURADO';
      entityId?: string;
      entityTitle?: string;
      payload?: Record<string, any>;
    }) => d
  )
  .handler(async (ctx) => {
    const { lojaSlug, actorRole, actorEmail, action, entityId, entityTitle, payload } = ctx.data;
    const supabaseAdmin = getSupabaseAdmin();

    try {
      const { data, error } = await supabaseAdmin.from('saas_audit_logs').insert({
        loja_slug: lojaSlug || 'clarice',
        actor_role: actorRole || 'lojista',
        actor_email: actorEmail || null,
        action,
        entity_id: entityId || null,
        entity_title: entityTitle || null,
        payload: payload || {},
        created_at: new Date().toISOString(),
      }).select().single();

      return { success: !error, error: error?.message, id: data?.id };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  });
