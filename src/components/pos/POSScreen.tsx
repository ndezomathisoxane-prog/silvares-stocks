import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CartItem,
  Customer,
  ExpenseCategory,
  HeldInvoice,
  HeldInvoiceItem,
  PaymentDetail,
  PaymentMethod,
  Product,
  ProductCategory,
  Sale,
} from '../../types';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  RotateCcw,
  ShieldCheck,
  Check,
  Star,
  Tag,
  CreditCard,
  Banknote,
  Smartphone,
  Users,
  AlertCircle,
  Receipt,
  Clock,
  Pause,
  Play,
  Settings,
  X,
} from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';
import { ShiftClosureModal } from './ShiftClosureModal';
import { ReturnsModal } from './ReturnsModal';
import { RecentReceiptsPanel } from './RecentReceiptsPanel';

export const POSScreen: React.FC = () => {
  const {
    products,
    boutiques,
    selectedBoutiqueId,
    currentUser,
    formatMoney,
    recordSale,
    customers,
    addCustomer,
    getProductStockInBoutique,
    getCashRegisterSummary,
    addExpense,
    holdInvoiceSettings,
    heldInvoices,
    holdCurrentCart,
    removeHeldInvoice,
    getReservedStockInBoutique,
    openAdminSection,
    canAccessTab,
  } = useApp();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustMaxCredit, setNewCustMaxCredit] = useState(200000);

  // Checkout & Payment Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('ESPECES');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [paymentReference, setPaymentReference] = useState('');
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0);
  const [splitDigitalAmount, setSplitDigitalAmount] = useState<number>(0);

  // Sub-modals & Return mode
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showShiftClosure, setShowShiftClosure] = useState(false);
  const [showReturns, setShowReturns] = useState(false);
  const [showCashExpenseModal, setShowCashExpenseModal] = useState(false);
  const [cashExpCategory, setCashExpCategory] = useState<ExpenseCategory>('Transport & Logistique');
  const [cashExpDesc, setCashExpDesc] = useState('');
  const [cashExpAmount, setCashExpAmount] = useState<number>(2000);

  // Held invoices state
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdRefNote, setHoldRefNote] = useState('');
  const [holdError, setHoldError] = useState<string | null>(null);
  const [showHeldListModal, setShowHeldListModal] = useState(false);
  const [confirmReplaceHold, setConfirmReplaceHold] = useState<HeldInvoice | null>(null);
  const [posNotice, setPosNotice] = useState<string | null>(null);

  const cashSummary = getCashRegisterSummary(selectedBoutiqueId);
  const scopedHeldInvoices = heldInvoices.filter(
    (h) => selectedBoutiqueId === 'all' || h.boutiqueId === selectedBoutiqueId
  );

  // Categories list
  const categories: ProductCategory[] = [
    'Alimentation & Épicerie',
    'Boissons & Frais',
    'Hygiène & Entretien',
    'Mode & Textile',
    'Quincaillerie & Brico',
    'Électronique & Divers',
  ];

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (onlyFavorites && !p.isFavorite) return false;
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (!searchQuery) return true;

    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  // Barcode quick scan handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Search exact barcode or SKU first
    const matched = products.find(
      (p) =>
        p.barcode.toLowerCase() === searchQuery.toLowerCase().trim() ||
        p.sku.toLowerCase() === searchQuery.toLowerCase().trim()
    );

    if (matched) {
      addToCart(matched);
      setSearchQuery('');
    }
  };

  // Cart operations (supports negative quantities for per-product returns)
  const addToCart = (product: Product) => {
    const step = isReturnMode ? -1 : 1;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) => {
          if (item.product.id !== product.id) return item;
          let nextQty = item.quantity + step;
          if (nextQty === 0) nextQty = step;
          return { ...item, quantity: nextQty };
        });
      }
      return [...prev, { product, quantity: step, discountPercent: 0 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        let nextQty = item.quantity + delta;
        if (nextQty === 0) {
          nextQty = delta < 0 ? -1 : 1;
        }
        return { ...item, quantity: nextQty };
      })
    );
  };

  const setCartQtyDirect = (productId: string, rawQty: number) => {
    if (!Number.isFinite(rawQty) || rawQty === 0) return;
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: Math.trunc(rawQty) } : item
      )
    );
  };

  const toggleCartItemReturn = (productId: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: -item.quantity } : item
      )
    );
  };

  const updateCartItemDiscount = (productId: string, discount: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, discountPercent: Math.min(100, Math.max(0, discount)) }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
  };

  // Calculations (signed totals allow refunds / negative return lines)
  const hasReturnedItems = cart.some((item) => item.quantity < 0);

  const subtotal = Math.round(
    cart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0)
  );

  const discountAmount = Math.round(
    cart.reduce((sum, item) => {
      const lineDiscount =
        (item.product.sellingPrice * item.quantity * (item.discountPercent || 0)) / 100;
      return sum + lineDiscount;
    }, 0)
  );

  const total = subtotal - discountAmount;

  // Approximate VAT (18% for products having vatRate > 0)
  const vatAmount = Math.round(
    cart.reduce((sum, item) => {
      if (item.product.vatRate > 0) {
        const lineNet =
          item.product.sellingPrice * item.quantity * (1 - (item.discountPercent || 0) / 100);
        return sum + (lineNet * item.product.vatRate) / (100 + item.product.vatRate);
      }
      return sum;
    }, 0)
  );

  // Prepare payment modal
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setCashTendered(Math.max(0, total));
    setSplitCashAmount(Math.round(total / 2));
    setSplitDigitalAmount(total - Math.round(total / 2));
    setPaymentReference('');
    setShowPaymentModal(true);
  };

  // Validate and submit Sale / Return / Exchange
  const handleCompleteSale = () => {
    const saleItems = cart.map((item) => {
      const lineDisc = item.discountPercent || 0;
      const lineTotal = item.product.sellingPrice * item.quantity * (1 - lineDisc / 100);
      return {
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        unitPrice: item.product.sellingPrice,
        purchasePrice: item.product.purchasePrice,
        quantity: item.quantity,
        discountPercent: lineDisc,
        total: Math.round(lineTotal),
      };
    });

    let payments: PaymentDetail[] = [];
    let paid = total;
    let change = 0;

    if (total <= 0) {
      payments = [
        {
          method: selectedMethod === 'MIXTE' ? 'ESPECES' : selectedMethod,
          amount: total,
          reference: paymentReference || (hasReturnedItems ? 'RETOUR-CAISSE' : undefined),
        },
      ];
      paid = total;
      change = 0;
    } else if (selectedMethod === 'ESPECES') {
      paid = cashTendered;
      change = Math.max(0, cashTendered - total);
      payments = [{ method: 'ESPECES', amount: total }];
    } else if (selectedMethod === 'MIXTE') {
      payments = [
        { method: 'ESPECES', amount: splitCashAmount },
        { method: 'WAVE', amount: splitDigitalAmount, reference: paymentReference || 'WAVE-MIXTE' },
      ];
      paid = total;
      change = 0;
    } else {
      payments = [
        {
          method: selectedMethod,
          amount: total,
          reference: paymentReference || undefined,
        },
      ];
      paid = total;
      change = 0;
    }

    const newSale = recordSale({
      boutiqueId: selectedBoutiqueId === 'all' ? 'b1' : selectedBoutiqueId,
      sellerId: currentUser.id,
      sellerName: currentUser.name,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer ? selectedCustomer.name : 'Client Comptoir',
      items: saleItems,
      subtotal,
      discountAmount,
      vatAmount,
      total,
      payments,
      amountPaid: paid,
      changeReturned: change,
      returnReason: hasReturnedItems ? 'Retour produit en caisse (quantité négative)' : undefined,
    });

    setShowPaymentModal(false);
    clearCart();
    setIsReturnMode(false);
    setCompletedSale(newSale);
  };

  // Quick customer creation
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const created = addCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      maxCredit: newCustMaxCredit,
    });
    setSelectedCustomer(created);
    setShowNewCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
  };

  const handleSaveCashExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashExpDesc.trim() || cashExpAmount <= 0) return;
    addExpense({
      boutiqueId: selectedBoutiqueId === 'all' ? 'b1' : selectedBoutiqueId,
      category: cashExpCategory,
      description: cashExpDesc.trim(),
      amount: Number(cashExpAmount) || 0,
      date: new Date().toISOString().split('T')[0],
      paymentSource: 'CAISSE',
      requestedBy: currentUser.name,
    });
    setShowCashExpenseModal(false);
    setCashExpDesc('');
    setCashExpAmount(2000);
  };

  const triggerNotice = (msg: string) => {
    setPosNotice(msg);
    setTimeout(() => setPosNotice(null), 4000);
  };

  const handleOpenHoldModal = () => {
    if (cart.length === 0) return;
    setHoldError(null);
    setHoldRefNote(selectedCustomer ? `Client ${selectedCustomer.name}` : '');
    setShowHoldModal(true);
  };

  const handleConfirmHoldInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const heldItems: HeldInvoiceItem[] = cart.map((item) => {
      const disc = item.discountPercent || 0;
      const lineTotal = Math.round(item.product.sellingPrice * item.quantity * (1 - disc / 100));
      return {
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        unitPrice: item.product.sellingPrice,
        quantity: item.quantity,
        discountPercent: disc,
        total: lineTotal,
      };
    });

    const targetBoutiqueId =
      selectedBoutiqueId === 'all' ? boutiques[0]?.id || 'b1' : selectedBoutiqueId;

    const res = holdCurrentCart({
      boutiqueId: targetBoutiqueId,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      referenceNote: holdRefNote,
      items: heldItems,
      total,
    });

    if (!res.ok) {
      setHoldError(res.error || 'Impossible de mettre la facture en attente.');
      return;
    }

    setShowHoldModal(false);
    setHoldRefNote('');
    setHoldError(null);
    clearCart();
    setIsReturnMode(false);
    triggerNotice(`Facture ${res.held?.holdNumber || ''} mise en attente.`);
  };

  const handleResumeHeldInvoice = (held: HeldInvoice) => {
    if (cart.length > 0 && confirmReplaceHold?.id !== held.id) {
      setConfirmReplaceHold(held);
      return;
    }

    const restoredItems: CartItem[] = [];
    let missingCount = 0;

    held.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) {
        missingCount += 1;
        return;
      }
      restoredItems.push({
        product: prod,
        quantity: item.quantity,
        discountPercent: item.discountPercent || 0,
      });
    });

    setCart(restoredItems);
    const matchedCustomer = held.customerId
      ? customers.find((c) => c.id === held.customerId) || null
      : null;
    setSelectedCustomer(matchedCustomer);
    removeHeldInvoice(held.id);
    setConfirmReplaceHold(null);
    setShowHeldListModal(false);
    triggerNotice(
      missingCount > 0
        ? `Facture ${held.holdNumber} reprise (${missingCount} article(s) retiré(s) du catalogue).`
        : `Facture ${held.holdNumber} reprise en caisse.`
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Top action row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Comptoir de Vente & Caisse
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Encaissement tactile rapide, lecture code-barres et multi-paiements Mobile Money.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setConfirmReplaceHold(null);
              setShowHeldListModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors whitespace-nowrap"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Factures en attente ({scopedHeldInvoices.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              document.getElementById('recent-receipts-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
          >
            <Receipt className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tickets récents</span>
          </button>
          <button
            onClick={() => setShowReturns(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Retours & Tickets</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCashExpenseModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-medium text-rose-300 hover:text-rose-200 transition-colors whitespace-nowrap"
          >
            <Banknote className="w-3.5 h-3.5 text-rose-400" />
            <span>Dépense caisse</span>
          </button>
          <button
            onClick={() => setShowShiftClosure(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors whitespace-nowrap"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Clôture Caisse (X/Z)</span>
          </button>
        </div>
      </div>

      {posNotice && (
        <div className="mb-4 px-4 py-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{posNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setPosNotice(null)}
            className="text-emerald-400 hover:text-white p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Live Cash Register Balance Strip (Sales - Cash Expenses) */}
      <div className="mb-4 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
          <span className="font-sans font-semibold text-slate-300">Tiroir Caisse (Espèces)</span>
          <span className="text-slate-400">
            Ventes : <span className="text-emerald-400 font-semibold">+{formatMoney(cashSummary.cashSales)}</span>
          </span>
          <span className="text-slate-400">
            Dépenses déduites ({cashSummary.cashExpenseItems.length}) :{' '}
            <span className="text-rose-400 font-semibold">-{formatMoney(cashSummary.cashExpenses)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono tabular-nums">
          <span className="font-sans text-slate-400">Solde net espèces :</span>
          <span
            className={`font-extrabold text-sm ${
              cashSummary.netCash >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatMoney(cashSummary.netCash)}
          </span>
        </div>
      </div>

      {/* Main Grid: Products on Left (60-65%), Cart on Right (35-40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Section: Catalog & Search */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          
          {/* Search bar & Barcode douchette listener */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm">
            <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Rechercher produit, code-barres (ex: 604400012301) ou référence SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                />
                <button
                  type="submit"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400"
                  title="Scanner douchette (Entrée)"
                >
                  <Barcode className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsReturnMode(!isReturnMode)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                  isReturnMode
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                }`}
                title="Activer le mode retour pour ajouter des produits en quantité négative"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isReturnMode ? 'Mode Retour (- Qté) Actif' : 'Retour produit (-)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setOnlyFavorites(!onlyFavorites)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  onlyFavorites
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Filtrer les favoris"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Favoris</span>
              </button>
            </form>

            {isReturnMode && (
              <div className="mt-2.5 px-3 py-2 bg-amber-950/30 border border-amber-500/30 rounded-lg text-[11px] text-amber-300 flex items-center justify-between gap-2">
                <span>
                  Mode retour actif : cliquez sur un produit pour l&apos;ajouter au panier en quantité négative (-1) et le réintégrer au stock.
                </span>
                <button
                  type="button"
                  onClick={() => setIsReturnMode(false)}
                  className="font-semibold text-amber-200 hover:text-white whitespace-nowrap"
                >
                  Revenir en vente
                </button>
              </div>
            )}

            {/* Category Segmented Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-3 text-xs scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Tous ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat.split(' & ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const physicalStock = getProductStockInBoutique(product.id, selectedBoutiqueId);
              const reservedStock = holdInvoiceSettings.reserveStockOnHold
                ? getReservedStockInBoutique(product.id, selectedBoutiqueId)
                : 0;
              const currentStock = Math.max(0, physicalStock - reservedStock);
              const isLowStock = currentStock <= product.minThreshold && currentStock > 0;
              const isOutOfStock = currentStock <= 0;
              const isButtonDisabled = isOutOfStock && !isReturnMode;

              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={isButtonDisabled}
                  className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between group relative overflow-hidden ${
                    isButtonDisabled
                      ? 'bg-slate-900/40 border-slate-800/80 opacity-50 cursor-not-allowed'
                      : isReturnMode
                      ? 'bg-slate-900 border-amber-500/30 hover:border-amber-400 shadow-sm'
                      : 'bg-slate-900 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 shadow-sm'
                  }`}
                >
                  <div>
                    {/* Category & Favorite badge */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span className="truncate">{product.category.split(' & ')[0]}</span>
                      {product.isFavorite && (
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                      )}
                    </div>

                    {/* Product Name */}
                    <h3 className="text-xs font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                      {product.name}
                    </h3>
                  </div>

                  {/* Price & Stock info */}
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-end justify-between gap-1">
                    <div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {product.sku}
                      </div>
                      <div className="text-xs font-bold font-mono text-white tabular-nums">
                        {formatMoney(product.sellingPrice)}
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-medium ${
                          isOutOfStock
                            ? 'text-rose-400 bg-rose-950/40'
                            : isLowStock
                            ? 'text-amber-400 bg-amber-950/40'
                            : 'text-emerald-400 bg-emerald-950/40'
                        }`}
                      >
                        {isOutOfStock ? '0 en stock' : `${currentStock} ${product.unit}`}
                      </span>
                      {reservedStock > 0 && (
                        <div className="text-[9px] font-mono text-amber-400 mt-0.5 tabular-nums">
                          {reservedStock} en attente
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
              Aucun produit ne correspond à vos filtres.
            </div>
          )}

        </div>

        {/* Right Section: Interactive POS Cart (35-40%) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-slate-900 border border-slate-800 rounded-xl shadow-lg flex flex-col sticky top-20">
          
          {/* Cart Header & Customer Selector */}
          <div className="p-3.5 border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Panier ({cart.reduce((sum, i) => sum + i.quantity, 0)} articles)
              </span>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
                >
                  Vider le panier
                </button>
              )}
            </div>

            {/* Customer Picker */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  value={selectedCustomer ? selectedCustomer.id : 'anonymous'}
                  onChange={(e) => {
                    if (e.target.value === 'anonymous') setSelectedCustomer(null);
                    else {
                      const c = customers.find((cust) => cust.id === e.target.value);
                      setSelectedCustomer(c || null);
                    }
                  }}
                  className="w-full pl-2 pr-6 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="anonymous">Client Comptoir (Anonyme)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.currentDebt > 0 ? `(Dette: ${formatMoney(c.currentDebt)})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowNewCustomerModal(true)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
                title="Ajouter un nouveau client"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {selectedCustomer && selectedCustomer.currentDebt > 0 && (
              <div className="p-2 bg-amber-950/30 border border-amber-800/40 rounded text-[11px] text-amber-300 flex justify-between items-center">
                <span>Encours / Crédit en cours :</span>
                <span className="font-mono font-bold">{formatMoney(selectedCustomer.currentDebt)}</span>
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="p-3.5 space-y-2.5 max-h-[360px] overflow-y-auto flex-1 divide-y divide-slate-800/60">
            {cart.length === 0 ? (
              <div className="py-14 text-center text-slate-500 space-y-2">
                <Tag className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
                <div className="text-xs">Le panier est vide.</div>
                <div className="text-[11px] text-slate-600">
                  Cliquez sur un article ou scannez avec la douchette.
                </div>
              </div>
            ) : (
              cart.map((item) => {
                const isReturnLine = item.quantity < 0;
                const lineTotal = Math.round(
                  item.product.sellingPrice *
                    item.quantity *
                    (1 - (item.discountPercent || 0) / 100)
                );
                return (
                  <div
                    key={item.product.id}
                    className={`pt-2 first:pt-0 space-y-1.5 ${
                      isReturnLine ? 'bg-amber-950/15 -mx-1 px-1.5 py-1.5 rounded-lg' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-200 line-clamp-1 flex items-center gap-1.5">
                          <span className="truncate">{item.product.name}</span>
                          {isReturnLine && (
                            <span className="text-[10px] font-semibold text-amber-400 shrink-0">
                              Retour
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {formatMoney(item.product.sellingPrice)} / {item.product.unit}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleCartItemReturn(item.product.id)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                            isReturnLine
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-amber-300'
                          }`}
                          title={
                            isReturnLine
                              ? 'Repasser en quantité positive (vente)'
                              : 'Passer en quantité négative (retour)'
                          }
                        >
                          {isReturnLine ? '- Qté' : '+/-'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-slate-500 hover:text-rose-400 p-0.5"
                          title="Supprimer la ligne"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quantity (supports negative) and Discount controls */}
                    <div className="flex items-center justify-between pt-0.5">
                      <div
                        className={`flex items-center border rounded bg-slate-800 ${
                          isReturnLine ? 'border-amber-500/40' : 'border-slate-700'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.product.id, -1)}
                          className="px-2 py-0.5 text-slate-400 hover:text-white transition-colors"
                          title="Diminuer (passe en négatif pour un retour)"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const parsed = parseInt(e.target.value, 10);
                            if (!Number.isNaN(parsed) && parsed !== 0) {
                              setCartQtyDirect(item.product.id, parsed);
                            }
                          }}
                          className={`w-11 bg-transparent text-center font-mono text-xs font-bold tabular-nums focus:outline-none ${
                            isReturnLine ? 'text-amber-400' : 'text-white'
                          }`}
                          aria-label={`Quantité pour ${item.product.name}`}
                        />
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.product.id, 1)}
                          className="px-2 py-0.5 text-slate-400 hover:text-white transition-colors"
                          title="Augmenter"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line discount dropdown */}
                      <div className="flex items-center gap-1.5">
                        <select
                          value={item.discountPercent || 0}
                          onChange={(e) =>
                            updateCartItemDiscount(item.product.id, Number(e.target.value))
                          }
                          className="text-[10px] font-mono bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-300"
                          title="Remise ligne"
                        >
                          <option value="0">0%</option>
                          <option value="5">-5%</option>
                          <option value="10">-10%</option>
                          <option value="15">-15%</option>
                          <option value="20">-20%</option>
                        </select>

                        <div
                          className={`text-xs font-bold font-mono tabular-nums ${
                            lineTotal < 0 ? 'text-amber-400' : 'text-white'
                          }`}
                        >
                          {formatMoney(lineTotal)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Totals & Checkout Button */}
          <div className="p-4 bg-slate-950/40 border-t border-slate-800 space-y-2">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Sous-total HT :</span>
                <span className="font-mono tabular-nums">{formatMoney(subtotal)}</span>
              </div>
              {discountAmount !== 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>Remises :</span>
                  <span className="font-mono tabular-nums">-{formatMoney(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>TVA estimée :</span>
                <span className="font-mono tabular-nums">{formatMoney(vatAmount)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
              <span className="text-xs font-bold uppercase text-slate-300">
                {total < 0 ? 'Net à rembourser :' : 'Total Net :'}
              </span>
              <span
                className={`text-xl font-black font-mono tabular-nums ${
                  total < 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {formatMoney(total)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenHoldModal}
                disabled={cart.length === 0 || !holdInvoiceSettings.enabled}
                title={
                  !holdInvoiceSettings.enabled
                    ? 'La mise en attente est désactivée dans les paramètres'
                    : 'Mettre la facture en attente'
                }
                className={`sm:col-span-5 py-3 px-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 border transition-all whitespace-nowrap ${
                  cart.length === 0 || !holdInvoiceSettings.enabled
                    ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-300 cursor-pointer'
                }`}
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Mettre en attente</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCheckout}
                disabled={cart.length === 0}
                className={`sm:col-span-7 py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all whitespace-nowrap ${
                  cart.length === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : total < 0
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold cursor-pointer'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold cursor-pointer'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>
                  {total < 0
                    ? `Rembourser ${formatMoney(Math.abs(total))}`
                    : total === 0 && cart.length > 0
                    ? 'Valider l’échange (0 FCFA)'
                    : `Encaisser ${formatMoney(total)}`}
                </span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Recent POS Receipts & Sales History */}
      <RecentReceiptsPanel onOpenReceipt={(sale) => setCompletedSale(sale)} />

      {/* Payment Method & Checkout Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden my-6">
            
            {/* Modal header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">
                  {total < 0
                    ? 'Remboursement Retour Client'
                    : total === 0
                    ? 'Validation Échange Produit'
                    : 'Règlement de la Vente'}
                </h2>
                <div className="text-xs text-slate-400">
                  {total < 0 ? 'Montant à rembourser : ' : 'Total à encaisser : '}
                  <span
                    className={`font-bold font-mono ${
                      total < 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {formatMoney(total < 0 ? Math.abs(total) : total)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 space-y-4">
              
              {/* Payment Methods buttons */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Mode de règlement :
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('ESPECES')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                      selectedMethod === 'ESPECES'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Espèces (Cash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('WAVE')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                      selectedMethod === 'WAVE'
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Wave Sénégal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('ORANGE_MONEY')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                      selectedMethod === 'ORANGE_MONEY'
                        ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Orange Money</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('CARTE_BANCAIRE')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                      selectedMethod === 'CARTE_BANCAIRE'
                        ? 'bg-purple-500/10 border-purple-500 text-purple-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Carte Bancaire</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('CREDIT_CLIENT')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                      selectedMethod === 'CREDIT_CLIENT'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Crédit Client (Dette)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('MIXTE')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                      selectedMethod === 'MIXTE'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Paiement Mixte</span>
                  </button>
                </div>
              </div>

              {/* Conditional Inputs based on Method */}
              {selectedMethod === 'ESPECES' && (
                total <= 0 ? (
                  <div className="p-3.5 bg-amber-950/20 rounded-lg border border-amber-800/40 flex justify-between items-center text-xs">
                    <span className="text-slate-300">
                      {total < 0
                        ? 'Remboursement en espèces depuis la caisse :'
                        : 'Échange à montant nul (0 FCFA) :'}
                    </span>
                    <span className="text-base font-extrabold font-mono text-amber-400 tabular-nums">
                      {formatMoney(Math.abs(total))}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3 p-3.5 bg-slate-800/40 rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300">Montant reçu du client :</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(Number(e.target.value) || 0)}
                          className="w-32 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-right font-mono text-xs text-white font-bold"
                        />
                        <span className="text-xs font-mono text-slate-400">FCFA</span>
                      </div>
                    </div>

                    {/* Cash preset quick buttons */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setCashTendered(total)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-mono rounded text-slate-300"
                      >
                        Exact ({formatMoney(total)})
                      </button>
                      {[2000, 5000, 10000, 20000, 50000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCashTendered(preset)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-mono rounded text-slate-300"
                        >
                          {preset.toLocaleString('fr-FR')} F
                        </button>
                      ))}
                    </div>

                    {/* Change returned calculator */}
                    <div className="pt-2 border-t border-slate-700 flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-300">Monnaie à rendre :</span>
                      <span
                        className={`text-base font-extrabold font-mono tabular-nums ${
                          cashTendered >= total ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {cashTendered >= total
                          ? formatMoney(cashTendered - total)
                          : `Manque ${formatMoney(total - cashTendered)}`}
                      </span>
                    </div>
                  </div>
                )
              )}

              {(selectedMethod === 'WAVE' ||
                selectedMethod === 'ORANGE_MONEY' ||
                selectedMethod === 'MTN_MOMO' ||
                selectedMethod === 'CARTE_BANCAIRE') && (
                <div className="space-y-3 p-3.5 bg-slate-800/40 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Montant à encaisser :</span>
                    <span className="font-mono font-bold text-white">{formatMoney(total)}</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Numéro de transaction / Référence de validation :
                    </label>
                    <input
                      type="text"
                      placeholder={
                        selectedMethod === 'WAVE'
                          ? 'Ex: WAV-SN-998231'
                          : selectedMethod === 'ORANGE_MONEY'
                          ? 'Ex: OM-SN-7740192'
                          : 'Ex: TPE-VISA-8812'
                      }
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {selectedMethod === 'CREDIT_CLIENT' && (
                <div className="space-y-3 p-3.5 bg-amber-950/20 rounded-lg border border-amber-800/40">
                  {!selectedCustomer ? (
                    <div className="flex items-center gap-2 text-xs text-amber-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>
                        Veuillez d'abord sélectionner un client enregistré dans le panier pour valider une vente à crédit.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-300">Client :</span>
                        <span className="font-semibold text-white">{selectedCustomer.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300">Dette actuelle :</span>
                        <span className="font-mono text-amber-400">
                          {formatMoney(selectedCustomer.currentDebt)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300">Nouveau total de dette :</span>
                        <span className="font-mono font-bold text-rose-400">
                          {formatMoney(selectedCustomer.currentDebt + total)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Plafond autorisé :</span>
                        <span className="font-mono">{formatMoney(selectedCustomer.maxCredit)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedMethod === 'MIXTE' && (
                <div className="space-y-3 p-3.5 bg-slate-800/40 rounded-lg border border-slate-700 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Part Espèces :</label>
                      <input
                        type="number"
                        value={splitCashAmount}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setSplitCashAmount(val);
                          setSplitDigitalAmount(Math.max(0, total - val));
                        }}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Part Wave / OM :</label>
                      <input
                        type="number"
                        value={splitDigitalAmount}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setSplitDigitalAmount(val);
                          setSplitCashAmount(Math.max(0, total - val));
                        }}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={
                  (total > 0 && selectedMethod === 'ESPECES' && cashTendered < total) ||
                  (selectedMethod === 'CREDIT_CLIENT' && !selectedCustomer)
                }
                onClick={handleCompleteSale}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
                  (total > 0 && selectedMethod === 'ESPECES' && cashTendered < total) ||
                  (selectedMethod === 'CREDIT_CLIENT' && !selectedCustomer)
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : total < 0
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>
                  {total < 0
                    ? 'Valider le Retour & Générer le Ticket'
                    : 'Valider & Générer le Ticket'}
                </span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* New Customer Quick Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3">Enregistrer un Client</h3>
            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nom ou Entreprise :</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Société Teranga SARL"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Téléphone (WhatsApp) :</label>
                <input
                  type="text"
                  placeholder="Ex: +221 77 123 45 67"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Plafond de Crédit Autorisé (FCFA) :</label>
                <input
                  type="number"
                  value={newCustMaxCredit}
                  onChange={(e) => setNewCustMaxCredit(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white font-mono"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded"
                >
                  Ajouter le client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable / Shareable Receipt Modal when sale is completed */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
        />
      )}

      {/* Shift Closure Modal */}
      {showShiftClosure && (
        <ShiftClosureModal onClose={() => setShowShiftClosure(false)} />
      )}

      {/* Returns Modal */}
      {showReturns && (
        <ReturnsModal onClose={() => setShowReturns(false)} />
      )}

      {/* Quick Cash Expense Modal */}
      {showCashExpenseModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Sortie / Dépense de Caisse</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Montant immédiatement déduit des espèces de la caisse.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCashExpenseModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCashExpense} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Catégorie :
                </label>
                <select
                  value={cashExpCategory}
                  onChange={(e) => setCashExpCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="Transport & Logistique">Transport & Logistique</option>
                  <option value="Fournitures & Emballages">Fournitures & Emballages</option>
                  <option value="Maintenance & Entretien">Maintenance & Entretien</option>
                  <option value="Eau, Électricité & Internet">Eau, Électricité & Internet</option>
                  <option value="Salaires & Primes">Salaires & Primes</option>
                  <option value="Taxes & Frais Administratifs">Taxes & Frais Administratifs</option>
                  <option value="Loyer & Charges Locatives">Loyer & Charges Locatives</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motif / Description * :
                </label>
                <input
                  type="text"
                  required
                  value={cashExpDesc}
                  onChange={(e) => setCashExpDesc(e.target.value)}
                  placeholder="Ex: Course coursier ou achat rouleaux caisse"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Montant prélevé en espèces * :
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={cashExpAmount}
                  onChange={(e) => setCashExpAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-mono font-bold text-rose-400 tabular-nums"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCashExpenseModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-rose-400 hover:bg-rose-300 rounded-lg transition-colors whitespace-nowrap"
                >
                  Déduire de la caisse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hold Current Cart Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Pause className="w-4 h-4 text-amber-400" />
                  <span>Mettre la facture en attente</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {cart.length} ligne(s) · Total :{' '}
                  <span className="font-mono font-bold text-emerald-400">{formatMoney(total)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHoldModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmHoldInvoice} className="space-y-3.5">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-[11px] text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Client :</span>
                  <span className="font-semibold text-white">
                    {selectedCustomer ? selectedCustomer.name : 'Client Comptoir (Anonyme)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Expiration configurée :</span>
                  <span className="font-mono text-slate-200">
                    {holdInvoiceSettings.autoExpireHours > 0
                      ? `${holdInvoiceSettings.autoExpireHours} heures`
                      : 'Sans expiration'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Réservation de stock :</span>
                  <span className="font-semibold text-slate-200">
                    {holdInvoiceSettings.reserveStockOnHold ? 'Activée' : 'Désactivée'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Libellé / Référence d&apos;identification
                  {holdInvoiceSettings.requireReferenceOrCustomer && !selectedCustomer ? ' *' : ''} :
                </label>
                <input
                  type="text"
                  autoFocus
                  value={holdRefNote}
                  onChange={(e) => {
                    setHoldRefNote(e.target.value);
                    if (holdError) setHoldError(null);
                  }}
                  placeholder="Ex: Table 3, Client parti retirer du cash..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {holdError && (
                <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{holdError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowHoldModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap"
                >
                  Confirmer la mise en attente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Held Invoices List Modal */}
      {showHeldListModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden my-6">
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Factures en attente ({scopedHeldInvoices.length})</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {holdInvoiceSettings.enabled ? 'Activée' : 'Désactivée'} · Plafond :{' '}
                  {holdInvoiceSettings.maxHeldPerBoutique} / boutique ·{' '}
                  {holdInvoiceSettings.autoExpireHours > 0
                    ? `Expiration ${holdInvoiceSettings.autoExpireHours}h`
                    : 'Sans expiration'}{' '}
                  · {holdInvoiceSettings.reserveStockOnHold ? 'Stock réservé' : 'Stock non réservé'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {canAccessTab('admin') && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowHeldListModal(false);
                      openAdminSection('organization');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
                  >
                    <Settings className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Paramétrer</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setConfirmReplaceHold(null);
                    setShowHeldListModal(false);
                  }}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3">
              {scopedHeldInvoices.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="text-xs font-semibold text-slate-300">
                    Aucune facture en attente pour cette boutique.
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Ajoutez des articles au panier puis cliquez sur « Mettre en attente ».
                  </div>
                </div>
              ) : (
                scopedHeldInvoices.map((held) => {
                  const boutiqueName =
                    boutiques.find((b) => b.id === held.boutiqueId)?.name || held.boutiqueId;
                  const isConfirmingReplace = confirmReplaceHold?.id === held.id;
                  return (
                    <div
                      key={held.id}
                      className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono font-bold text-amber-400">
                              {held.holdNumber}
                            </span>
                            <span className="text-slate-600">·</span>
                            <span className="font-semibold text-white">
                              {held.referenceNote || held.customerName || 'Client Comptoir'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {boutiqueName} · Par {held.sellerName} ·{' '}
                            {new Date(held.createdAt).toLocaleString('fr-FR')}
                            {held.expiresAt && (
                              <>
                                {' '}
                                · Expire :{' '}
                                <span className="font-mono text-slate-300">
                                  {new Date(held.expiresAt).toLocaleString('fr-FR')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-extrabold font-mono text-emerald-400 tabular-nums">
                            {formatMoney(held.total)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {held.items.reduce((s, i) => s + i.quantity, 0)} article(s)
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-800/80 pt-2 space-y-1 text-[11px]">
                        {held.items.map((item, idx) => (
                          <div
                            key={`${held.id}-${item.productId}-${idx}`}
                            className="flex justify-between text-slate-300"
                          >
                            <span className="truncate pr-3">
                              <span className="font-mono text-slate-400">{item.quantity} ×</span>{' '}
                              {item.productName}
                              {item.discountPercent > 0 && (
                                <span className="text-rose-400 ml-1">(-{item.discountPercent}%)</span>
                              )}
                            </span>
                            <span className="font-mono tabular-nums text-slate-200 shrink-0">
                              {formatMoney(item.total)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {isConfirmingReplace && (
                        <div className="p-2.5 bg-amber-950/30 border border-amber-500/40 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-amber-200">
                            Le panier actuel n&apos;est pas vide. Le remplacer par {held.holdNumber} ?
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmReplaceHold(null)}
                              className="px-2.5 py-1 bg-slate-800 text-slate-300 hover:text-white rounded text-[11px]"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResumeHeldInvoice(held)}
                              className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded text-[11px]"
                            >
                              Confirmer le remplacement
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirmReplaceHold?.id === held.id) setConfirmReplaceHold(null);
                            removeHeldInvoice(held.id);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 rounded-lg text-xs transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Supprimer</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResumeHeldInvoice(held)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition-colors whitespace-nowrap"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Reprendre en caisse</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
