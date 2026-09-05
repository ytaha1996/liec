import { describe, it, expect } from 'vitest';
import {
  canSee, canManageShipments, canOverridePricing, canUploadPhotos,
  canTransitionPackage, canManageUsers, canExport,
  canPostInvoice, canRecordPayment, canManageChartOfAccounts, canClosePeriod,
  type UserRole,
} from '../rbac';

const ROLES: UserRole[] = ['Admin', 'Manager', 'Accountant', 'Field'];

describe('role permissions', () => {
  it('keeps customer records away from warehouse staff', () => {
    expect(canSee('Field', 'customers')).toBe(false);
    for (const role of ['Admin', 'Manager', 'Accountant'] as UserRole[]) {
      expect(canSee(role, 'customers')).toBe(true);
    }
  });

  it('keeps company-wide billing figures away from warehouse staff', () => {
    expect(canSee('Field', 'reports')).toBe(false);
    expect(canSee('Accountant', 'reports')).toBe(true);
  });

  it('lets only admins and managers move cargo between stages', () => {
    expect(canTransitionPackage('Admin', 'ship')).toBe(true);
    expect(canTransitionPackage('Manager', 'ship')).toBe(true);
    expect(canTransitionPackage('Accountant', 'ship')).toBe(false);
    expect(canTransitionPackage('Field', 'ship')).toBe(false);
  });

  it('lets the accountant touch money but not cargo', () => {
    expect(canOverridePricing('Accountant')).toBe(true);
    expect(canExport('Accountant')).toBe(true);
    expect(canManageShipments('Accountant')).toBe(false);
  });

  it('lets warehouse staff upload photos', () => {
    expect(canUploadPhotos('Field')).toBe(true);
    expect(canUploadPhotos('Accountant')).toBe(false);
  });

  it('restricts user administration', () => {
    expect(canManageUsers('Admin')).toBe(true);
    for (const role of ['Manager', 'Accountant', 'Field'] as UserRole[]) {
      expect(canManageUsers(role)).toBe(false);
    }
  });

  it('gives every role the dashboard', () => {
    for (const role of ROLES) expect(canSee(role, 'dashboard')).toBe(true);
  });
});

describe('accounting permissions', () => {
  it('keeps the books away from warehouse staff entirely', () => {
    for (const module of ['invoices', 'receivables', 'accounts']) {
      expect(canSee('Field', module)).toBe(false);
    }
  });

  it('lets the accountant post invoices and take payments', () => {
    // ACC-04/18: this is the accountant's core job.
    expect(canPostInvoice('Accountant')).toBe(true);
    expect(canRecordPayment('Accountant')).toBe(true);
  });

  it('never lets a field operator post or take money', () => {
    expect(canPostInvoice('Field')).toBe(false);
    expect(canRecordPayment('Field')).toBe(false);
  });

  it('keeps the chart and period locks with admins and managers', () => {
    // Trap 1 and ACC-13: re-pointing an account or reopening a closed month
    // changes what every future posting does.
    expect(canManageChartOfAccounts('Accountant')).toBe(false);
    expect(canClosePeriod('Accountant')).toBe(false);
    for (const role of ['Admin', 'Manager'] as UserRole[]) {
      expect(canManageChartOfAccounts(role)).toBe(true);
      expect(canClosePeriod(role)).toBe(true);
    }
  });
});
