import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Boutique,
  BusinessSector,
  CurrencyCode,
  Customer,
  Expense,
  ExpenseStatus,
  HeldInvoice,
  HeldInvoiceItem,
  HoldInvoiceSettings,
  Organization,
  Product,
  PurchaseItem,
  PurchaseOrder,
  PurchaseOrderStatus,
  Sale,
  SalesRepGoal,
  ShiftClosure,
  StockMovement,
  Supplier,
  TransferNote,
  User,
  UserRole,
} from '../types';
import {
  DEFAULT_HOLD_INVOICE_SETTINGS,
  INITIAL_BOUTIQUES,
  INITIAL_CUSTOMERS,
  INITIAL_EXPENSES,
  INITIAL_ORGANIZATION,
  INITIAL_PRODUCTS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_SALES,
  INITIAL_SALES_REP_GOALS,
  INITIAL_SHIFT_CLOSURES,
  INITIAL_SUPPLIERS,
  INITIAL_USERS,
} from '../data/initialData';

export type MainTab = 'menu' | 'pos' | 'stock' | 'purchases' | 'analytics' | 'sales_reps' | 'expenses' | 'admin';
export type AdminSubTab = 'profile' | 'users' | 'organization' | 'boutiques' | 'login_config';

export const isTabAllowedForRole = (tab: MainTab, role: UserRole): boolean => {
  if (role === 'VENDEUR') {
    return tab === 'menu' || tab === 'pos' || tab === 'expenses';
  }
  return true;
};

export interface CreateOrganizationPayload {
  orgName: string;
  tradeName: string;
  sector: BusinessSector;
  country: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  defaultCurrency: CurrencyCode;
  defaultVatRate: number;
  boutiqueName: string;
  boutiqueCode: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminPassword: string;
  adminPin: string;
  includeSampleCatalog: boolean;
}

interface AppContextType {
  // Organization & Auth
  organization: Organization;
  updateOrganization: (updated: Organization) => void;
  createOrganization: (payload: CreateOrganizationPayload) => void;
  isAuthenticated: boolean;
  loginWithEmail: (email: string, password: string) => { ok: boolean; error?: string };
  loginWithPin: (pin: string, userId?: string) => { ok: boolean; error?: string };
  switchUserWithPassword: (userId: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;

  // Boutiques
  boutiques: Boutique[];
  selectedBoutiqueId: string;
  setSelectedBoutiqueId: (id: string) => void;
  currentBoutique: Boutique | null;
  addBoutique: (boutique: Omit<Boutique, 'id'>) => Boutique;
  updateBoutique: (boutique: Boutique) => void;
  deleteBoutique: (id: string) => { ok: boolean; error?: string };

  // Users & Profiles
  users: User[];
  currentUser: User;
  addUser: (user: Omit<User, 'id'>) => User;
  updateUser: (user: User) => void;
  toggleUserActive: (id: string) => void;
  deleteUser: (id: string) => { ok: boolean; error?: string };

  // Navigation & Currency
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatMoney: (amountInXOF: number) => string;
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  canAccessTab: (tab: MainTab) => boolean;
  adminSubTab: AdminSubTab;
  setAdminSubTab: (sub: AdminSubTab) => void;
  openAdminSection: (sub: AdminSubTab) => void;

  // Products & Stock
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => Product;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  getProductStockInBoutique: (productId: string, boutiqueId: string) => number;
  recordStockAdjustment: (data: {
    productId: string;
    boutiqueId: string;
    type: 'RECEPTION_FOURNISSEUR' | 'CASSE_PERTE' | 'AJUSTEMENT_INVENTAIRE';
    quantity: number;
    unitCost?: number;
    reference: string;
    reason?: string;
  }) => void;
  transferStock: (
    sourceId: string,
    destId: string,
    items: { productId: string; quantity: number }[],
    notes?: string
  ) => TransferNote;
  transferNotes: TransferNote[];
  stockMovements: StockMovement[];

  // Sales & POS
  sales: Sale[];
  recordSale: (saleData: Omit<Sale, 'id' | 'ticketNumber' | 'date' | 'status'>) => Sale;
  processReturn: (saleId: string, reason: string, returnedQuantities?: Record<string, number>) => void;
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'currentDebt'>) => Customer;

  // Held Invoices (Mise en attente des factures)
  holdInvoiceSettings: HoldInvoiceSettings;
  heldInvoices: HeldInvoice[];
  holdCurrentCart: (payload: {
    boutiqueId: string;
    customerId?: string;
    customerName?: string;
    referenceNote: string;
    items: HeldInvoiceItem[];
    total: number;
  }) => { ok: boolean; held?: HeldInvoice; error?: string };
  removeHeldInvoice: (id: string) => void;
  getReservedStockInBoutique: (productId: string, boutiqueId: string) => number;

  // Shifts
  shiftClosures: ShiftClosure[];
  recordShiftClosure: (closure: Omit<ShiftClosure, 'id' | 'date'>) => ShiftClosure;

