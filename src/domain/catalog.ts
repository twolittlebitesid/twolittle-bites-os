/** Exact 33 canonical Sheet identifiers from Hotfix 19 / Schema.gs.
 * These names are a migration inventory, NOT an implemented SQL schema. */
export const canonicalSheets = [
  'CONFIG', 'USERS', 'BUSINESS_SETTINGS', 'CUSTOMERS', 'PRODUCTS',
  'PRODUCT_VARIANTS', 'INGREDIENTS', 'PACKAGING', 'UNIT_CONVERSIONS',
  'RECIPES', 'RECIPE_ITEMS', 'PREORDER_CAMPAIGNS', 'ORDERS', 'ORDER_ITEMS',
  'INVOICES', 'PAYMENTS', 'PRODUCTION_PLANS', 'PRODUCTION_PLAN_ITEMS',
  'PRODUCTION_REQUIREMENTS', 'PRODUCTION_BATCHES', 'INVENTORY',
  'INVENTORY_MOVEMENTS', 'SUPPLIERS', 'PURCHASES', 'PURCHASE_ITEMS',
  'EXPENSES', 'TRANSACTIONS', 'BUSINESS_TARGETS', 'MARKETING_CAMPAIGNS',
  'CONTENT', 'DAILY_METRICS', 'MONTHLY_METRICS', 'ACTIVITY_LOG'
] as const;

/** The 12 concrete Page*.html templates present in the Hotfix 19 archive. */
export const legacyPageTemplates = [
  'Business', 'Customers', 'Executive', 'Finance', 'Inventory', 'Marketing',
  'Orders', 'Production', 'Products', 'Purchasing', 'Reports', 'Settings'
] as const;

export type CanonicalSheet = typeof canonicalSheets[number];
