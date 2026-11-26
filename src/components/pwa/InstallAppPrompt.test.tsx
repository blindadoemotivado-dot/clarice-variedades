import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { InstallAppPrompt, InstallHeaderButton } from './InstallAppPrompt';

describe('PWA Install Components', () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.__clarice_deferred_pwa_prompt;
    vi.restoreAllMocks();
  });

  describe('InstallHeaderButton', () => {
    it('renders install button when not in standalone mode', () => {
      render(<InstallHeaderButton />);
      expect(screen.getByRole('button', { name: /Instalar Aplicativo Oficial/i })).toBeInTheDocument();
      expect(screen.getByText(/Instalar App/i)).toBeInTheDocument();
    });

    it('dispatches clarice:open-install-prompt when clicked and no deferredPrompt exists', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      render(<InstallHeaderButton />);

      const btn = screen.getByRole('button', { name: /Instalar Aplicativo Oficial/i });
      fireEvent.click(btn);

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'clarice:open-install-prompt' })
      );
    });
  });

  describe('InstallAppPrompt', () => {
    it('opens and displays app branding when clarice:open-install-prompt is dispatched', () => {
      render(<InstallAppPrompt />);

      // Inicialmente não deve estar visível se não houver deferredPrompt nem iOS trigger
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Dispara o evento de abertura manual
      act(() => {
        window.dispatchEvent(new CustomEvent('clarice:open-install-prompt'));
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Clarice Achadinhos')).toBeInTheDocument();
      expect(screen.getByText(/App Oficial · Rápido e leve/i)).toBeInTheDocument();
    });

    it('dismisses prompt and records 7-day cooldown in localStorage on close', () => {
      render(<InstallAppPrompt />);

      act(() => {
        window.dispatchEvent(new CustomEvent('clarice:open-install-prompt'));
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const closeBtn = screen.getByRole('button', { name: /Fechar aviso de instalação/i });
      fireEvent.click(closeBtn);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      const saved = localStorage.getItem('clarice_pwa_dismissed_v2');
      expect(saved).toBeTruthy();
      expect(Number(saved)).toBeGreaterThan(0);
    });
  });
});