  // Expenses & Cash Drawer
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'reference' | 'status'>) => Expense;
  updateExpenseStatus: (id: string, status: ExpenseStatus, approvedBy?: string) => void;
  deleteExpense: (id: string) => void;
  getCashRegisterSummary: (boutiqueId: string) => {
    cashSales: number;
    cashExpenses: number;
    netCash: number;
    cashExpenseItems: Expense[];
  };

  // Purchases & Suppliers
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Supplier;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (id: string) => void;
  purchaseOrders: PurchaseOrder[];
  createPurchaseOrder: (data: {
    supplierId: string;
    boutiqueId: string;
    expectedDate?: string;
    items: PurchaseItem[];
    notes?: string;
    initialStatus?: 'BROUILLON' | 'COMMANDE' | 'RECU';
    initialAmountPaid?: number;
  }) => PurchaseOrder;
  updatePurchaseOrder: (
    orderId: string,
    data: {
      supplierId: string;
      boutiqueId: string;
      expectedDate?: string;
      items: PurchaseItem[];
      notes?: string;
    }
  ) => void;
  removePurchaseOrderItem: (orderId: string, itemIndex: number) => void;
  receivePurchaseOrder: (orderId: string, receivedItems?: PurchaseItem[]) => void;
  updatePurchaseOrderStatus: (orderId: string, status: PurchaseOrderStatus) => void;
  recordPurchasePayment: (orderId: string, amount: number) => void;
  deletePurchaseOrder: (orderId: string, revertStock?: boolean) => void;

  // Goals
  salesRepGoals: SalesRepGoal[];
  updateSalesRepGoal: (goal: SalesRepGoal) => void;

  // Utilities
  resetToDefaults: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY_PREFIX = 'silvares_stocks_v1_';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation & session
  const [activeTab, setActiveTabState] = useState<MainTab>('menu');
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>('profile');

  const [organization, setOrganization] = useState<Organization>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}organization`);
    if (saved) {
      const parsed = JSON.parse(saved) as Organization;
      return {
        ...parsed,
        holdInvoiceSettings: {
          ...DEFAULT_HOLD_INVOICE_SETTINGS,
          ...(parsed.holdInvoiceSettings || {}),
        },
      };
    }
    return INITIAL_ORGANIZATION;
  });

  const [currency, setCurrency] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}organization`);
    if (saved) {
      const parsed = JSON.parse(saved) as Organization;
      return parsed.defaultCurrency || 'XOF';
    }
    return INITIAL_ORGANIZATION.defaultCurrency;
  });

  const [boutiques, setBoutiques] = useState<Boutique[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}boutiques`);
    return saved ? JSON.parse(saved) : INITIAL_BOUTIQUES;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}users`);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [selectedBoutiqueId, setSelectedBoutiqueId] = useState<string>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}boutiques`);
    if (saved) {
      const parsed = JSON.parse(saved) as Boutique[];
      return parsed[0]?.id || 'b1';
    }
    return 'b1';
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const savedAuth = localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_user_id`);
    return Boolean(savedAuth);
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const savedAuth = localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_user_id`);
    return savedAuth || 'u1';
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}products`);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}sales`);
    return saved ? JSON.parse(saved) : INITIAL_SALES;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}expenses`);
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}customers`);
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [shiftClosures, setShiftClosures] = useState<ShiftClosure[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}shift_closures`);
    return saved ? JSON.parse(saved) : INITIAL_SHIFT_CLOSURES;
  });

  const [salesRepGoals, setSalesRepGoals] = useState<SalesRepGoal[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}sales_rep_goals`);
    return saved ? JSON.parse(saved) : INITIAL_SALES_REP_GOALS;
  });

  const [transferNotes, setTransferNotes] = useState<TransferNote[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}transfer_notes`);
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 'tr-01',
            transferNumber: 'TRF-2026-001',
            sourceBoutiqueId: 'b3',
            destinationBoutiqueId: 'b1',
            date: '2026-11-09T08:00:00Z',
            status: 'RECU',
            items: [
              { productId: 'p1', productName: 'Huile Végétale Dinor 1L', quantity: 30 },
              { productId: 'p4', productName: 'Eau Minérale Kirène 1.5L (Pack 6)', quantity: 20 },
            ],
            notes: 'Réapprovisionnement début de semaine',
            createdBy: 'Ousmane Fall',
          },
        ];
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}suppliers`);
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}purchase_orders`);
    return saved ? JSON.parse(saved) : INITIAL_PURCHASE_ORDERS;
  });

  const [heldInvoices, setHeldInvoices] = useState<HeldInvoice[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}held_invoices`);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as HeldInvoice[];
    const now = Date.now();
    return parsed.filter((h) => !h.expiresAt || new Date(h.expiresAt).getTime() > now);
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}organization`, JSON.stringify(organization));
  }, [organization]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}boutiques`, JSON.stringify(boutiques));
  }, [boutiques]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}auth_user_id`, currentUserId);
    } else {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}auth_user_id`);
    }
  }, [isAuthenticated, currentUserId]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}products`, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}sales`, JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}expenses`, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}customers`, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}shift_closures`, JSON.stringify(shiftClosures));
  }, [shiftClosures]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}sales_rep_goals`, JSON.stringify(salesRepGoals));
  }, [salesRepGoals]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}transfer_notes`, JSON.stringify(transferNotes));
  }, [transferNotes]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}suppliers`, JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}purchase_orders`, JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}held_invoices`, JSON.stringify(heldInvoices));
  }, [heldInvoices]);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];
  const currentBoutique = boutiques.find((b) => b.id === selectedBoutiqueId) || null;

  const canAccessTab = (tab: MainTab): boolean => {
    return isTabAllowedForRole(tab, currentUser.role);
  };

  const setActiveTab = (tab: MainTab) => {
    if (!isTabAllowedForRole(tab, currentUser.role)) {
      setActiveTabState('menu');
      return;
    }
    setActiveTabState(tab);
  };

  useEffect(() => {
    if (!isTabAllowedForRole(activeTab, currentUser.role)) {
      setActiveTabState('menu');
    }
  }, [currentUser.role, activeTab]);

  useEffect(() => {
    if (
      currentUser.role === 'VENDEUR' &&
      currentUser.boutiqueId !== 'all' &&
      selectedBoutiqueId !== currentUser.boutiqueId &&
      boutiques.some((b) => b.id === currentUser.boutiqueId)
    ) {
      setSelectedBoutiqueId(currentUser.boutiqueId);
    }
  }, [currentUser.role, currentUser.boutiqueId, selectedBoutiqueId, boutiques]);

  const openAdminSection = (sub: AdminSubTab) => {
    if (currentUser.role === 'VENDEUR') {
      setActiveTabState('pos');
      return;
    }
    setAdminSubTab(sub);
    setActiveTabState('admin');
  };

  // Organization operations
  const updateOrganization = (updated: Organization) => {
    setOrganization(updated);
    setCurrency(updated.defaultCurrency);
  };

  const createOrganization = (payload: CreateOrganizationPayload) => {
    const newOrgId = `org-${Date.now()}`;
    const firstBoutiqueId = `b-${Date.now()}`;
    const adminUserId = `u-${Date.now()}`;

    const newOrg: Organization = {
      id: newOrgId,
      name: payload.orgName.trim(),
      tradeName: payload.tradeName.trim() || payload.orgName.trim(),
      sector: payload.sector,
      country: payload.country.trim() || 'Sénégal',
      city: payload.city.trim() || 'Dakar',
      address: payload.address.trim() || 'Adresse principale',
      phone: payload.phone.trim(),
      email: payload.email.trim() || payload.adminEmail.trim(),
      taxId: payload.taxId.trim() || 'N/A',
      tradeRegister: 'EN COURS',
      defaultCurrency: payload.defaultCurrency,
      defaultVatRate: payload.defaultVatRate,
      receiptFooter: `Merci pour votre confiance · ${payload.tradeName.trim() || payload.orgName.trim()}`,
      allowNegativeStock: false,
      loginSettings: {
        allowEmailPassword: true,
        allowPinLogin: true,
        showQuickDemoProfiles: true,
        requirePinForReturns: true,
        welcomeTitle: payload.tradeName.trim() || payload.orgName.trim(),
        welcomeSubtitle: 'Portail unifié de caisse, gestion des stocks et pilotage multi-boutiques.',
        sessionTimeoutMinutes: 480,
      },
      holdInvoiceSettings: DEFAULT_HOLD_INVOICE_SETTINGS,
      createdAt: new Date().toISOString(),
    };

    const firstBoutique: Boutique = {
      id: firstBoutiqueId,
      name: payload.boutiqueName.trim() || `Boutique Principale ${payload.city}`,
      code: payload.boutiqueCode.trim().toUpperCase() || 'POS-01',
      address: payload.address.trim() || payload.city,
      city: payload.city.trim() || 'Dakar',
      phone: payload.phone.trim(),
      managerName: payload.adminName.trim(),
    };

    const adminUser: User = {
      id: adminUserId,
      name: payload.adminName.trim(),
      email: payload.adminEmail.trim().toLowerCase(),
      role: 'DIRECTRICE',
      boutiqueId: 'all',
      phone: payload.adminPhone.trim(),
      jobTitle: 'Fondatrice / Directrice Générale',
      password: payload.adminPassword || 'admin',
      pinCode: payload.adminPin || '0000',
      isActive: true,
      lastLogin: new Date().toISOString(),
    };

    setOrganization(newOrg);
    setCurrency(newOrg.defaultCurrency);
    setBoutiques([firstBoutique]);
    setUsers([adminUser]);
    setSelectedBoutiqueId(firstBoutiqueId);
    setCurrentUserId(adminUserId);
    setIsAuthenticated(true);

    if (payload.includeSampleCatalog) {
      const remappedProducts = INITIAL_PRODUCTS.slice(0, 8).map((p) => ({
        ...p,
        vatRate: payload.defaultVatRate,
        stocks: [{ boutiqueId: firstBoutiqueId, quantity: p.stocks[0]?.quantity ?? 15 }],
      }));
      setProducts(remappedProducts);
    } else {
      setProducts([]);
    }

    setSales([]);
    setExpenses([]);
    setShiftClosures([]);
    setTransferNotes([]);
    setPurchaseOrders([]);
    setHeldInvoices([]);
    setSalesRepGoals([
      {
        sellerId: adminUserId,
        sellerName: adminUser.name,
        boutiqueId: firstBoutiqueId,
        month: '2026-11',
        monthlyTarget: 1500000,
        commissionRate: 2.0,
      },
    ]);
    setActiveTab('pos');
  };

  // Auth methods
  const completeLoginForUser = (user: User) => {
    const nowIso = new Date().toISOString();
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, lastLogin: nowIso } : u)));
    setCurrentUserId(user.id);
    if (user.boutiqueId !== 'all' && boutiques.some((b) => b.id === user.boutiqueId)) {
      setSelectedBoutiqueId(user.boutiqueId);
    } else if (boutiques.length > 0) {
      setSelectedBoutiqueId(user.role === 'DIRECTRICE' || user.role === 'COMPTABLE' ? 'all' : boutiques[0].id);
    }
    setIsAuthenticated(true);
    setActiveTabState('menu');
  };

  const loginWithEmail = (email: string, password: string): { ok: boolean; error?: string } => {
    const normalizedEmail = email.trim().toLowerCase();
    const matched = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!matched) {
      return { ok: false, error: 'Aucun compte utilisateur trouvé avec cet e-mail.' };
    }
    if (!matched.isActive) {
      return {
        ok: false,
        error: 'Ce profil utilisateur est suspendu. Contactez votre Direction.',
      };
    }
    if ((matched.password || 'admin') !== password) {
      return { ok: false, error: 'Mot de passe incorrect.' };
    }
    completeLoginForUser(matched);
    return { ok: true };
  };

  const loginWithPin = (pin: string, userId?: string): { ok: boolean; error?: string } => {
    const matched = userId
      ? users.find((u) => u.id === userId && u.pinCode === pin)
      : users.find((u) => u.pinCode === pin);

    if (!matched) {
      return { ok: false, error: 'Code PIN invalide pour cet utilisateur.' };
    }
    if (!matched.isActive) {
      return {
        ok: false,
        error: 'Ce profil utilisateur est suspendu. Contactez votre Direction.',
      };
    }
    completeLoginForUser(matched);
    return { ok: true };
  };

  const switchUserWithPassword = (
    userId: string,
    password: string
  ): { ok: boolean; error?: string } => {
    const matched = users.find((u) => u.id === userId);
    if (!matched) {
      return { ok: false, error: 'Profil utilisateur introuvable.' };
    }
    if (!matched.isActive) {
      return {
        ok: false,
        error: 'Ce profil utilisateur est actuellement désactivé.',
      };
    }
    if ((matched.password || 'admin') !== password) {
      return {
        ok: false,
        error: 'Mot de passe incorrect pour ce profil.',
      };
    }
    completeLoginForUser(matched);
    return { ok: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  // Boutique CRUD
  const addBoutique = (data: Omit<Boutique, 'id'>): Boutique => {
    const newB: Boutique = {
      ...data,
      id: `b-${Date.now()}`,
    };
    setBoutiques((prev) => [...prev, newB]);
    return newB;
  };

  const updateBoutique = (updated: Boutique) => {
    setBoutiques((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const deleteBoutique = (id: string): { ok: boolean; error?: string } => {
    if (boutiques.length <= 1) {
      return { ok: false, error: 'Impossible de supprimer la dernière boutique active.' };
    }
    setBoutiques((prev) => prev.filter((b) => b.id !== id));
    if (selectedBoutiqueId === id) {
      const remaining = boutiques.find((b) => b.id !== id);
      setSelectedBoutiqueId(remaining ? remaining.id : 'all');
    }
    return { ok: true };
  };

  // User Profile CRUD
  const addUser = (data: Omit<User, 'id'>): User => {
    const newUser: User = {
      ...data,
      id: `u-${Date.now()}`,
    };
    setUsers((prev) => [...prev, newUser]);
    return newUser;
  };

  const updateUser = (updated: User) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  const toggleUserActive = (id: string) => {
    if (id === currentUser.id) return; // guard against self-suspension
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u))
    );
  };

  const deleteUser = (id: string): { ok: boolean; error?: string } => {
    if (id === currentUser.id) {
      return { ok: false, error: 'Vous ne pouvez pas supprimer votre propre profil connecté.' };
    }
    if (users.length <= 1) {
      return { ok: false, error: 'Il doit rester au moins un utilisateur dans l’organisation.' };
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    return { ok: true };
  };

  // Currency Converter & Formatter
  const formatMoney = (amountInXOF: number): string => {
    const rounded = Math.round(amountInXOF);
    switch (currency) {
      case 'EUR': {
        const eur = amountInXOF / 655.957;
        return `${eur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
      }
      case 'USD': {
        const usd = amountInXOF / 600;
        return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      case 'GNF': {
        const gnf = amountInXOF * 14.5;
        return `${Math.round(gnf).toLocaleString('fr-FR')} GNF`;
      }
      case 'XOF':
      default:
        return `${rounded.toLocaleString('fr-FR')} FCFA`;
    }
  };

  const getProductStockInBoutique = (productId: string, boutiqueId: string): number => {
    const p = products.find((prod) => prod.id === productId);
    if (!p) return 0;
    if (boutiqueId === 'all') {
      return p.stocks.reduce((acc, curr) => acc + curr.quantity, 0);
    }
    const item = p.stocks.find((s) => s.boutiqueId === boutiqueId);
    return item ? item.quantity : 0;
  };

  // Product CRUD
  const addProduct = (data: Omit<Product, 'id'>): Product => {
    const newProduct: Product = {
      ...data,
      id: `p-${Date.now()}`,
    };
    setProducts((prev) => [newProduct, ...prev]);
    return newProduct;
  };

  const updateProduct = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Stock Adjustment / Reception / Loss
  const recordStockAdjustment = (data: {
    productId: string;
    boutiqueId: string;
    type: 'RECEPTION_FOURNISSEUR' | 'CASSE_PERTE' | 'AJUSTEMENT_INVENTAIRE';
    quantity: number;
    unitCost?: number;
    reference: string;
    reason?: string;
  }) => {
    const prod = products.find((p) => p.id === data.productId);
    if (!prod) return;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== data.productId) return p;

        let newPurchasePrice = p.purchasePrice;
        if (data.type === 'RECEPTION_FOURNISSEUR' && data.unitCost && data.unitCost > 0) {
          const currentTotalStock = p.stocks.reduce((sum, s) => sum + s.quantity, 0);
          const currentValuation = currentTotalStock * p.purchasePrice;
          const incomingValuation = data.quantity * data.unitCost;
          const totalNewStock = currentTotalStock + data.quantity;
          newPurchasePrice =
            totalNewStock > 0
              ? Math.round((currentValuation + incomingValuation) / totalNewStock)
              : data.unitCost;
        }

        const newStocks = p.stocks.map((s) => {
          if (s.boutiqueId === data.boutiqueId) {
            let nextQty = s.quantity;
            if (data.type === 'RECEPTION_FOURNISSEUR') nextQty += data.quantity;
            else if (data.type === 'CASSE_PERTE') nextQty = Math.max(0, nextQty - data.quantity);
            else if (data.type === 'AJUSTEMENT_INVENTAIRE') nextQty = data.quantity;
            return { ...s, quantity: nextQty };
          }
          return s;
        });

        if (!newStocks.some((s) => s.boutiqueId === data.boutiqueId)) {
          let initQty = 0;
          if (data.type === 'RECEPTION_FOURNISSEUR') initQty = data.quantity;
          else if (data.type === 'AJUSTEMENT_INVENTAIRE') initQty = data.quantity;
          newStocks.push({ boutiqueId: data.boutiqueId, quantity: initQty });
        }

        return {
          ...p,
          purchasePrice: newPurchasePrice,
          stocks: newStocks,
        };
      })
    );

    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      productId: data.productId,
      productName: prod.name,
      boutiqueId: data.boutiqueId,
      type: data.type,
      quantity: data.quantity,
      unitCost: data.unitCost || prod.purchasePrice,
      date: new Date().toISOString(),
      reference: data.reference || 'AJUST-MANUEL',
      userName: currentUser.name,
    };
    setStockMovements((prev) => [movement, ...prev]);
  };

  // Inter-boutique stock transfer
  const transferStock = (
    sourceId: string,
    destId: string,
    items: { productId: string; quantity: number }[],
    notes?: string
  ): TransferNote => {
    setProducts((prev) =>
      prev.map((prod) => {
        const transferItem = items.find((i) => i.productId === prod.id);
        if (!transferItem) return prod;

        const newStocks = prod.stocks.map((s) => {
          if (s.boutiqueId === sourceId) {
            return { ...s, quantity: Math.max(0, s.quantity - transferItem.quantity) };
          }
          if (s.boutiqueId === destId) {
            return { ...s, quantity: s.quantity + transferItem.quantity };
          }
          return s;
        });

        if (!newStocks.some((s) => s.boutiqueId === destId)) {
          newStocks.push({ boutiqueId: destId, quantity: transferItem.quantity });
        }

        return { ...prod, stocks: newStocks };
      })
    );

    const noteNumber = `TRF-${new Date().getFullYear()}-${String(transferNotes.length + 1).padStart(3, '0')}`;
    const newNote: TransferNote = {
      id: `tr-${Date.now()}`,
      transferNumber: noteNumber,
      sourceBoutiqueId: sourceId,
      destinationBoutiqueId: destId,
      date: new Date().toISOString(),
      status: 'RECU',
      items: items.map((i) => {
        const p = products.find((pr) => pr.id === i.productId);
        return {
          productId: i.productId,
          productName: p ? p.name : 'Produit',
          quantity: i.quantity,
        };
      }),
      notes,
      createdBy: currentUser.name,
    };

    setTransferNotes((prev) => [newNote, ...prev]);
    return newNote;
  };

  // Record Sale & Update Stock (supports negative quantities for per-product returns)
  const recordSale = (saleData: Omit<Sale, 'id' | 'ticketNumber' | 'date' | 'status'>): Sale => {
    const ticketSeq = sales.length + 1;
    const ticketNumber = `TKT-${new Date().getFullYear()}-${String(ticketSeq).padStart(3, '0')}`;
    const nowIso = new Date().toISOString();

    const newSale: Sale = {
      ...saleData,
      id: `s-${Date.now()}`,
      ticketNumber,
      date: nowIso,
      status: 'COMPLETED',
    };

    setProducts((prev) =>
      prev.map((prod) => {
        const netSoldQty = saleData.items
          .filter((i) => i.productId === prod.id)
          .reduce((sum, i) => sum + i.quantity, 0);
        if (netSoldQty === 0) return prod;

        const hasBoutique = prod.stocks.some((s) => s.boutiqueId === saleData.boutiqueId);
        const newStocks = hasBoutique
          ? prod.stocks.map((s) => {
              if (s.boutiqueId === saleData.boutiqueId) {
                return { ...s, quantity: Math.max(0, s.quantity - netSoldQty) };
              }
              return s;
            })
          : [
              ...prod.stocks,
              { boutiqueId: saleData.boutiqueId, quantity: Math.max(0, -netSoldQty) },
            ];

        return { ...prod, stocks: newStocks };
      })
    );

    // Log stock movements for returned items (negative quantity in sale)
    const returnedLines = saleData.items.filter((i) => i.quantity < 0);
    if (returnedLines.length > 0) {
      const returnMovements: StockMovement[] = returnedLines.map((item, idx) => ({
        id: `mov-ret-${Date.now()}-${idx}`,
        productId: item.productId,
        productName: item.productName,
        boutiqueId: saleData.boutiqueId,
        type: 'RETOUR_CLIENT',
        quantity: Math.abs(item.quantity),
        unitCost: item.purchasePrice,
        date: nowIso,
        reference: ticketNumber,
        userName: currentUser.name,
      }));
      setStockMovements((prev) => [...returnMovements, ...prev]);
    }

    const creditPayment = saleData.payments.find((p) => p.method === 'CREDIT_CLIENT');
    if (creditPayment && saleData.customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === saleData.customerId) {
            return { ...c, currentDebt: Math.max(0, c.currentDebt + creditPayment.amount) };
          }
          return c;
        })
      );
    }

    setSales((prev) => [newSale, ...prev]);
    return newSale;
  };

  // Held Invoices (Mise en attente des factures)
  const holdInvoiceSettings: HoldInvoiceSettings = {
    ...DEFAULT_HOLD_INVOICE_SETTINGS,
    ...(organization.holdInvoiceSettings || {}),
  };

  const activeHeldInvoices = heldInvoices.filter(
    (h) => !h.expiresAt || new Date(h.expiresAt).getTime() > Date.now()
  );

  const holdCurrentCart: AppContextType['holdCurrentCart'] = (payload) => {
    if (!holdInvoiceSettings.enabled) {
      return {
        ok: false,
        error: 'La mise en attente des factures est désactivée dans les paramètres de l’organisation.',
      };
    }

    if (
      holdInvoiceSettings.requireReferenceOrCustomer &&
      !payload.customerId &&
      !payload.referenceNote.trim()
    ) {
      return {
        ok: false,
        error: 'Veuillez sélectionner un client ou saisir un libellé/référence avant la mise en attente.',
      };
    }

    const currentBoutiqueCount = activeHeldInvoices.filter(
      (h) => h.boutiqueId === payload.boutiqueId
    ).length;

    if (currentBoutiqueCount >= holdInvoiceSettings.maxHeldPerBoutique) {
      return {
        ok: false,
        error: `Plafond atteint (${holdInvoiceSettings.maxHeldPerBoutique} factures en attente max pour cette boutique). Reprenez ou supprimez une facture en attente.`,
      };
    }

    const now = new Date();
    const holdSeq = heldInvoices.length + 1;
    const holdNumber = `ATT-${now.getFullYear()}-${String(holdSeq).padStart(3, '0')}`;
    const expiresAt =
      holdInvoiceSettings.autoExpireHours > 0
        ? new Date(now.getTime() + holdInvoiceSettings.autoExpireHours * 3600 * 1000).toISOString()
        : undefined;

    const newHeld: HeldInvoice = {
      id: `hold-${Date.now()}`,
      holdNumber,
      boutiqueId: payload.boutiqueId,
      sellerId: currentUser.id,
      sellerName: currentUser.name,
      customerId: payload.customerId,
      customerName: payload.customerName,
      referenceNote: payload.referenceNote.trim(),
      items: payload.items,
      total: payload.total,
      createdAt: now.toISOString(),
      expiresAt,
    };

    setHeldInvoices((prev) => [
      newHeld,
      ...prev.filter((h) => !h.expiresAt || new Date(h.expiresAt).getTime() > Date.now()),
    ]);
    return { ok: true, held: newHeld };
  };

  const removeHeldInvoice = (id: string) => {
    setHeldInvoices((prev) => prev.filter((h) => h.id !== id));
  };

  const getReservedStockInBoutique = (productId: string, boutiqueId: string): number => {
    if (!holdInvoiceSettings.reserveStockOnHold) return 0;
    return activeHeldInvoices
      .filter((h) => boutiqueId === 'all' || h.boutiqueId === boutiqueId)
      .reduce((sum, h) => {
        const lineQty = h.items
          .filter((i) => i.productId === productId && i.quantity > 0)
          .reduce((q, i) => q + i.quantity, 0);
        return sum + lineQty;
      }, 0);
  };

  // Process Return & Restore Stock (supports full ticket or per-product partial returns)
  const processReturn = (
    saleId: string,
    reason: string,
    returnedQuantities?: Record<string, number>
  ) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale || sale.status === 'RETURNED') return;

    const effectiveReturnQty = (productId: string, maxQty: number): number => {
      if (!returnedQuantities) return Math.max(0, maxQty);
      const requested = returnedQuantities[productId] ?? 0;
      return Math.min(Math.max(0, maxQty), Math.max(0, requested));
    };

    const itemsToReturn = sale.items
      .map((item) => ({
        item,
        retQty: effectiveReturnQty(item.productId, item.quantity),
      }))
      .filter((entry) => entry.retQty > 0);

    if (itemsToReturn.length === 0) return;

    const isFullReturn =
      !returnedQuantities ||
      sale.items.every(
        (item) => item.quantity <= 0 || effectiveReturnQty(item.productId, item.quantity) === item.quantity
      );

    // Restore returned quantities to boutique stock
    setProducts((prev) =>
      prev.map((prod) => {
        const totalRet = itemsToReturn
          .filter((e) => e.item.productId === prod.id)
          .reduce((sum, e) => sum + e.retQty, 0);
        if (totalRet <= 0) return prod;

        const hasBoutique = prod.stocks.some((s) => s.boutiqueId === sale.boutiqueId);
        const newStocks = hasBoutique
          ? prod.stocks.map((s) =>
              s.boutiqueId === sale.boutiqueId
                ? { ...s, quantity: s.quantity + totalRet }
                : s
            )
          : [...prod.stocks, { boutiqueId: sale.boutiqueId, quantity: totalRet }];

        return { ...prod, stocks: newStocks };
      })
    );

    const nowIso = new Date().toISOString();
    const returnMovements: StockMovement[] = itemsToReturn.map(({ item, retQty }, idx) => ({
      id: `mov-ret-${Date.now()}-${idx}`,
      productId: item.productId,
      productName: item.productName,
      boutiqueId: sale.boutiqueId,
      type: 'RETOUR_CLIENT',
      quantity: retQty,
      unitCost: item.purchasePrice,
      date: nowIso,
      reference: sale.ticketNumber,
      userName: currentUser.name,
    }));
    setStockMovements((prev) => [...returnMovements, ...prev]);

    if (isFullReturn) {
      const creditPayment = sale.payments.find((p) => p.method === 'CREDIT_CLIENT');
      if (creditPayment && sale.customerId) {
        setCustomers((prev) =>
          prev.map((c) => {
            if (c.id === sale.customerId) {
              return { ...c, currentDebt: Math.max(0, c.currentDebt - creditPayment.amount) };
            }
            return c;
          })
        );
      }

      setSales((prev) =>
        prev.map((s) =>
          s.id === saleId
            ? {
                ...s,
                status: 'RETURNED',
                returnReason: reason,
                returnedAt: nowIso,
              }
            : s
        )
      );
      return;
    }

    // Partial per-product return: record a negative-quantity return ticket
    const negativeItems = itemsToReturn.map(({ item, retQty }) => {
      const unitNet = item.quantity > 0 ? item.total / item.quantity : item.unitPrice;
      const negTotal = -Math.round(unitNet * retQty);
      return {
        ...item,
        quantity: -retQty,
        total: negTotal,
      };
    });

    const refundSubtotal = -itemsToReturn.reduce(
      (sum, { item, retQty }) => sum + item.unitPrice * retQty,
      0
    );
    const refundTotal = negativeItems.reduce((sum, i) => sum + i.total, 0);
    const refundDiscount = Math.max(0, Math.abs(refundSubtotal) - Math.abs(refundTotal));
    const refundMethod = sale.payments[0]?.method || 'ESPECES';
    const ticketSeq = sales.length + 1;
    const returnTicketNumber = `TKT-${new Date().getFullYear()}-${String(ticketSeq).padStart(3, '0')}`;

    if (refundMethod === 'CREDIT_CLIENT' && sale.customerId) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === sale.customerId
            ? { ...c, currentDebt: Math.max(0, c.currentDebt + refundTotal) }
            : c
        )
      );
    }

    const partialReturnSale: Sale = {
      id: `s-${Date.now()}`,
      ticketNumber: returnTicketNumber,
      boutiqueId: sale.boutiqueId,
      sellerId: currentUser.id,
      sellerName: currentUser.name,
      customerId: sale.customerId,
      customerName: sale.customerName,
      date: nowIso,
      items: negativeItems,
      subtotal: refundSubtotal,
      discountAmount: -refundDiscount,
      vatAmount: Math.round((refundTotal * 18) / 118),
      total: refundTotal,
      payments: [{ method: refundMethod, amount: refundTotal, reference: `RET-${sale.ticketNumber}` }],
      amountPaid: refundTotal,
      changeReturned: 0,
      status: 'COMPLETED',
      returnReason: `${reason} (Sur ${sale.ticketNumber})`,
      returnedAt: nowIso,
    };

    setSales((prev) => [partialReturnSale, ...prev]);
  };

  // Customers
  const addCustomer = (customerData: Omit<Customer, 'id' | 'currentDebt'>): Customer => {
    const newCustomer: Customer = {
      ...customerData,
      id: `c-${Date.now()}`,
      currentDebt: 0,
    };
    setCustomers((prev) => [...prev, newCustomer]);
    return newCustomer;
  };

  // Shift closures
  const recordShiftClosure = (closureData: Omit<ShiftClosure, 'id' | 'date'>): ShiftClosure => {
    const newClosure: ShiftClosure = {
      ...closureData,
      id: `cls-${Date.now()}`,
      date: new Date().toISOString(),
    };
    setShiftClosures((prev) => [newClosure, ...prev]);
    return newClosure;
  };

  // Expenses
  const addExpense = (expenseData: Omit<Expense, 'id' | 'reference' | 'status'>): Expense => {
    const refNum = `DEP-${new Date().getFullYear()}-${String(expenses.length + 1).padStart(3, '0')}`;
    const newExpense: Expense = {
      ...expenseData,
      paymentSource: expenseData.paymentSource || 'CAISSE',
      id: `exp-${Date.now()}`,
      reference: refNum,
      status: 'EN_ATTENTE',
    };
    setExpenses((prev) => [newExpense, ...prev]);
    return newExpense;
  };

  const updateExpenseStatus = (id: string, status: ExpenseStatus, approvedBy?: string) => {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          return {
            ...e,
            status,
            approvedBy: status === 'VALIDE' ? approvedBy || currentUser.name : e.approvedBy,
            approvedAt: status === 'VALIDE' ? new Date().toISOString().split('T')[0] : e.approvedAt,
          };
        }
        return e;
      })
    );
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const getCashRegisterSummary = (boutiqueId: string) => {
    const cashSales = sales
      .filter(
        (s) =>
          s.status === 'COMPLETED' &&
          (boutiqueId === 'all' || s.boutiqueId === boutiqueId)
      )
      .reduce(
        (sum, s) =>
          sum +
          s.payments
            .filter((p) => p.method === 'ESPECES')
            .reduce((pSum, p) => pSum + p.amount, 0),
        0
      );

    const cashExpenseItems = expenses.filter(
      (e) =>
        (boutiqueId === 'all' || e.boutiqueId === boutiqueId) &&
        (e.paymentSource ?? 'CAISSE') === 'CAISSE' &&
        (e.status === 'VALIDE' || e.status === 'EN_ATTENTE')
    );

    const cashExpenses = cashExpenseItems.reduce((sum, e) => sum + e.amount, 0);

    return {
      cashSales,
      cashExpenses,
      netCash: cashSales - cashExpenses,
      cashExpenseItems,
    };
  };

  const updateSalesRepGoal = (goal: SalesRepGoal) => {
    setSalesRepGoals((prev) => {
      const idx = prev.findIndex((g) => g.sellerId === goal.sellerId && g.month === goal.month);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = goal;
        return copy;
      }
      return [...prev, goal];
    });
  };

  // Suppliers & Purchase Orders
  const addSupplier = (data: Omit<Supplier, 'id'>): Supplier => {
    const newSupplier: Supplier = {
      ...data,
      id: `sup-${Date.now()}`,
    };
    setSuppliers((prev) => [newSupplier, ...prev]);
    return newSupplier;
  };

  const updateSupplier = (updated: Supplier) => {
    setSuppliers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const deleteSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  };

  const applyPurchaseItemsToStock = (
    items: PurchaseItem[],
    boutiqueId: string,
    reference: string
  ) => {
    setProducts((prev) =>
      prev.map((p) => {
        const receivedItem = items.find((i) => i.productId === p.id);
        if (!receivedItem) return p;

        // Weighted average cost (CUMP)
        const currentTotalStock = p.stocks.reduce((sum, s) => sum + s.quantity, 0);
        const currentValuation = currentTotalStock * p.purchasePrice;
        const incomingValuation = receivedItem.quantity * receivedItem.unitCost;
        const totalNewStock = currentTotalStock + receivedItem.quantity;
        const nextPurchasePrice =
          totalNewStock > 0 && receivedItem.unitCost > 0
            ? Math.round((currentValuation + incomingValuation) / totalNewStock)
            : p.purchasePrice;

        const hasBoutique = p.stocks.some((s) => s.boutiqueId === boutiqueId);
        const newStocks = hasBoutique
          ? p.stocks.map((s) =>
              s.boutiqueId === boutiqueId
                ? { ...s, quantity: s.quantity + receivedItem.quantity }
                : s
            )
          : [...p.stocks, { boutiqueId, quantity: receivedItem.quantity }];

        return {
          ...p,
          purchasePrice: nextPurchasePrice,
          stocks: newStocks,
        };
      })
    );

    const nowIso = new Date().toISOString();
    const newMovements: StockMovement[] = items.map((item, idx) => ({
      id: `mov-ach-${Date.now()}-${idx}`,
      productId: item.productId,
      productName: item.productName,
      boutiqueId,
      type: 'RECEPTION_FOURNISSEUR',
      quantity: item.quantity,
      unitCost: item.unitCost,
      date: nowIso,
      reference,
      userName: currentUser.name,
    }));
    setStockMovements((prev) => [...newMovements, ...prev]);
  };

  const createPurchaseOrder = (data: {
    supplierId: string;
    boutiqueId: string;
    expectedDate?: string;
    items: PurchaseItem[];
    notes?: string;
    initialStatus?: 'BROUILLON' | 'COMMANDE' | 'RECU';
    initialAmountPaid?: number;
  }): PurchaseOrder => {
    const supplier = suppliers.find((s) => s.id === data.supplierId);
    const subtotalHT = Math.round(data.items.reduce((sum, item) => sum + item.total, 0));
    const vatAmount = Math.round(
      data.items.reduce((sum, item) => sum + (item.total * item.vatRate) / 100, 0)
    );
    const totalTTC = subtotalHT + vatAmount;
    const status: PurchaseOrderStatus = data.initialStatus || 'COMMANDE';
    const amountPaid = Math.min(totalTTC, Math.max(0, Math.round(data.initialAmountPaid || 0)));
    const paymentStatus =
      amountPaid >= totalTTC && totalTTC > 0
        ? 'PAYE'
        : amountPaid > 0
        ? 'PARTIEL'
        : 'NON_PAYE';

    const seq = purchaseOrders.length + 1;
    const orderNumber = `ACH-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}`;
    const nowIso = new Date().toISOString();

    const newOrder: PurchaseOrder = {
      id: `po-${Date.now()}`,
      orderNumber,
      supplierId: data.supplierId,
      supplierName: supplier ? supplier.name : 'Fournisseur',
      boutiqueId: data.boutiqueId,
      date: nowIso,
      expectedDate: data.expectedDate,
      receivedAt: status === 'RECU' ? nowIso : undefined,
      status,
      paymentStatus,
      amountPaid,
      items: data.items,
      subtotalHT,
      vatAmount,
      totalTTC,
      notes: data.notes,
      createdBy: currentUser.name,
      receivedBy: status === 'RECU' ? currentUser.name : undefined,
    };

    if (status === 'RECU') {
      applyPurchaseItemsToStock(data.items, data.boutiqueId, orderNumber);
    }

    setPurchaseOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const updatePurchaseOrder = (
    orderId: string,
    data: {
      supplierId: string;
      boutiqueId: string;
      expectedDate?: string;
      items: PurchaseItem[];
      notes?: string;
    }
  ) => {
    const supplier = suppliers.find((s) => s.id === data.supplierId);
    const subtotalHT = Math.round(data.items.reduce((sum, item) => sum + item.total, 0));
    const vatAmount = Math.round(
      data.items.reduce((sum, item) => sum + (item.total * item.vatRate) / 100, 0)
    );
    const totalTTC = subtotalHT + vatAmount;

    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.id !== orderId) return po;
        const cappedPaid = Math.min(totalTTC, po.amountPaid);
        const paymentStatus =
          cappedPaid >= totalTTC && totalTTC > 0
            ? 'PAYE'
            : cappedPaid > 0
            ? 'PARTIEL'
            : 'NON_PAYE';
        return {
          ...po,
          supplierId: data.supplierId,
          supplierName: supplier ? supplier.name : po.supplierName,
          boutiqueId: data.boutiqueId,
          expectedDate: data.expectedDate,
          items: data.items,
          notes: data.notes,
          subtotalHT,
          vatAmount,
          totalTTC,
          amountPaid: cappedPaid,
          paymentStatus,
        };
      })
    );
  };

  const removePurchaseOrderItem = (orderId: string, itemIndex: number) => {
    const order = purchaseOrders.find((po) => po.id === orderId);
    if (!order || order.status === 'RECU' || order.status === 'ANNULE') return;
    const nextItems = order.items.filter((_, idx) => idx !== itemIndex);
    if (nextItems.length === 0) {
      setPurchaseOrders((prev) => prev.filter((po) => po.id !== orderId));
      return;
    }
    updatePurchaseOrder(orderId, {
      supplierId: order.supplierId,
      boutiqueId: order.boutiqueId,
      expectedDate: order.expectedDate,
      items: nextItems,
      notes: order.notes,
    });
  };

  const receivePurchaseOrder = (orderId: string, receivedItems?: PurchaseItem[]) => {
    const order = purchaseOrders.find((po) => po.id === orderId);
    if (!order || order.status === 'RECU' || order.status === 'ANNULE') return;

    const finalItems = (receivedItems ?? order.items)
      .filter((item) => item.quantity > 0)
      .map((item) => ({
        ...item,
        total: Math.round(item.quantity * item.unitCost),
      }));

    if (finalItems.length === 0) return;

    applyPurchaseItemsToStock(finalItems, order.boutiqueId, order.orderNumber);

    const subtotalHT = Math.round(finalItems.reduce((sum, item) => sum + item.total, 0));
    const vatAmount = Math.round(
      finalItems.reduce((sum, item) => sum + (item.total * item.vatRate) / 100, 0)
    );
    const totalTTC = subtotalHT + vatAmount;
    const nowIso = new Date().toISOString();

    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.id !== orderId) return po;
        const cappedPaid = Math.min(totalTTC, po.amountPaid);
        const paymentStatus =
          cappedPaid >= totalTTC && totalTTC > 0
            ? 'PAYE'
            : cappedPaid > 0
            ? 'PARTIEL'
            : 'NON_PAYE';
        return {
          ...po,
          items: finalItems,
          subtotalHT,
          vatAmount,
          totalTTC,
          amountPaid: cappedPaid,
          paymentStatus,
          status: 'RECU',
          receivedAt: nowIso,
          receivedBy: currentUser.name,
        };
      })
    );
  };

  const updatePurchaseOrderStatus = (orderId: string, status: PurchaseOrderStatus) => {
    if (status === 'RECU') {
      receivePurchaseOrder(orderId);
      return;
    }
    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === orderId ? { ...po, status } : po))
    );
  };

  const recordPurchasePayment = (orderId: string, amount: number) => {
    if (amount <= 0) return;
    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.id !== orderId) return po;
        const nextPaid = Math.min(po.totalTTC, po.amountPaid + Math.round(amount));
        const paymentStatus =
          nextPaid >= po.totalTTC ? 'PAYE' : nextPaid > 0 ? 'PARTIEL' : 'NON_PAYE';
        return {
          ...po,
          amountPaid: nextPaid,
          paymentStatus,
        };
      })
    );
  };

  const deletePurchaseOrder = (orderId: string, revertStock = false) => {
    const order = purchaseOrders.find((po) => po.id === orderId);
    if (order && revertStock && order.status === 'RECU') {
      setProducts((prev) =>
        prev.map((p) => {
          const item = order.items.find((i) => i.productId === p.id);
          if (!item) return p;
          return {
            ...p,
            stocks: p.stocks.map((s) =>
              s.boutiqueId === order.boutiqueId
                ? { ...s, quantity: Math.max(0, s.quantity - item.quantity) }
                : s
            ),
          };
        })
      );
    }
    setPurchaseOrders((prev) => prev.filter((po) => po.id !== orderId));
  };

  const resetToDefaults = () => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}organization`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}boutiques`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}users`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}products`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}sales`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}expenses`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}customers`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}shift_closures`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}sales_rep_goals`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}transfer_notes`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}suppliers`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}purchase_orders`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}held_invoices`);

    setOrganization(INITIAL_ORGANIZATION);
    setCurrency(INITIAL_ORGANIZATION.defaultCurrency);
    setBoutiques(INITIAL_BOUTIQUES);
    setUsers(INITIAL_USERS);
    setSelectedBoutiqueId('b1');
    setCurrentUserId('u1');
    setProducts(INITIAL_PRODUCTS);
    setSales(INITIAL_SALES);
    setExpenses(INITIAL_EXPENSES);
    setCustomers(INITIAL_CUSTOMERS);
    setShiftClosures(INITIAL_SHIFT_CLOSURES);
    setSalesRepGoals(INITIAL_SALES_REP_GOALS);
    setSuppliers(INITIAL_SUPPLIERS);
    setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
    setHeldInvoices([]);
  };

  return (
    <AppContext.Provider
      value={{
        organization,
        updateOrganization,
        createOrganization,
        isAuthenticated,
        loginWithEmail,
        loginWithPin,
        switchUserWithPassword,
        logout,
        boutiques,
        selectedBoutiqueId,
        setSelectedBoutiqueId,
        currentBoutique,
        addBoutique,
        updateBoutique,
        deleteBoutique,
        users,
        currentUser,
        addUser,
        updateUser,
        toggleUserActive,
        deleteUser,
        currency,
        setCurrency,
        formatMoney,
        activeTab,
        setActiveTab,
        canAccessTab,
        adminSubTab,
        setAdminSubTab,
        openAdminSection,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        getProductStockInBoutique,
        recordStockAdjustment,
        transferStock,
        transferNotes,
        stockMovements,
        sales,
        recordSale,
        processReturn,
        customers,
        addCustomer,
        holdInvoiceSettings,
        heldInvoices: activeHeldInvoices,
        holdCurrentCart,
        removeHeldInvoice,
        getReservedStockInBoutique,
        shiftClosures,
        recordShiftClosure,
        expenses,
        addExpense,
        updateExpenseStatus,
        deleteExpense,
        getCashRegisterSummary,
        suppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        purchaseOrders,
        createPurchaseOrder,
        updatePurchaseOrder,
        removePurchaseOrderItem,
        receivePurchaseOrder,
        updatePurchaseOrderStatus,
        recordPurchasePayment,
        deletePurchaseOrder,
        salesRepGoals,
        updateSalesRepGoal,
        resetToDefaults,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
