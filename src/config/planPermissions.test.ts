import { describe, it, expect } from 'vitest';
import {
  PLAN_PERMISSIONS,
  getPlanPermissions,
  PLAN_CARDS,
} from './planPermissions';

describe('planPermissions', () => {
  it('deve conter as regras corretas para o plano start', () => {
    const perm = PLAN_PERMISSIONS.start;
    expect(perm.maxProducts).toBe(50);
    expect(perm.batchImportLimit).toBe(0);
    expect(perm.customBranding).toBe(true);
    expect(perm.vipDispatcherMode).toBe('basic');
    expect(perm.customDomain).toBe(false);
  });

  it('deve conter as regras corretas para o plano pro', () => {
    const perm = PLAN_PERMISSIONS.pro;
    expect(perm.maxProducts).toBe(Infinity);
    expect(perm.batchImportLimit).toBe(20);
    expect(perm.customBranding).toBe(true);
    expect(perm.vipDispatcherMode).toBe('full');
    expect(perm.customDomain).toBe(false);
  });

  it('deve conter as regras corretas para o plano advanced', () => {
    const perm = PLAN_PERMISSIONS.advanced;
    expect(perm.maxProducts).toBe(Infinity);
    expect(perm.batchImportLimit).toBe(50);
    expect(perm.customBranding).toBe(true);
    expect(perm.vipDispatcherMode).toBe('advanced');
    expect(perm.customDomain).toBe(true);
  });

  it('getPlanPermissions deve retornar o plano start como fallback quando inválido ou nulo', () => {
    expect(getPlanPermissions(null)).toEqual(PLAN_PERMISSIONS.start);
    expect(getPlanPermissions(undefined)).toEqual(PLAN_PERMISSIONS.start);
    expect(getPlanPermissions('invalido' as any)).toEqual(PLAN_PERMISSIONS.start);
  });

  it('getPlanPermissions deve retornar permissões corretas para planos válidos', () => {
    expect(getPlanPermissions('start')).toEqual(PLAN_PERMISSIONS.start);
    expect(getPlanPermissions('pro')).toEqual(PLAN_PERMISSIONS.pro);
    expect(getPlanPermissions('advanced')).toEqual(PLAN_PERMISSIONS.advanced);
  });

  it('PLAN_CARDS deve conter exatamente os 3 planos alinhados', () => {
    expect(PLAN_CARDS).toHaveLength(3);
    const ids = PLAN_CARDS.map((c) => c.id);
    expect(ids).toEqual(['start', 'pro', 'advanced']);
    expect(PLAN_CARDS.find((c) => c.id === 'start')?.value).toBe(67);
    expect(PLAN_CARDS.find((c) => c.id === 'pro')?.value).toBe(117);
    expect(PLAN_CARDS.find((c) => c.id === 'advanced')?.value).toBe(197);
  });
});
