/**
 * Dashboard Preferences Service
 * Manages user dashboard customization preferences
 * Sprint 26 - Dashboard Customization
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DashboardModule {
  id: string;
  name: string;
  nameRo: string;
  path: string;
  category: string;
  tier: 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
  icon: string;
}

export interface DashboardPreferencesDto {
  enabledModules: string[];
  moduleOrder: string[];
  collapsedSections: string[];
  sidebarCollapsed: boolean;
  compactMode: boolean;
  darkMode: boolean;
  dashboardWidgets: string[];
}

// All available dashboard modules
export const ALL_DASHBOARD_MODULES: DashboardModule[] = [
  // Main
  { id: 'dashboard', name: 'Dashboard Overview', nameRo: 'Panou Principal', path: '/dashboard', category: 'main', tier: 'FREE', icon: 'LayoutDashboard' },
  { id: 'analytics', name: 'Analytics', nameRo: 'Analytics', path: '/dashboard/analytics', category: 'main', tier: 'PRO', icon: 'BarChart3' },

  // Documents
  { id: 'documents', name: 'Documents', nameRo: 'Documente', path: '/dashboard/documents', category: 'documents', tier: 'FREE', icon: 'FolderOpen' },
  { id: 'ocr', name: 'OCR Documents', nameRo: 'OCR Documente', path: '/dashboard/ocr', category: 'documents', tier: 'FREE', icon: 'Scan' },
  { id: 'invoices', name: 'Invoices', nameRo: 'Facturi', path: '/dashboard/invoices', category: 'documents', tier: 'FREE', icon: 'Receipt' },
  { id: 'efactura', name: 'e-Factura', nameRo: 'e-Factura', path: '/dashboard/efactura', category: 'documents', tier: 'PRO', icon: 'FileText' },

  // Finance
  { id: 'finance', name: 'Finance', nameRo: 'Finanțe', path: '/dashboard/finance', category: 'finance', tier: 'FREE', icon: 'Wallet' },
  { id: 'accounting', name: 'Accounting', nameRo: 'Contabilitate', path: '/dashboard/accounting', category: 'finance', tier: 'PRO', icon: 'Calculator' },
  { id: 'payments', name: 'Payments', nameRo: 'Plăți', path: '/dashboard/payments', category: 'finance', tier: 'FREE', icon: 'CreditCard' },
  { id: 'vat', name: 'VAT Reports', nameRo: 'Rapoarte TVA', path: '/dashboard/vat', category: 'finance', tier: 'FREE', icon: 'Calculator' },
  { id: 'saft', name: 'SAF-T D406', nameRo: 'SAF-T D406', path: '/dashboard/saft', category: 'finance', tier: 'PRO', icon: 'FileSpreadsheet' },
  { id: 'reports', name: 'Reports', nameRo: 'Rapoarte', path: '/dashboard/reports', category: 'finance', tier: 'PRO', icon: 'PieChart' },

  // Commerce
  { id: 'ecommerce', name: 'E-Commerce', nameRo: 'E-Commerce', path: '/dashboard/ecommerce', category: 'commerce', tier: 'BUSINESS', icon: 'ShoppingCart' },
  { id: 'crm', name: 'CRM', nameRo: 'CRM', path: '/dashboard/crm', category: 'commerce', tier: 'PRO', icon: 'Target' },
  { id: 'partners', name: 'Partners', nameRo: 'Parteneri', path: '/dashboard/partners', category: 'commerce', tier: 'FREE', icon: 'Building' },

  // Supply Chain
  { id: 'warehouse', name: 'Warehouse', nameRo: 'Depozit', path: '/dashboard/warehouse', category: 'supply-chain', tier: 'PRO', icon: 'Package' },
  { id: 'logistics', name: 'Logistics', nameRo: 'Logistică', path: '/dashboard/logistics', category: 'supply-chain', tier: 'PRO', icon: 'Truck' },
  { id: 'fleet', name: 'Fleet', nameRo: 'Flotă', path: '/dashboard/fleet', category: 'supply-chain', tier: 'BUSINESS', icon: 'Truck' },

  // HR
  { id: 'hr', name: 'HR & Payroll', nameRo: 'HR & Salarizare', path: '/dashboard/hr', category: 'hr', tier: 'PRO', icon: 'Users' },
  { id: 'payroll', name: 'Payroll', nameRo: 'Salarizare', path: '/dashboard/payroll', category: 'hr', tier: 'PRO', icon: 'Wallet' },
  { id: 'contracts', name: 'Contracts', nameRo: 'Contracte', path: '/dashboard/contracts', category: 'hr', tier: 'PRO', icon: 'FileText' },
  { id: 'freelancer', name: 'Freelancer Hub', nameRo: 'Hub Freelanceri', path: '/dashboard/freelancer', category: 'hr', tier: 'FREE', icon: 'Briefcase' },

  // Projects
  { id: 'projects', name: 'Projects', nameRo: 'Proiecte', path: '/dashboard/projects', category: 'projects', tier: 'PRO', icon: 'Briefcase' },

  // Quality
  { id: 'audit', name: 'Audit Trail', nameRo: 'Jurnal Audit', path: '/dashboard/audit', category: 'quality', tier: 'PRO', icon: 'Shield' },

  // Community
  { id: 'forum', name: 'Forum', nameRo: 'Forum', path: '/dashboard/forum', category: 'community', tier: 'FREE', icon: 'MessageSquare' },
  { id: 'blog', name: 'Blog', nameRo: 'Blog', path: '/dashboard/blog', category: 'community', tier: 'FREE', icon: 'FileText' },

  // Developer
  { id: 'developer', name: 'API', nameRo: 'API', path: '/dashboard/developer', category: 'developer', tier: 'BUSINESS', icon: 'Code' },
  { id: 'integrations', name: 'Integrations', nameRo: 'Integrări', path: '/dashboard/integrations', category: 'developer', tier: 'PRO', icon: 'Cog' },
  { id: 'webhooks', name: 'Webhooks', nameRo: 'Webhooks', path: '/dashboard/webhooks', category: 'developer', tier: 'BUSINESS', icon: 'Code' },

  // Help
  { id: 'ai-assistant', name: 'AI Assistant', nameRo: 'Asistent AI', path: '/dashboard/ai-assistant', category: 'help', tier: 'FREE', icon: 'Rocket' },
  { id: 'help', name: 'Help', nameRo: 'Ajutor', path: '/dashboard/help', category: 'help', tier: 'FREE', icon: 'HelpCircle' },

  // Admin
  { id: 'settings', name: 'Settings', nameRo: 'Setări', path: '/dashboard/settings', category: 'admin', tier: 'FREE', icon: 'Settings' },
  { id: 'admin', name: 'Admin', nameRo: 'Administrare', path: '/dashboard/admin', category: 'admin', tier: 'ENTERPRISE', icon: 'Shield' },
  { id: 'monitoring', name: 'Monitoring', nameRo: 'Monitorizare', path: '/dashboard/monitoring', category: 'admin', tier: 'ENTERPRISE', icon: 'BarChart3' },

  // Simulation
  { id: 'simulation', name: 'Simulation', nameRo: 'Simulare', path: '/dashboard/simulation', category: 'simulation', tier: 'ENTERPRISE', icon: 'PlayCircle' },
];

// Default enabled modules per tier
export const DEFAULT_MODULES_BY_TIER: Record<string, string[]> = {
  FREE: ['dashboard', 'documents', 'ocr', 'invoices', 'finance', 'payments', 'vat', 'partners', 'freelancer', 'forum', 'blog', 'ai-assistant', 'help', 'settings'],
  PRO: ['dashboard', 'analytics', 'documents', 'ocr', 'invoices', 'efactura', 'finance', 'accounting', 'payments', 'vat', 'saft', 'reports', 'crm', 'partners', 'warehouse', 'logistics', 'hr', 'payroll', 'contracts', 'freelancer', 'projects', 'audit', 'forum', 'blog', 'integrations', 'ai-assistant', 'help', 'settings'],
  BUSINESS: ['dashboard', 'analytics', 'documents', 'ocr', 'invoices', 'efactura', 'finance', 'accounting', 'payments', 'vat', 'saft', 'reports', 'ecommerce', 'crm', 'partners', 'warehouse', 'logistics', 'fleet', 'hr', 'payroll', 'contracts', 'freelancer', 'projects', 'audit', 'forum', 'blog', 'developer', 'integrations', 'webhooks', 'ai-assistant', 'help', 'settings'],
  ENTERPRISE: ALL_DASHBOARD_MODULES.map(m => m.id), // All modules
};

@Injectable()
export class DashboardPreferencesService {
  private readonly logger = new Logger(DashboardPreferencesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get user's dashboard preferences
   */
  async getPreferences(userId: string): Promise<DashboardPreferencesDto> {
    const prefs = await this.prisma.dashboardPreferences.findUnique({
      where: { userId },
    });

    if (!prefs) {
      // Return default preferences
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { tier: true },
      });

      const tier = user?.tier || 'FREE';
      const defaultModules = DEFAULT_MODULES_BY_TIER[tier] || DEFAULT_MODULES_BY_TIER.FREE;

      return {
        enabledModules: defaultModules,
        moduleOrder: [],
        collapsedSections: [],
        sidebarCollapsed: false,
        compactMode: false,
        darkMode: false,
        dashboardWidgets: ['overview', 'cashFlow', 'vatChart', 'recentInvoices', 'alerts'],
      };
    }

    return {
      enabledModules: prefs.enabledModules as string[],
      moduleOrder: prefs.moduleOrder as string[],
      collapsedSections: prefs.collapsedSections as string[],
      sidebarCollapsed: prefs.sidebarCollapsed,
      compactMode: prefs.compactMode,
      darkMode: prefs.darkMode,
      dashboardWidgets: prefs.dashboardWidgets as string[],
    };
  }

  /**
   * Update user's dashboard preferences
   */
  async updatePreferences(
    userId: string,
    updates: Partial<DashboardPreferencesDto>,
  ): Promise<DashboardPreferencesDto> {
    // Get user tier to validate modules
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Filter enabled modules by tier
    if (updates.enabledModules) {
      const allowedModules = this.getModulesForTier(user.tier);
      updates.enabledModules = updates.enabledModules.filter(
        moduleId => allowedModules.some(m => m.id === moduleId)
      );
    }

    const prefs = await this.prisma.dashboardPreferences.upsert({
      where: { userId },
      create: {
        userId,
        enabledModules: updates.enabledModules || DEFAULT_MODULES_BY_TIER[user.tier] || DEFAULT_MODULES_BY_TIER.FREE,
        moduleOrder: updates.moduleOrder || [],
        collapsedSections: updates.collapsedSections || [],
        sidebarCollapsed: updates.sidebarCollapsed ?? false,
        compactMode: updates.compactMode ?? false,
        darkMode: updates.darkMode ?? false,
        dashboardWidgets: updates.dashboardWidgets || ['overview', 'cashFlow', 'vatChart', 'recentInvoices', 'alerts'],
      },
      update: {
        ...(updates.enabledModules && { enabledModules: updates.enabledModules }),
        ...(updates.moduleOrder && { moduleOrder: updates.moduleOrder }),
        ...(updates.collapsedSections && { collapsedSections: updates.collapsedSections }),
        ...(updates.sidebarCollapsed !== undefined && { sidebarCollapsed: updates.sidebarCollapsed }),
        ...(updates.compactMode !== undefined && { compactMode: updates.compactMode }),
        ...(updates.darkMode !== undefined && { darkMode: updates.darkMode }),
        ...(updates.dashboardWidgets && { dashboardWidgets: updates.dashboardWidgets }),
      },
    });

    this.logger.log(`Updated dashboard preferences for user ${userId}`);

    return {
      enabledModules: prefs.enabledModules as string[],
      moduleOrder: prefs.moduleOrder as string[],
      collapsedSections: prefs.collapsedSections as string[],
      sidebarCollapsed: prefs.sidebarCollapsed,
      compactMode: prefs.compactMode,
      darkMode: prefs.darkMode,
      dashboardWidgets: prefs.dashboardWidgets as string[],
    };
  }

  /**
   * Toggle a specific module
   */
  async toggleModule(userId: string, moduleId: string): Promise<DashboardPreferencesDto> {
    const prefs = await this.getPreferences(userId);
    const enabledModules = prefs.enabledModules;

    const index = enabledModules.indexOf(moduleId);
    if (index > -1) {
      enabledModules.splice(index, 1);
    } else {
      enabledModules.push(moduleId);
    }

    return this.updatePreferences(userId, { enabledModules });
  }

  /**
   * Reset preferences to defaults
   */
  async resetPreferences(userId: string): Promise<DashboardPreferencesDto> {
    await this.prisma.dashboardPreferences.deleteMany({
      where: { userId },
    });

    return this.getPreferences(userId);
  }

  /**
   * Get all modules available for a tier
   */
  getModulesForTier(tier: string): DashboardModule[] {
    const tierOrder = ['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE'];
    const tierIndex = tierOrder.indexOf(tier);

    return ALL_DASHBOARD_MODULES.filter(module => {
      const moduleTierIndex = tierOrder.indexOf(module.tier);
      return moduleTierIndex <= tierIndex;
    });
  }

  /**
   * Get all available modules with access info for user
   */
  async getAvailableModules(userId: string): Promise<{
    modules: DashboardModule[];
    enabledModules: string[];
    tier: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    const tier = user?.tier || 'FREE';
    const modules = this.getModulesForTier(tier);
    const prefs = await this.getPreferences(userId);

    return {
      modules,
      enabledModules: prefs.enabledModules,
      tier,
    };
  }
}
