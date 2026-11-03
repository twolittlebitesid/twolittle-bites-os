import { legacyPageTemplates } from './catalog';

export type UserRole = 'OWNER' | 'ADMIN' | 'PRODUCTION' | 'MARKETING' | 'FINANCE';

export type RouteId =
  | 'executive'
  | 'orders'
  | 'products'
  | 'production'
  | 'inventory'
  | 'finance'
  | 'business'
  | 'customers'
  | 'purchasing'
  | 'marketing'
  | 'reports'
  | 'settings';

export interface AppRouteDefinition {
  id: RouteId;
  templateName: (typeof legacyPageTemplates)[number];
  label: string;
  icon: string;
  primary: boolean;
  anyPermissions: readonly string[];
}

export const ROLE_PERMISSIONS: Readonly<Record<UserRole, readonly string[]>> = {
  OWNER: ['*'],
  ADMIN: [
    'EXECUTIVE_READ', 'BUSINESS_READ', 'BUSINESS_UPDATE',
    'ORDER_READ', 'ORDER_WRITE', 'PREORDER_READ', 'PREORDER_WRITE',
    'CUSTOMER_READ', 'CUSTOMER_WRITE', 'PRODUCT_READ', 'PRODUCT_WRITE',
    'RECIPE_READ', 'RECIPE_WRITE', 'PRODUCTION_READ', 'PRODUCTION_WRITE',
    'INVENTORY_READ', 'INVENTORY_ADJUST', 'PURCHASE_READ', 'PURCHASE_WRITE',
    'INVOICE_READ', 'INVOICE_WRITE', 'PAYMENT_CREATE', 'EXPENSE_CREATE',
    'MARKETING_READ', 'MARKETING_WRITE', 'REPORT_MARKETING_READ',
    'REPORT_READ', 'SETTINGS_READ', 'SETTINGS_WRITE'
  ],
  PRODUCTION: [
    'BUSINESS_READ',
    'PRODUCT_READ', 'RECIPE_READ', 'RECIPE_WRITE',
    'ORDER_READ', 'PRODUCTION_READ', 'PRODUCTION_WRITE',
    'INVENTORY_READ', 'INVENTORY_ADJUST', 'PURCHASE_READ',
    'REPORT_OPERATIONAL_READ'
  ],
  MARKETING: [
    'BUSINESS_READ', 'CUSTOMER_READ_LIMITED', 'ORDER_READ',
    'MARKETING_READ', 'MARKETING_WRITE', 'EXPENSE_CREATE_MARKETING',
    'REPORT_MARKETING_READ'
  ],
  FINANCE: [
    'EXECUTIVE_READ', 'BUSINESS_READ', 'ORDER_READ', 'CUSTOMER_READ',
    'INVOICE_READ', 'INVOICE_WRITE', 'PAYMENT_READ', 'PAYMENT_WRITE',
    'TRANSACTION_READ', 'TRANSACTION_WRITE', 'EXPENSE_READ', 'EXPENSE_WRITE',
    'PURCHASE_READ', 'REPORT_READ', 'PNL_READ', 'SETTINGS_READ'
  ]
};

export const APP_ROUTES: readonly AppRouteDefinition[] = [
  { id: 'executive', templateName: 'Executive', label: 'Executive', icon: 'space_dashboard', primary: true, anyPermissions: ['EXECUTIVE_READ'] },
  { id: 'orders', templateName: 'Orders', label: 'Orders', icon: 'receipt_long', primary: true, anyPermissions: ['ORDER_READ'] },
  { id: 'products', templateName: 'Products', label: 'Products', icon: 'bakery_dining', primary: true, anyPermissions: ['PRODUCT_READ'] },
  { id: 'production', templateName: 'Production', label: 'Production', icon: 'oven_gen', primary: true, anyPermissions: ['PRODUCTION_READ'] },
  { id: 'inventory', templateName: 'Inventory', label: 'Inventory', icon: 'inventory_2', primary: true, anyPermissions: ['INVENTORY_READ'] },
  { id: 'finance', templateName: 'Finance', label: 'Finance', icon: 'payments', primary: true, anyPermissions: ['TRANSACTION_READ', 'PNL_READ', 'INVOICE_READ'] },
  { id: 'business', templateName: 'Business', label: 'Business', icon: 'monitoring', primary: false, anyPermissions: ['BUSINESS_READ'] },
  { id: 'customers', templateName: 'Customers', label: 'Customers', icon: 'group', primary: false, anyPermissions: ['CUSTOMER_READ', 'CUSTOMER_READ_LIMITED'] },
  { id: 'purchasing', templateName: 'Purchasing', label: 'Purchasing', icon: 'shopping_cart', primary: false, anyPermissions: ['PURCHASE_READ'] },
  { id: 'marketing', templateName: 'Marketing', label: 'Marketing', icon: 'campaign', primary: false, anyPermissions: ['MARKETING_READ'] },
  { id: 'reports', templateName: 'Reports', label: 'Reports', icon: 'analytics', primary: false, anyPermissions: ['REPORT_READ', 'REPORT_OPERATIONAL_READ', 'REPORT_MARKETING_READ'] },
  { id: 'settings', templateName: 'Settings', label: 'Settings', icon: 'settings', primary: false, anyPermissions: ['SETTINGS_READ'] }
];

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  return perms.includes('*') || perms.includes(permission);
}

export function isRouteVisibleToRole(route: AppRouteDefinition, role: UserRole): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  if (perms.includes('*')) return true;
  return route.anyPermissions.some(p => perms.includes(p));
}

export function getVisibleRoutes(role: UserRole): AppRouteDefinition[] {
  return APP_ROUTES.filter(route => isRouteVisibleToRole(route, role));
}

export function getDefaultRoute(role: UserRole): RouteId {
  const visible = getVisibleRoutes(role);
  const exec = visible.find(r => r.id === 'executive');
  return exec ? 'executive' : (visible[0]?.id ?? 'orders');
}
