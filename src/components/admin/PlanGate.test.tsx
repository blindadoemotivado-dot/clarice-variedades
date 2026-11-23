import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlanGate } from './PlanGate';

describe('PlanGate', () => {
  it('renders children when allowed is true', () => {
    render(
      <PlanGate allowed={true} requiredPlan="Pro" featureName="Importação em Lote">
        <div data-testid="unlocked-content">Conteúdo Liberado</div>
      </PlanGate>
    );

    expect(screen.getByTestId('unlocked-content')).toBeInTheDocument();
    expect(screen.queryByText(/Recurso Exclusivo/i)).not.toBeInTheDocument();
  });

  it('renders locked card when allowed is false in card variant', () => {
    const handleUpgrade = vi.fn();
    render(
      <PlanGate
        allowed={false}
        requiredPlan="Pro"
        featureName="Importação de Produtos em Lote"
        onUpgrade={handleUpgrade}
      >
        <div data-testid="unlocked-content">Conteúdo Liberado</div>
      </PlanGate>
    );

    expect(screen.queryByTestId('unlocked-content')).not.toBeInTheDocument();
    expect(screen.getByText('Importação de Produtos em Lote')).toBeInTheDocument();
    expect(screen.getByText(/Recurso Exclusivo • Plano Pro/i)).toBeInTheDocument();

    const upgradeBtn = screen.getByRole('button', { name: /Fazer Upgrade para o Plano Pro/i });
    expect(upgradeBtn).toBeInTheDocument();
    fireEvent.click(upgradeBtn);
    expect(handleUpgrade).toHaveBeenCalledTimes(1);
  });

  it('renders inline variant when variant="inline"', () => {
    const handleUpgrade = vi.fn();
    render(
      <PlanGate
        allowed={false}
        requiredPlan="Advanced"
        featureName="Assinatura Customizada"
        variant="inline"
        onUpgrade={handleUpgrade}
      >
        <div data-testid="unlocked-content">Conteúdo Liberado</div>
      </PlanGate>
    );

    expect(screen.queryByTestId('unlocked-content')).not.toBeInTheDocument();
    expect(screen.getByText(/Assinatura Customizada/i)).toBeInTheDocument();
    expect(screen.getByText(/Plano Advanced/i)).toBeInTheDocument();

    const upgradeBtn = screen.getByRole('button', { name: /Fazer Upgrade/i });
    fireEvent.click(upgradeBtn);
    expect(handleUpgrade).toHaveBeenCalledTimes(1);
  });
});
