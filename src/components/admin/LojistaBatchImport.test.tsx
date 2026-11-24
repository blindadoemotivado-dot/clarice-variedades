import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LojistaBatchImport } from './LojistaBatchImport';
import type { PlanPermissions } from '@/config/planPermissions';
import type { LojaAfiliado } from '@/types/tenant';

const mockStartPermissions: PlanPermissions = {
  maxProducts: 50,
  batchImportLimit: 0,
  customBranding: true,
  vipDispatcherMode: 'basic',
  customDomain: false,
};

const mockProPermissions: PlanPermissions = {
  maxProducts: Infinity,
  batchImportLimit: 20,
  customBranding: true,
  vipDispatcherMode: 'full',
  customDomain: false,
};

const mockStartStore: LojaAfiliado = {
  id: 'store-start',
  slug: 'loja-iniciante',
  nomeLoja: 'Loja Iniciante',
  plano: 'start',
  statusAssinatura: 'ativo',
  corPrimaria: '#0F172A',
  corDestaque: '#FFE600',
};

const mockProStore: LojaAfiliado = {
  id: 'store-pro',
  slug: 'loja-pro',
  nomeLoja: 'Loja Pro',
  plano: 'pro',
  statusAssinatura: 'ativo',
  corPrimaria: '#0F172A',
  corDestaque: '#FFE600',
};

describe('LojistaBatchImport', () => {
  it('blocks batch import when user is lojista on Start plan without bypass', () => {
    const handleUpgrade = vi.fn();
    render(
      <LojistaBatchImport
        lojaSlug="loja-iniciante"
        store={mockStartStore}
        currentProductCount={10}
        permissions={mockStartPermissions}
        onUpgrade={handleUpgrade}
      />
    );

    expect(screen.getByText(/Recurso Exclusivo • Plano Pro/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Fazer Upgrade para o Plano Pro/i })
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/produto\.mercadolivre\.com\.br/i)).not.toBeInTheDocument();
  });

  it('unconditionally unlocks batch import when isSuperAdmin is true', () => {
    render(
      <LojistaBatchImport
        lojaSlug="loja-iniciante"
        store={mockStartStore}
        currentProductCount={10}
        permissions={mockStartPermissions}
        isSuperAdmin={true}
      />
    );

    expect(screen.queryByText(/Recurso Exclusivo • Plano Pro/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/produto\.mercadolivre\.com\.br/i)).toBeInTheDocument();
    expect(screen.getByText(/Importação em Lote/i)).toBeInTheDocument();
  });

  it('unconditionally unlocks batch import when store slug is clarice', () => {
    render(
      <LojistaBatchImport
        lojaSlug="clarice"
        store={{ ...mockStartStore, slug: 'clarice' }}
        currentProductCount={10}
        permissions={mockStartPermissions}
      />
    );

    expect(screen.queryByText(/Recurso Exclusivo • Plano Pro/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/produto\.mercadolivre\.com\.br/i)).toBeInTheDocument();
  });

  it('unlocks batch import when store plan is pro', () => {
    render(
      <LojistaBatchImport
        lojaSlug="loja-pro"
        store={mockProStore}
        currentProductCount={10}
        permissions={mockProPermissions}
      />
    );

    expect(screen.queryByText(/Recurso Exclusivo • Plano Pro/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/produto\.mercadolivre\.com\.br/i)).toBeInTheDocument();
  });
});
