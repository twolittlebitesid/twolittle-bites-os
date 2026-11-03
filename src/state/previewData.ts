import type { OrderStatus } from '../domain/orderTransitions';
import type { InvoiceStatus, PaymentEventStatus, ScalingMode } from '../domain/calculators';
import type { UserRole } from '../domain/navigation';

export interface CustomerRecord {
  customerId: string;
  name: string;
  whatsapp: string;
  segment: 'VIP' | 'HIGH_VALUE' | 'REPEAT' | 'NEW' | 'DORMANT';
  completedOrders: number;
  historicalValue: number;
  aov: number;
  rfmScore: string;
  lastOrderDate: string;
  daysSinceOrder: number;
  favoriteProduct: string;
  topChannel: string;
  notes?: string;
}

export interface ProductVariantRecord {
  variantId: string;
  productId: string;
  name: string;
  sku: string;
  sellingPrice: number;
  unitCogs: number;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface ProductRecord {
  productId: string;
  name: string;
  sku: string;
  category: string;
  sellingPrice: number;
  unitCogs: number;
  status: 'ACTIVE' | 'ARCHIVED';
  activeRecipeId: string;
  variants: ProductVariantRecord[];
}

export interface MaterialRecord {
  itemId: string;
  itemType: 'INGREDIENT' | 'PACKAGING';
  name: string;
  purchaseUnit: string;
  baseUnit: 'g' | 'ml' | 'pcs';
  conversionFactor: number;
  purchasePrice: number;
  avgCostBase: number;
  currentStockBase: number;
  minStockBase: number;
  defaultSupplierId: string;
}

export interface RecipeItemRecord {
  recipeItemId: string;
  itemId: string;
  itemType: 'INGREDIENT' | 'PACKAGING';
  materialName: string;
  quantityBase: number;
  baseUnit: 'g' | 'ml' | 'pcs';
  wasteAllowancePct: number;
  unitCostBase: number;
}

export interface RecipeRecord {
  recipeId: string;
  productId: string;
  productName: string;
  version: number;
  baseYield: number;
  yieldUnit: string;
  defaultScalingMode: ScalingMode;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  notes: string;
  items: RecipeItemRecord[];
}

export interface PreorderCampaignRecord {
  campaignId: string;
  name: string;
  cutoffAt: string;
  productionDate: string;
  fulfillmentDate: string;
  capacityUnit: 'ORDERS' | 'ITEMS';
  maxCapacity: number;
  currentBooked: number;
  status: 'OPEN' | 'ALMOST_FULL' | 'FULL' | 'CLOSED' | 'COMPLETED';
}

export interface OrderItemLine {
  orderItemId: string;
  productId: string;
  variantId: string | null;
  productTitle: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCogsSnapshot: number;
  lineTotal: number;
  productionNotes: string;
}

export interface OrderRecord {
  orderId: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  customerWhatsapp: string;
  sourceChannel: string;
  preorderCampaignId: string | null;
  fulfillmentType: string;
  fulfillmentDate: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paymentStatus: InvoiceStatus | 'UNPAID';
  status: OrderStatus;
  invoiceId: string;
  attributedCampaignId: string | null;
  attributedContentId: string | null;
  notes: string;
  items: OrderItemLine[];
}

export interface InvoiceRecord {
  invoiceId: string;
  invoiceNumber: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerWhatsapp: string;
  issuedAt: string;
  dueAt: string;
  grandTotal: number;
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
  publicToken: string;
  lastPaymentMethod: string;
}

export interface PaymentRecord {
  paymentId: string;
  invoiceId: string;
  orderId: string;
  paymentAt: string;
  amount: number;
  paymentMethod: string;
  referenceNo: string;
  status: PaymentEventStatus;
  proofFileName: string | null;
  proofMime: string | null;
  notes: string;
}

export interface ProductionRequirementRecord {
  requirementId: string;
  itemId: string;
  materialName: string;
  itemType: 'INGREDIENT' | 'PACKAGING';
  baseUnit: 'g' | 'ml' | 'pcs';
  requiredQtyBase: number;
  availableQtyBase: number;
  shortageQtyBase: number;
  status: 'SUFFICIENT' | 'LOW' | 'SHORTAGE';
}

export interface ProductionPlanItemRecord {
  planItemId: string;
  productId: string;
  productName: string;
  recipeId: string;
  recipeVersion: number;
  scalingMode: ScalingMode;
  targetQty: number;
  expectedOutput: number;
  multiplier: number;
}

export interface ProductionPlanRecord {
  planId: string;
  fulfillmentDate: string;
  productionDate: string;
  orderIds: string[];
  status: 'DRAFT' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
  usagePosted: boolean;
  notes: string;
  targets: ProductionPlanItemRecord[];
  requirements: ProductionRequirementRecord[];
}

export interface InventoryMovementRecord {
  movementId: string;
  movementAt: string;
  itemId: string;
  materialName: string;
  itemType: 'INGREDIENT' | 'PACKAGING';
  movementType: 'OPENING' | 'PURCHASE_RECEIPT' | 'PRODUCTION_USAGE' | 'ADJUSTMENT' | 'WASTE';
  qtyInBase: number;
  qtyOutBase: number;
  balanceAfterBase: number;
  baseUnit: 'g' | 'ml' | 'pcs';
  referenceId: string;
  notes: string;
}

export interface SupplierRecord {
  supplierId: string;
  name: string;
  contactName: string;
  whatsapp: string;
  leadTimeDays: number;
  minimumOrderIdr: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface PurchaseItemRecord {
  purchaseItemId: string;
  itemId: string;
  materialName: string;
  itemType: 'INGREDIENT' | 'PACKAGING';
  orderedQtyBase: number;
  receivedQtyBase: number;
  baseUnit: 'g' | 'ml' | 'pcs';
  unitCostIdr: number;
  lineTotalIdr: number;
}

export interface PurchaseRecord {
  purchaseId: string;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  totalIdr: number;
  receivingStatus: 'UNRECEIVED' | 'PARTIAL' | 'RECEIVED';
  status: 'DRAFT' | 'ORDERED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
  items: PurchaseItemRecord[];
}

export interface ExpenseRecord {
  expenseId: string;
  expenseDate: string;
  category: string;
  vendor: string;
  paymentMethod: string;
  amount: number;
  status: 'POSTED' | 'VOIDED';
  marketingCampaignId: string | null;
  notes: string;
}

export interface TransactionRecord {
  transactionId: string;
  transactionDate: string;
  type: 'PAYMENT_IN' | 'REFUND_OUT' | 'EXPENSE_OUT' | 'COGS_NON_CASH';
  referenceId: string;
  paymentMethod: string;
  amountIn: number;
  amountOut: number;
}

export interface BusinessTargetRecord {
  targetId: string;
  metricKey: 'OPERATING_REVENUE' | 'COMPLETED_ORDERS' | 'NET_CASH' | 'REPEAT_RATE';
  metricLabel: string;
  periodStart: string;
  periodEnd: string;
  targetValue: number;
  actualValue: number;
  unit: 'IDR' | 'COUNT' | 'PCT';
  status: 'ON_TRACK' | 'AT_RISK' | 'ACHIEVED';
}

export interface MarketingCampaignRecord {
  campaignId: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  budget: number;
  spend: number;
  orders: number;
  revenue: number;
  newCustomers: number;
  status: 'ACTIVE' | 'COMPLETED' | 'PLANNED';
}

export interface MarketingContentRecord {
  contentId: string;
  campaignId: string;
  campaignName: string;
  title: string;
  platform: 'INSTAGRAM' | 'TIKTOK' | 'WHATSAPP';
  reach: number;
  views: number;
  engagement: number;
  clicks: number;
  orders: number;
  revenue: number;
}

export interface DailyMetricRow {
  date: string;
  orders: number;
  completed: number;
  revenue: number;
  expenses: number;
  cashNet: number;
  mktSpend: number;
  attributedRev: number;
  attributedOrders: number;
  newCustomers: number;
  plans: number;
  completedPlans: number;
  shortages: number;
  waste: number;
}

export interface AppSettingsState {
  businessName: string;
  brandLogoUrl: string;
  whatsappCountryCode: string;
  timezone: string;
  currency: string;
  salesChannels: string[];
  fulfillmentTypes: string[];
  paymentMethods: string[];
  expenseCategories: string[];
  invoicePrefix: string;
  invoiceDueHours: number;
  invoicePublicTitle: string;
  invoicePublicNote: string;
  invoiceWhatsappTemplate: string;
  receiptPaperSize: '58' | '80';
  receiptCopies: number;
  receiptAutoPrintAfterPayment: boolean;
  receiptShowLogo: boolean;
  receiptShowCustomer: boolean;
  receiptShowPaymentMethod: boolean;
  kitchenTicketEnabled: boolean;
  autoInvoiceOnOrder: boolean;
  autoConfirmOnPaid: boolean;
  negativeStockAllowed: boolean;
  allowAdminPreorderOverride: boolean;
  preorderAlmostFullRatio: number;
  crmDormantDays: number;
  reportCacheLookbackDays: number;
}

export interface StaffUserRecord {
  userId: string;
  displayName: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  lastLogin: string;
}

export interface AppPreviewState {
  role: UserRole;
  periodStart: string;
  periodEnd: string;
  customers: CustomerRecord[];
  products: ProductRecord[];
  materials: MaterialRecord[];
  recipes: RecipeRecord[];
  preorderCampaigns: PreorderCampaignRecord[];
  orders: OrderRecord[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  productionPlans: ProductionPlanRecord[];
  inventoryMovements: InventoryMovementRecord[];
  suppliers: SupplierRecord[];
  purchases: PurchaseRecord[];
  expenses: ExpenseRecord[];
  transactions: TransactionRecord[];
  targets: BusinessTargetRecord[];
  marketingCampaigns: MarketingCampaignRecord[];
  marketingContents: MarketingContentRecord[];
  dailyMetrics: DailyMetricRow[];
  settings: AppSettingsState;
  users: StaffUserRecord[];
}

export function createInitialPreviewState(): AppPreviewState {
  return {
    role: 'OWNER',
    periodStart: '2026-10-01',
    periodEnd: '2026-11-04',
    customers: [
      {
        customerId: 'CUS-000001',
        name: 'Nadia Pramesti',
        whatsapp: '081288901122',
        segment: 'VIP',
        completedOrders: 6,
        historicalValue: 1890000,
        aov: 315000,
        rfmScore: '5-5-5',
        lastOrderDate: '2026-11-03',
        daysSinceOrder: 1,
        favoriteProduct: 'Classic Mascarpone Tiramisu',
        topChannel: 'WHATSAPP',
        notes: 'Suka taburan cocoa ekstra terpisah.'
      },
      {
        customerId: 'CUS-000002',
        name: 'Raka Mahendra',
        whatsapp: '081377654321',
        segment: 'HIGH_VALUE',
        completedOrders: 4,
        historicalValue: 1120000,
        aov: 280000,
        rfmScore: '4-4-5',
        lastOrderDate: '2026-11-01',
        daysSinceOrder: 3,
        favoriteProduct: 'Uji Matcha Tiramisu Box',
        topChannel: 'INSTAGRAM'
      },
      {
        customerId: 'CUS-000003',
        name: 'Sinta Larasati',
        whatsapp: '08119002233',
        segment: 'REPEAT',
        completedOrders: 3,
        historicalValue: 645000,
        aov: 215000,
        rfmScore: '4-3-3',
        lastOrderDate: '2026-10-28',
        daysSinceOrder: 7,
        favoriteProduct: 'Burnt Basque Cheesecake',
        topChannel: 'WHATSAPP'
      },
      {
        customerId: 'CUS-000004',
        name: 'Dimas Pratama',
        whatsapp: '085711223344',
        segment: 'DORMANT',
        completedOrders: 2,
        historicalValue: 490000,
        aov: 245000,
        rfmScore: '1-2-3',
        lastOrderDate: '2026-08-18',
        daysSinceOrder: 78,
        favoriteProduct: 'Classic Mascarpone Tiramisu',
        topChannel: 'WEBSITE'
      },
      {
        customerId: 'CUS-000005',
        name: 'Alya Putri',
        whatsapp: '081299887766',
        segment: 'NEW',
        completedOrders: 1,
        historicalValue: 205000,
        aov: 205000,
        rfmScore: '5-1-2',
        lastOrderDate: '2026-11-04',
        daysSinceOrder: 0,
        favoriteProduct: 'Belgian Fudgy Brownie Bite',
        topChannel: 'INSTAGRAM'
      }
    ],
    products: [
      {
        productId: 'PRD-000001',
        name: 'Classic Mascarpone Tiramisu',
        sku: 'TLB-TIR-CLS',
        category: 'Tiramisu Series',
        sellingPrice: 125000,
        unitCogs: 48500,
        status: 'ACTIVE',
        activeRecipeId: 'RCP-000001',
        variants: [
          {
            variantId: 'VAR-000001',
            productId: 'PRD-000001',
            name: 'Personal Tin (250g)',
            sku: 'TLB-TIR-CLS-250',
            sellingPrice: 125000,
            unitCogs: 48500,
            status: 'ACTIVE'
          },
          {
            variantId: 'VAR-000002',
            productId: 'PRD-000001',
            name: 'Party Tray (800g)',
            sku: 'TLB-TIR-CLS-800',
            sellingPrice: 345000,
            unitCogs: 132000,
            status: 'ACTIVE'
          }
        ]
      },
      {
        productId: 'PRD-000002',
        name: 'Uji Matcha Tiramisu Box',
        sku: 'TLB-TIR-MTC',
        category: 'Tiramisu Series',
        sellingPrice: 135000,
        unitCogs: 53000,
        status: 'ACTIVE',
        activeRecipeId: 'RCP-000002',
        variants: []
      },
      {
        productId: 'PRD-000003',
        name: 'Burnt Basque Cheesecake',
        sku: 'TLB-CHE-BSQ',
        category: 'Baked Cake',
        sellingPrice: 185000,
        unitCogs: 71000,
        status: 'ACTIVE',
        activeRecipeId: 'RCP-000003',
        variants: []
      },
      {
        productId: 'PRD-000004',
        name: 'Belgian Fudgy Brownie Bite',
        sku: 'TLB-BRW-BEL',
        category: 'Pastry & Bites',
        sellingPrice: 95000,
        unitCogs: 36000,
        status: 'ACTIVE',
        activeRecipeId: 'RCP-000004',
        variants: []
      }
    ],
    materials: [
      {
        itemId: 'ING-000001',
        itemType: 'INGREDIENT',
        name: 'Mascarpone Italian Cheese',
        purchaseUnit: 'Tub 2kg',
        baseUnit: 'g',
        conversionFactor: 2000,
        purchasePrice: 360000,
        avgCostBase: 180,
        currentStockBase: 4200,
        minStockBase: 3000,
        defaultSupplierId: 'SUP-000001'
      },
      {
        itemId: 'ING-000002',
        itemType: 'INGREDIENT',
        name: 'Savoiardi Ladyfinger',
        purchaseUnit: 'Pack 400g',
        baseUnit: 'g',
        conversionFactor: 400,
        purchasePrice: 52000,
        avgCostBase: 130,
        currentStockBase: 1100,
        minStockBase: 1600,
        defaultSupplierId: 'SUP-000001'
      },
      {
        itemId: 'ING-000003',
        itemType: 'INGREDIENT',
        name: 'Arabica Espresso Concentrate',
        purchaseUnit: 'Bottle 1L',
        baseUnit: 'ml',
        conversionFactor: 1000,
        purchasePrice: 90000,
        avgCostBase: 90,
        currentStockBase: 2400,
        minStockBase: 1000,
        defaultSupplierId: 'SUP-000002'
      },
      {
        itemId: 'ING-000004',
        itemType: 'INGREDIENT',
        name: 'Uji Ceremonial Matcha Powder',
        purchaseUnit: 'Pouch 250g',
        baseUnit: 'g',
        conversionFactor: 250,
        purchasePrice: 275000,
        avgCostBase: 1100,
        currentStockBase: 180,
        minStockBase: 250,
        defaultSupplierId: 'SUP-000002'
      },
      {
        itemId: 'PKG-000001',
        itemType: 'PACKAGING',
        name: 'Gold Dessert Tin 250g + Lid',
        purchaseUnit: 'Bundle 50 pcs',
        baseUnit: 'pcs',
        conversionFactor: 50,
        purchasePrice: 325000,
        avgCostBase: 6500,
        currentStockBase: 64,
        minStockBase: 40,
        defaultSupplierId: 'SUP-000003'
      },
      {
        itemId: 'PKG-000002',
        itemType: 'PACKAGING',
        name: 'Artisanal Ribbon & Thermal Bag',
        purchaseUnit: 'Pack 25 pcs',
        baseUnit: 'pcs',
        conversionFactor: 25,
        purchasePrice: 125000,
        avgCostBase: 5000,
        currentStockBase: 18,
        minStockBase: 30,
        defaultSupplierId: 'SUP-000003'
      }
    ],
    recipes: [
      {
        recipeId: 'RCP-000001',
        productId: 'PRD-000001',
        productName: 'Classic Mascarpone Tiramisu',
        version: 2,
        baseYield: 10,
        yieldUnit: 'tin',
        defaultScalingMode: 'EXACT',
        status: 'ACTIVE',
        notes: 'Batch standar 10 tin @250g. Dinginkan minimal 6 jam sebelum kirim.',
        items: [
          {
            recipeItemId: 'RCI-000001',
            itemId: 'ING-000001',
            itemType: 'INGREDIENT',
            materialName: 'Mascarpone Italian Cheese',
            quantityBase: 1200,
            baseUnit: 'g',
            wasteAllowancePct: 3,
            unitCostBase: 180
          },
          {
            recipeItemId: 'RCI-000002',
            itemId: 'ING-000002',
            itemType: 'INGREDIENT',
            materialName: 'Savoiardi Ladyfinger',
            quantityBase: 650,
            baseUnit: 'g',
            wasteAllowancePct: 5,
            unitCostBase: 130
          },
          {
            recipeItemId: 'RCI-000003',
            itemId: 'ING-000003',
            itemType: 'INGREDIENT',
            materialName: 'Arabica Espresso Concentrate',
            quantityBase: 500,
            baseUnit: 'ml',
            wasteAllowancePct: 2,
            unitCostBase: 90
          },
          {
            recipeItemId: 'RCI-000004',
            itemId: 'PKG-000001',
            itemType: 'PACKAGING',
            materialName: 'Gold Dessert Tin 250g + Lid',
            quantityBase: 10,
            baseUnit: 'pcs',
            wasteAllowancePct: 0,
            unitCostBase: 6500
          },
          {
            recipeItemId: 'RCI-000005',
            itemId: 'PKG-000002',
            itemType: 'PACKAGING',
            materialName: 'Artisanal Ribbon & Thermal Bag',
            quantityBase: 10,
            baseUnit: 'pcs',
            wasteAllowancePct: 0,
            unitCostBase: 5000
          }
        ]
      },
      {
        recipeId: 'RCP-000002',
        productId: 'PRD-000002',
        productName: 'Uji Matcha Tiramisu Box',
        version: 1,
        baseYield: 8,
        yieldUnit: 'box',
        defaultScalingMode: 'FULL_BATCH',
        status: 'ACTIVE',
        notes: 'Wajib ayakan ganda untuk bubuk Uji Matcha.',
        items: [
          {
            recipeItemId: 'RCI-000006',
            itemId: 'ING-000001',
            itemType: 'INGREDIENT',
            materialName: 'Mascarpone Italian Cheese',
            quantityBase: 960,
            baseUnit: 'g',
            wasteAllowancePct: 3,
            unitCostBase: 180
          },
          {
            recipeItemId: 'RCI-000007',
            itemId: 'ING-000004',
            itemType: 'INGREDIENT',
            materialName: 'Uji Ceremonial Matcha Powder',
            quantityBase: 120,
            baseUnit: 'g',
            wasteAllowancePct: 4,
            unitCostBase: 1100
          },
          {
            recipeItemId: 'RCI-000008',
            itemId: 'PKG-000001',
            itemType: 'PACKAGING',
            materialName: 'Gold Dessert Tin 250g + Lid',
            quantityBase: 8,
            baseUnit: 'pcs',
            wasteAllowancePct: 0,
            unitCostBase: 6500
          }
        ]
      }
    ],
    preorderCampaigns: [
      {
        campaignId: 'PRE-202611-000001',
        name: 'Weekend Bake Drop — Early November',
        cutoffAt: '2026-11-06T18:00:00+07:00',
        productionDate: '2026-11-07',
        fulfillmentDate: '2026-11-07',
        capacityUnit: 'ORDERS',
        maxCapacity: 25,
        currentBooked: 21,
        status: 'ALMOST_FULL'
      },
      {
        campaignId: 'PRE-202611-000002',
        name: 'Mid-Month Matcha & Basque Special',
        cutoffAt: '2026-11-13T18:00:00+07:00',
        productionDate: '2026-11-14',
        fulfillmentDate: '2026-11-14',
        capacityUnit: 'ORDERS',
        maxCapacity: 30,
        currentBooked: 9,
        status: 'OPEN'
      }
    ],
    orders: [
      {
        orderId: 'ORD-202611-000001',
        createdAt: '2026-11-03T10:15:00+07:00',
        customerId: 'CUS-000001',
        customerName: 'Nadia Pramesti',
        customerWhatsapp: '081288901122',
        sourceChannel: 'WHATSAPP',
        preorderCampaignId: 'PRE-202611-000001',
        fulfillmentType: 'OWN_DELIVERY',
        fulfillmentDate: '2026-11-04',
        subtotal: 385000,
        deliveryFee: 25000,
        discount: 10000,
        tax: 0,
        grandTotal: 400000,
        paymentStatus: 'PAID',
        status: 'COMPLETED',
        invoiceId: 'INV-202611-000001',
        attributedCampaignId: 'MKT-202611-000001',
        attributedContentId: 'CNT-000001',
        notes: 'Kirim sebelum jam 14.00 WIB.',
        items: [
          {
            orderItemId: 'ORI-000001',
            productId: 'PRD-000001',
            variantId: 'VAR-000001',
            productTitle: 'Classic Mascarpone Tiramisu — Personal Tin (250g)',
            sku: 'TLB-TIR-CLS-250',
            quantity: 2,
            unitPrice: 125000,
            unitCogsSnapshot: 48500,
            lineTotal: 250000,
            productionNotes: 'Extra cocoa sachet'
          },
          {
            orderItemId: 'ORI-000002',
            productId: 'PRD-000002',
            variantId: null,
            productTitle: 'Uji Matcha Tiramisu Box',
            sku: 'TLB-TIR-MTC',
            quantity: 1,
            unitPrice: 135000,
            unitCogsSnapshot: 53000,
            lineTotal: 135000,
            productionNotes: ''
          }
        ]
      },
      {
        orderId: 'ORD-202611-000002',
        createdAt: '2026-11-04T08:30:00+07:00',
        customerId: 'CUS-000002',
        customerName: 'Raka Mahendra',
        customerWhatsapp: '081377654321',
        sourceChannel: 'INSTAGRAM',
        preorderCampaignId: 'PRE-202611-000001',
        fulfillmentType: 'GOJEK',
        fulfillmentDate: '2026-11-04',
        subtotal: 270000,
        deliveryFee: 20000,
        discount: 0,
        tax: 0,
        grandTotal: 290000,
        paymentStatus: 'PARTIAL',
        status: 'CONFIRMED',
        invoiceId: 'INV-202611-000002',
        attributedCampaignId: 'MKT-202611-000001',
        attributedContentId: 'CNT-000002',
        notes: 'Titip di resepsionis lobby selatan.',
        items: [
          {
            orderItemId: 'ORI-000003',
            productId: 'PRD-000002',
            variantId: null,
            productTitle: 'Uji Matcha Tiramisu Box',
            sku: 'TLB-TIR-MTC',
            quantity: 2,
            unitPrice: 135000,
            unitCogsSnapshot: 53000,
            lineTotal: 270000,
            productionNotes: 'Kartu ucapan Happy Birthday'
          }
        ]
      },
      {
        orderId: 'ORD-202611-000003',
        createdAt: '2026-11-04T09:45:00+07:00',
        customerId: 'CUS-000005',
        customerName: 'Alya Putri',
        customerWhatsapp: '081299887766',
        sourceChannel: 'INSTAGRAM',
        preorderCampaignId: null,
        fulfillmentType: 'PICKUP',
        fulfillmentDate: '2026-11-05',
        subtotal: 280000,
        deliveryFee: 0,
        discount: 0,
        tax: 0,
        grandTotal: 280000,
        paymentStatus: 'WAITING_PAYMENT',
        status: 'WAITING_PAYMENT',
        invoiceId: 'INV-202611-000003',
        attributedCampaignId: null,
        attributedContentId: null,
        notes: 'Pickup sore jam 16.30.',
        items: [
          {
            orderItemId: 'ORI-000004',
            productId: 'PRD-000003',
            variantId: null,
            productTitle: 'Burnt Basque Cheesecake',
            sku: 'TLB-CHE-BSQ',
            quantity: 1,
            unitPrice: 185000,
            unitCogsSnapshot: 71000,
            lineTotal: 185000,
            productionNotes: ''
          },
          {
            orderItemId: 'ORI-000005',
            productId: 'PRD-000004',
            variantId: null,
            productTitle: 'Belgian Fudgy Brownie Bite',
            sku: 'TLB-BRW-BEL',
            quantity: 1,
            unitPrice: 95000,
            unitCogsSnapshot: 36000,
            lineTotal: 95000,
            productionNotes: ''
          }
        ]
      },
      {
        orderId: 'ORD-202611-000004',
        createdAt: '2026-11-02T14:10:00+07:00',
        customerId: 'CUS-000003',
        customerName: 'Sinta Larasati',
        customerWhatsapp: '08119002233',
        sourceChannel: 'WHATSAPP',
        preorderCampaignId: null,
        fulfillmentType: 'GRAB',
        fulfillmentDate: '2026-11-03',
        subtotal: 370000,
        deliveryFee: 18000,
        discount: 0,
        tax: 0,
        grandTotal: 388000,
        paymentStatus: 'PAID',
        status: 'COMPLETED',
        invoiceId: 'INV-202611-000004',
        attributedCampaignId: 'MKT-202610-000001',
        attributedContentId: null,
        notes: '',
        items: [
          {
            orderItemId: 'ORI-000006',
            productId: 'PRD-000003',
            variantId: null,
            productTitle: 'Burnt Basque Cheesecake',
            sku: 'TLB-CHE-BSQ',
            quantity: 2,
            unitPrice: 185000,
            unitCogsSnapshot: 71000,
            lineTotal: 370000,
            productionNotes: ''
          }
        ]
      }
    ],
    invoices: [
      {
        invoiceId: 'INV-202611-000001',
        invoiceNumber: 'INV-TLB-202611-000001',
        orderId: 'ORD-202611-000001',
        customerId: 'CUS-000001',
        customerName: 'Nadia Pramesti',
        customerWhatsapp: '081288901122',
        issuedAt: '2026-11-03T10:16:00+07:00',
        dueAt: '2026-11-04T10:16:00+07:00',
        grandTotal: 400000,
        paidAmount: 400000,
        remainingAmount: 0,
        status: 'PAID',
        publicToken: 'pub_tok_98a1f3d0b2',
        lastPaymentMethod: 'BCA'
      },
      {
        invoiceId: 'INV-202611-000002',
        invoiceNumber: 'INV-TLB-202611-000002',
        orderId: 'ORD-202611-000002',
        customerId: 'CUS-000002',
        customerName: 'Raka Mahendra',
        customerWhatsapp: '081377654321',
        issuedAt: '2026-11-04T08:31:00+07:00',
        dueAt: '2026-11-05T08:31:00+07:00',
        grandTotal: 290000,
        paidAmount: 150000,
        remainingAmount: 140000,
        status: 'PARTIAL',
        publicToken: 'pub_tok_77c4e9a112',
        lastPaymentMethod: 'QRIS'
      },
      {
        invoiceId: 'INV-202611-000003',
        invoiceNumber: 'INV-TLB-202611-000003',
        orderId: 'ORD-202611-000003',
        customerId: 'CUS-000005',
        customerName: 'Alya Putri',
        customerWhatsapp: '081299887766',
        issuedAt: '2026-11-04T09:46:00+07:00',
        dueAt: '2026-11-05T09:46:00+07:00',
        grandTotal: 280000,
        paidAmount: 0,
        remainingAmount: 280000,
        status: 'WAITING_PAYMENT',
        publicToken: 'pub_tok_55d2b8c309',
        lastPaymentMethod: '—'
      },
      {
        invoiceId: 'INV-202611-000004',
        invoiceNumber: 'INV-TLB-202611-000004',
        orderId: 'ORD-202611-000004',
        customerId: 'CUS-000003',
        customerName: 'Sinta Larasati',
        customerWhatsapp: '08119002233',
        issuedAt: '2026-11-02T14:12:00+07:00',
        dueAt: '2026-11-03T14:12:00+07:00',
        grandTotal: 388000,
        paidAmount: 388000,
        remainingAmount: 0,
        status: 'PAID',
        publicToken: 'pub_tok_31e9a4f701',
        lastPaymentMethod: 'MANDIRI'
      }
    ],
    payments: [
      {
        paymentId: 'PAY-202611-000001',
        invoiceId: 'INV-202611-000001',
        orderId: 'ORD-202611-000001',
        paymentAt: '2026-11-03T11:02:00+07:00',
        amount: 400000,
        paymentMethod: 'BCA',
        referenceNo: 'BCA-20261103-001',
        status: 'SUCCESS',
        proofFileName: '2026-11-03_nadia-pramesti_PAY-202611-000001.jpg',
        proofMime: 'image/jpeg',
        notes: 'Pelunasan penuh via m-BCA'
      },
      {
        paymentId: 'PAY-202611-000002',
        invoiceId: 'INV-202611-000002',
        orderId: 'ORD-202611-000002',
        paymentAt: '2026-11-04T08:50:00+07:00',
        amount: 150000,
        paymentMethod: 'QRIS',
        referenceNo: 'QRIS-20261104-089',
        status: 'SUCCESS',
        proofFileName: '2026-11-04_raka-mahendra_PAY-202611-000002.png',
        proofMime: 'image/png',
        notes: 'DP 50% Pre-Order'
      },
      {
        paymentId: 'PAY-202611-000003',
        invoiceId: 'INV-202611-000004',
        orderId: 'ORD-202611-000004',
        paymentAt: '2026-11-02T15:00:00+07:00',
        amount: 388000,
        paymentMethod: 'MANDIRI',
        referenceNo: 'MDR-20261102-412',
        status: 'SUCCESS',
        proofFileName: '2026-11-02_sinta-larasati_PAY-202611-000003.pdf',
        proofMime: 'application/pdf',
        notes: 'Lunas Livin Mandiri'
      }
    ],
    productionPlans: [
      {
        planId: 'PPL-202611-000001',
        fulfillmentDate: '2026-11-04',
        productionDate: '2026-11-04',
        orderIds: ['ORD-202611-000001', 'ORD-202611-000002'],
        status: 'IN_PROGRESS',
        usagePosted: false,
        notes: 'Batch pagi untuk pengiriman Gojek & kurir internal.',
        targets: [
          {
            planItemId: 'PPI-000001',
            productId: 'PRD-000001',
            productName: 'Classic Mascarpone Tiramisu',
            recipeId: 'RCP-000001',
            recipeVersion: 2,
            scalingMode: 'EXACT',
            targetQty: 2,
            expectedOutput: 2,
            multiplier: 0.2
          },
          {
            planItemId: 'PPI-000002',
            productId: 'PRD-000002',
            productName: 'Uji Matcha Tiramisu Box',
            recipeId: 'RCP-000002',
            recipeVersion: 1,
            scalingMode: 'FULL_BATCH',
            targetQty: 3,
            expectedOutput: 8,
            multiplier: 1
          }
        ],
        requirements: [
          {
            requirementId: 'REQ-000001',
            itemId: 'ING-000001',
            materialName: 'Mascarpone Italian Cheese',
            itemType: 'INGREDIENT',
            baseUnit: 'g',
            requiredQtyBase: 1236,
            availableQtyBase: 4200,
            shortageQtyBase: 0,
            status: 'SUFFICIENT'
          },
          {
            requirementId: 'REQ-000002',
            itemId: 'ING-000004',
            materialName: 'Uji Ceremonial Matcha Powder',
            itemType: 'INGREDIENT',
            baseUnit: 'g',
            requiredQtyBase: 225,
            availableQtyBase: 180,
            shortageQtyBase: 45,
            status: 'SHORTAGE'
          },
          {
            requirementId: 'REQ-000003',
            itemId: 'PKG-000001',
            materialName: 'Gold Dessert Tin 250g + Lid',
            itemType: 'PACKAGING',
            baseUnit: 'pcs',
            requiredQtyBase: 10,
            availableQtyBase: 64,
            shortageQtyBase: 0,
            status: 'SUFFICIENT'
          }
        ]
      }
    ],
    inventoryMovements: [
      {
        movementId: 'MOV-202611-000001',
        movementAt: '2026-11-01T08:00:00+07:00',
        itemId: 'ING-000001',
        materialName: 'Mascarpone Italian Cheese',
        itemType: 'INGREDIENT',
        movementType: 'OPENING',
        qtyInBase: 5000,
        qtyOutBase: 0,
        balanceAfterBase: 5000,
        baseUnit: 'g',
        referenceId: 'INIT-202611',
        notes: 'Saldo awal bulan November'
      },
      {
        movementId: 'MOV-202611-000002',
        movementAt: '2026-11-02T16:30:00+07:00',
        itemId: 'ING-000001',
        materialName: 'Mascarpone Italian Cheese',
        itemType: 'INGREDIENT',
        movementType: 'PRODUCTION_USAGE',
        qtyInBase: 0,
        qtyOutBase: 800,
        balanceAfterBase: 4200,
        baseUnit: 'g',
        referenceId: 'PPL-202610-000019',
        notes: 'Pemakaian produksi batch 2 Nov'
      },
      {
        movementId: 'MOV-202611-000003',
        movementAt: '2026-11-03T09:15:00+07:00',
        itemId: 'ING-000002',
        materialName: 'Savoiardi Ladyfinger',
        itemType: 'INGREDIENT',
        movementType: 'PURCHASE_RECEIPT',
        qtyInBase: 800,
        qtyOutBase: 0,
        balanceAfterBase: 1100,
        baseUnit: 'g',
        referenceId: 'PUR-202611-000001',
        notes: 'Penerimaan PO Prambanan Gourmet'
      }
    ],
    suppliers: [
      {
        supplierId: 'SUP-000001',
        name: 'PT Prambanan Dairy & Gourmet',
        contactName: 'Hendra Wijaya',
        whatsapp: '08118009911',
        leadTimeDays: 2,
        minimumOrderIdr: 500000,
        status: 'ACTIVE'
      },
      {
        supplierId: 'SUP-000002',
        name: 'Kyoto Matcha & Roastery ID',
        contactName: 'Keiko Tan',
        whatsapp: '081233445566',
        leadTimeDays: 3,
        minimumOrderIdr: 350000,
        status: 'ACTIVE'
      },
      {
        supplierId: 'SUP-000003',
        name: 'Kemasan Cantik Patisserie',
        contactName: 'Budi Santoso',
        whatsapp: '081388776655',
        leadTimeDays: 1,
        minimumOrderIdr: 250000,
        status: 'ACTIVE'
      }
    ],
    purchases: [
      {
        purchaseId: 'PUR-202611-000001',
        supplierId: 'SUP-000001',
        supplierName: 'PT Prambanan Dairy & Gourmet',
        purchaseDate: '2026-11-02',
        totalIdr: 824000,
        receivingStatus: 'RECEIVED',
        status: 'RECEIVED',
        items: [
          {
            purchaseItemId: 'PUI-000001',
            itemId: 'ING-000001',
            materialName: 'Mascarpone Italian Cheese',
            itemType: 'INGREDIENT',
            orderedQtyBase: 4000,
            receivedQtyBase: 4000,
            baseUnit: 'g',
            unitCostIdr: 180,
            lineTotalIdr: 720000
          },
          {
            purchaseItemId: 'PUI-000002',
            itemId: 'ING-000002',
            materialName: 'Savoiardi Ladyfinger',
            itemType: 'INGREDIENT',
            orderedQtyBase: 800,
            receivedQtyBase: 800,
            baseUnit: 'g',
            unitCostIdr: 130,
            lineTotalIdr: 104000
          }
        ]
      },
      {
        purchaseId: 'PUR-202611-000002',
        supplierId: 'SUP-000002',
        supplierName: 'Kyoto Matcha & Roastery ID',
        purchaseDate: '2026-11-04',
        totalIdr: 550000,
        receivingStatus: 'UNRECEIVED',
        status: 'ORDERED',
        items: [
          {
            purchaseItemId: 'PUI-000003',
            itemId: 'ING-000004',
            materialName: 'Uji Ceremonial Matcha Powder',
            itemType: 'INGREDIENT',
            orderedQtyBase: 500,
            receivedQtyBase: 0,
            baseUnit: 'g',
            unitCostIdr: 1100,
            lineTotalIdr: 550000
          }
        ]
      }
    ],
    expenses: [
      {
        expenseId: 'EXP-202611-000001',
        expenseDate: '2026-11-01',
        category: 'MARKETING',
        vendor: 'Meta Ads Indonesia',
        paymentMethod: 'BCA',
        amount: 180000,
        status: 'POSTED',
        marketingCampaignId: 'MKT-202611-000001',
        notes: 'Boost Reels Tiramisu Weekend Drop'
      },
      {
        expenseId: 'EXP-202611-000002',
        expenseDate: '2026-11-02',
        category: 'UTILITIES',
        vendor: 'PLN & Chiller Kitchen',
        paymentMethod: 'MANDIRI',
        amount: 95000,
        status: 'POSTED',
        marketingCampaignId: null,
        notes: 'Token listrik chiller produksi'
      }
    ],
    transactions: [
      {
        transactionId: 'TRX-202611-000001',
        transactionDate: '2026-11-01',
        type: 'EXPENSE_OUT',
        referenceId: 'EXP-202611-000001',
        paymentMethod: 'BCA',
        amountIn: 0,
        amountOut: 180000
      },
      {
        transactionId: 'TRX-202611-000002',
        transactionDate: '2026-11-02',
        type: 'PAYMENT_IN',
        referenceId: 'PAY-202611-000003',
        paymentMethod: 'MANDIRI',
        amountIn: 388000,
        amountOut: 0
      },
      {
        transactionId: 'TRX-202611-000003',
        transactionDate: '2026-11-02',
        type: 'EXPENSE_OUT',
        referenceId: 'EXP-202611-000002',
        paymentMethod: 'MANDIRI',
        amountIn: 0,
        amountOut: 95000
      },
      {
        transactionId: 'TRX-202611-000004',
        transactionDate: '2026-11-03',
        type: 'PAYMENT_IN',
        referenceId: 'PAY-202611-000001',
        paymentMethod: 'BCA',
        amountIn: 400000,
        amountOut: 0
      },
      {
        transactionId: 'TRX-202611-000005',
        transactionDate: '2026-11-03',
        type: 'COGS_NON_CASH',
        referenceId: 'ORD-202611-000001',
        paymentMethod: 'NON_CASH',
        amountIn: 0,
        amountOut: 150000
      },
      {
        transactionId: 'TRX-202611-000006',
        transactionDate: '2026-11-04',
        type: 'PAYMENT_IN',
        referenceId: 'PAY-202611-000002',
        paymentMethod: 'QRIS',
        amountIn: 150000,
        amountOut: 0
      }
    ],
    targets: [
      {
        targetId: 'TGT-000001',
        metricKey: 'OPERATING_REVENUE',
        metricLabel: 'Operating Revenue (Nov)',
        periodStart: '2026-11-01',
        periodEnd: '2026-11-30',
        targetValue: 15000000,
        actualValue: 788000,
        unit: 'IDR',
        status: 'ON_TRACK'
      },
      {
        targetId: 'TGT-000002',
        metricKey: 'COMPLETED_ORDERS',
        metricLabel: 'Completed Orders (Nov)',
        periodStart: '2026-11-01',
        periodEnd: '2026-11-30',
        targetValue: 60,
        actualValue: 2,
        unit: 'COUNT',
        status: 'ON_TRACK'
      },
      {
        targetId: 'TGT-000003',
        metricKey: 'REPEAT_RATE',
        metricLabel: 'Customer Repeat Rate',
        periodStart: '2026-10-01',
        periodEnd: '2026-11-30',
        targetValue: 65,
        actualValue: 80,
        unit: 'PCT',
        status: 'ACHIEVED'
      }
    ],
    marketingCampaigns: [
      {
        campaignId: 'MKT-202611-000001',
        name: 'November Weekend Tiramisu Drop',
        periodStart: '2026-11-01',
        periodEnd: '2026-11-15',
        budget: 750000,
        spend: 180000,
        orders: 2,
        revenue: 400000,
        newCustomers: 1,
        status: 'ACTIVE'
      },
      {
        campaignId: 'MKT-202610-000001',
        name: 'October Basque Cheese Launch',
        periodStart: '2026-10-10',
        periodEnd: '2026-10-31',
        budget: 500000,
        spend: 320000,
        orders: 1,
        revenue: 388000,
        newCustomers: 1,
        status: 'COMPLETED'
      }
    ],
    marketingContents: [
      {
        contentId: 'CNT-000001',
        campaignId: 'MKT-202611-000001',
        campaignName: 'November Weekend Tiramisu Drop',
        title: 'ASMR Melted Mascarpone Layering Reels',
        platform: 'INSTAGRAM',
        reach: 14200,
        views: 19800,
        engagement: 1240,
        clicks: 310,
        orders: 1,
        revenue: 400000
      },
      {
        contentId: 'CNT-000002',
        campaignId: 'MKT-202611-000001',
        campaignName: 'November Weekend Tiramisu Drop',
        title: 'Uji Matcha Dusting Behind The Scenes',
        platform: 'TIKTOK',
        reach: 9400,
        views: 12600,
        engagement: 880,
        clicks: 145,
        orders: 1,
        revenue: 0
      }
    ],
    dailyMetrics: [
      {
        date: '2026-11-01',
        orders: 1,
        completed: 0,
        revenue: 0,
        expenses: 180000,
        cashNet: -180000,
        mktSpend: 180000,
        attributedRev: 0,
        attributedOrders: 0,
        newCustomers: 0,
        plans: 0,
        completedPlans: 0,
        shortages: 0,
        waste: 0
      },
      {
        date: '2026-11-02',
        orders: 1,
        completed: 1,
        revenue: 388000,
        expenses: 95000,
        cashNet: 293000,
        mktSpend: 0,
        attributedRev: 388000,
        attributedOrders: 1,
        newCustomers: 0,
        plans: 1,
        completedPlans: 1,
        shortages: 0,
        waste: 0
      },
      {
        date: '2026-11-03',
        orders: 1,
        completed: 1,
        revenue: 400000,
        expenses: 0,
        cashNet: 400000,
        mktSpend: 0,
        attributedRev: 400000,
        attributedOrders: 1,
        newCustomers: 0,
        plans: 0,
        completedPlans: 0,
        shortages: 0,
        waste: 0
      },
      {
        date: '2026-11-04',
        orders: 2,
        completed: 0,
        revenue: 0,
        expenses: 0,
        cashNet: 150000,
        mktSpend: 0,
        attributedRev: 0,
        attributedOrders: 1,
        newCustomers: 1,
        plans: 1,
        completedPlans: 0,
        shortages: 1,
        waste: 0
      }
    ],
    settings: {
      businessName: 'twolittle.bites',
      brandLogoUrl: '',
      whatsappCountryCode: '62',
      timezone: 'Asia/Jakarta',
      currency: 'IDR',
      salesChannels: ['WHATSAPP', 'INSTAGRAM', 'WEBSITE', 'OFFLINE', 'GOFOOD', 'GRABFOOD', 'SHOPEEFOOD'],
      fulfillmentTypes: ['PICKUP', 'OWN_DELIVERY', 'GOJEK', 'GRAB', 'LALAMOVE'],
      paymentMethods: ['CASH', 'BCA', 'MANDIRI', 'QRIS', 'TRANSFER'],
      expenseCategories: ['INGREDIENTS', 'PACKAGING', 'SALARY', 'MARKETING', 'ADS', 'DELIVERY', 'RENT', 'UTILITIES'],
      invoicePrefix: 'INV-TLB',
      invoiceDueHours: 24,
      invoicePublicTitle: 'Invoice Pesanan Twolittle.bites',
      invoicePublicNote: 'Terima kasih sudah memesan di twolittle.bites! Mohon unggah bukti transfer setelah pembayaran.',
      invoiceWhatsappTemplate:
        'Halo Kak {customer_name} 🤎\n\nTerima kasih sudah memesan di *{business_name}*!\nBerikut rincian tagihan Anda:\n• No. Invoice: *{invoice_number}*\n• Total Tagihan: *{grand_total}*\n• Sisa Tagihan: *{remaining_amount}*\n• Ongkir: {delivery_fee}\n• Jatuh Tempo: {due_at}\n\nLink Invoice Resmi: {invoice_pdf_url}\n\nSampai jumpa di gigitan manis berikutnya!',
      receiptPaperSize: '80',
      receiptCopies: 1,
      receiptAutoPrintAfterPayment: false,
      receiptShowLogo: true,
      receiptShowCustomer: true,
      receiptShowPaymentMethod: true,
      kitchenTicketEnabled: true,
      autoInvoiceOnOrder: true,
      autoConfirmOnPaid: true,
      negativeStockAllowed: false,
      allowAdminPreorderOverride: false,
      preorderAlmostFullRatio: 0.2,
      crmDormantDays: 60,
      reportCacheLookbackDays: 90
    },
    users: [
      {
        userId: 'USR-000001',
        displayName: 'Clarissa (Owner)',
        email: 'owner@twolittlebites.id',
        role: 'OWNER',
        status: 'ACTIVE',
        lastLogin: '2026-11-04 01:45 WIB'
      },
      {
        userId: 'USR-000002',
        displayName: 'Putri (Admin Ops)',
        email: 'admin@twolittlebites.id',
        role: 'ADMIN',
        status: 'ACTIVE',
        lastLogin: '2026-11-03 20:10 WIB'
      },
      {
        userId: 'USR-000003',
        displayName: 'ChefRio (Kitchen)',
        email: 'kitchen@twolittlebites.id',
        role: 'PRODUCTION',
        status: 'ACTIVE',
        lastLogin: '2026-11-04 00:30 WIB'
      },
      {
        userId: 'USR-000004',
        displayName: 'Tania (Growth & CRM)',
        email: 'marketing@twolittlebites.id',
        role: 'MARKETING',
        status: 'ACTIVE',
        lastLogin: '2026-11-03 18:22 WIB'
      },
      {
        userId: 'USR-000005',
        displayName: 'Dewi (Finance)',
        email: 'finance@twolittlebites.id',
        role: 'FINANCE',
        status: 'ACTIVE',
        lastLogin: '2026-11-03 21:05 WIB'
      }
    ]
  };
}
