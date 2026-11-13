export type CurrencyCode = 'XOF' | 'EUR' | 'USD' | 'GNF';

export type UserRole = 'DIRECTRICE' | 'GERANT' | 'VENDEUR' | 'COMPTABLE';

export type BusinessSector =
  | 'Commerce Général & Supérette'
  | 'Mode & Prêt-à-porter'
  | 'Quincaillerie & Brico'
  | 'Grossiste Multi-sites'
  | 'Électronique & Services';

export interface Organization {
  id: string;
  name: string; // Raison sociale (ex: Silvares Distribution SARL)
  tradeName: string; // Enseigne / Nom commercial (ex: Silvares Stocks)
  sector: BusinessSector;
  country: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  taxId: string; // NINEA / NIF / SIRET
  tradeRegister: string; // RCCM / RC
  defaultCurrency: CurrencyCode;
  defaultVatRate: number;
  receiptFooter: string;
  allowNegativeStock: boolean;
  loginSettings: {
    allowEmailPassword: boolean;
    allowPinLogin: boolean;
    showQuickDemoProfiles: boolean;
    requirePinForReturns: boolean;
    welcomeTitle: string;
    welcomeSubtitle: string;
    sessionTimeoutMinutes: number;
  };
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  boutiqueId: string; // 'all' or boutique id
  avatarUrl?: string;
  phone?: string;
  jobTitle?: string;
  password?: string;
  pinCode?: string; // 4-digit PIN for POS quick access
  isActive: boolean;
  lastLogin?: string;
}

export interface Boutique {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  managerName: string;
  isDepot?: boolean;
}

export type ProductCategory = 
  | 'Alimentation & Épicerie'
  | 'Boissons & Frais'
  | 'Hygiène & Entretien'
  | 'Mode & Textile'
  | 'Quincaillerie & Brico'
  | 'Électronique & Divers';

export interface ProductStock {
  boutiqueId: string;
  quantity: number;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: ProductCategory;
  unit: 'pièce' | 'carton' | 'kg' | 'litre' | 'paquet' | 'boîte';
  purchasePrice: number; // Prix d'achat HT
  sellingPrice: number; // Prix de vente TTC
  vatRate: number; // e.g. 18 for 18% or 0
  minThreshold: number; // Seuil d'alerte critique
  supplier: string;
  stocks: ProductStock[]; // stock per boutique
  imageUrl?: string;
  isFavorite?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  customPrice?: number;
  discountPercent?: number; // 0 to 100
}

export type PaymentMethod = 'ESPECES' | 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'CARTE_BANCAIRE' | 'CREDIT_CLIENT' | 'MIXTE';

export interface PaymentDetail {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  currentDebt: number; // Encours client (crédit)
  maxCredit: number; // Plafond autorisé
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  purchasePrice: number;
  quantity: number;
  discountPercent: number;
  total: number;
}

export interface Sale {
  id: string;
  ticketNumber: string;
  boutiqueId: string;
  sellerId: string;
  sellerName: string;
  customerId?: string;
  customerName?: string;
  date: string; // ISO string
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
  payments: PaymentDetail[];
  amountPaid: number;
  changeReturned: number;
  status: 'COMPLETED' | 'RETURNED' | 'PARTIALLY_RETURNED';
  returnReason?: string;
  returnedAt?: string;
}

export interface ShiftClosure {
  id: string;
  boutiqueId: string;
  sellerId: string;
  sellerName: string;
  date: string;
  type: 'X' | 'Z'; // X = Provisoire, Z = Clôture définitive
  openingCash: number; // Fond de caisse initial
  expectedCash: number; // Espèces théoriques enregistrées
  countedCash: number; // Espèces physiques comptées
  variance: number; // countedCash - expectedCash (négatif = manquant, positif = surplus)
  totalSales: number;
  totalWave: number;
  totalOrange: number;
  totalMomo: number;
  totalCard: number;
  totalCredit: number;
  totalCashExpenses?: number; // Dépenses déduites de la caisse
  notes?: string;
}

export type ExpenseCategory = 
  | 'Loyer & Charges Locatives'
  | 'Salaires & Primes'
  | 'Transport & Logistique'
  | 'Eau, Électricité & Internet'
  | 'Fournitures & Emballages'
  | 'Maintenance & Entretien'
  | 'Taxes & Frais Administratifs';

export type ExpenseStatus = 'BROUILLON' | 'EN_ATTENTE' | 'VALIDE' | 'REJETE';

export type ExpensePaymentSource = 'CAISSE' | 'BANQUE' | 'MOBILE_MONEY';

export interface Expense {
  id: string;
  reference: string;
  boutiqueId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  status: ExpenseStatus;
  paymentSource?: ExpensePaymentSource;
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  receiptNumber?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  boutiqueId: string;
  type: 'VENTE' | 'RECEPTION_FOURNISSEUR' | 'RETOUR_CLIENT' | 'CASSE_PERTE' | 'TRANSFERT_SORTANT' | 'TRANSFERT_ENTRANT' | 'AJUSTEMENT_INVENTAIRE';
  quantity: number; // positif ou négatif
  unitCost: number;
  date: string;
  reference: string;
  userName: string;
}

export interface TransferNote {
  id: string;
  transferNumber: string;
  sourceBoutiqueId: string;
  destinationBoutiqueId: string;
  date: string;
  status: 'EXPEDIE' | 'RECU' | 'EN_TRANSIT';
  items: {
    productId: string;
    productName: string;
    quantity: number;
  }[];
  notes?: string;
  createdBy: string;
}

export interface SalesRepGoal {
  sellerId: string;
  sellerName: string;
  boutiqueId: string;
  month: string; // e.g. "2026-11"
  monthlyTarget: number; // Objectif en FCFA
  commissionRate: number; // e.g. 2.0 (%)
}

export type SupplierPaymentTerms = 'Comptant' | '15 jours' | '30 jours' | '60 jours';

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactName: string;
  phone: string;
  email?: string;
  city: string;
  address?: string;
  taxId?: string;
  paymentTerms: SupplierPaymentTerms;
  notes?: string;
}

export type PurchaseOrderStatus = 'BROUILLON' | 'COMMANDE' | 'RECU' | 'ANNULE';
export type PurchasePaymentStatus = 'NON_PAYE' | 'PARTIEL' | 'PAYE';

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitCost: number;
  vatRate: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  boutiqueId: string;
  date: string;
  expectedDate?: string;
  receivedAt?: string;
  status: PurchaseOrderStatus;
  paymentStatus: PurchasePaymentStatus;
  amountPaid: number;
  items: PurchaseItem[];
  subtotalHT: number;
  vatAmount: number;
  totalTTC: number;
  notes?: string;
  createdBy: string;
  receivedBy?: string;
}

