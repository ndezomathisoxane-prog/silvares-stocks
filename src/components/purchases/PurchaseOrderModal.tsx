import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ProductCategory, PurchaseItem, PurchaseOrder } from '../../types';
import {
  X,
  ShoppingCart,
  Plus,
  Trash2,
  AlertTriangle,
  PackageCheck,
  Send,
  FileEdit,
  Check,
  Search,
  PackagePlus,
} from 'lucide-react';

interface PurchaseOrderModalProps {
  order?: PurchaseOrder | null;
  defaultSupplierId?: string;
  onClose: () => void;
}

interface CustomProductDraft {
  name: string;
  category: ProductCategory;
  unit: 'pièce' | 'carton' | 'kg' | 'litre' | 'paquet' | 'boîte';
  purchasePrice: number;
  sellingPrice: number;
  vatRate: number;
}

const CATEGORIES: ProductCategory[] = [
  'Alimentation & Épicerie',
  'Boissons & Frais',
  'Hygiène & Entretien',
  'Mode & Textile',
  'Quincaillerie & Brico',
  'Électronique & Divers',
];

const UNITS: ('pièce' | 'carton' | 'kg' | 'litre' | 'paquet' | 'boîte')[] = [
  'pièce',
  'carton',
  'kg',
  'litre',
  'paquet',
  'boîte',
];

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  order = null,
  defaultSupplierId,
  onClose,
}) => {
  const {
    suppliers,
    boutiques,
    products,
    selectedBoutiqueId,
    organization,
    getProductStockInBoutique,
    addProduct,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    formatMoney,
  } = useApp();

  const isEditing = Boolean(order);

  const [supplierId, setSupplierId] = useState<string>(
    order?.supplierId || defaultSupplierId || suppliers[0]?.id || ''
  );
  const [boutiqueId, setBoutiqueId] = useState<string>(
    order?.boutiqueId ||
      (selectedBoutiqueId === 'all'
        ? boutiques.find((b) => b.isDepot)?.id || boutiques[0]?.id || 'b1'
        : selectedBoutiqueId)
  );
  const [expectedDate, setExpectedDate] = useState<string>(() => {
    if (order?.expectedDate) return order.expectedDate;
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState(order?.notes || '');
  const [paidImmediately, setPaidImmediately] = useState(false);

  // Buyer starts with an empty list for new orders and decides every product to order
  const [items, setItems] = useState<PurchaseItem[]>(() => {
    if (order) {
      return order.items.map((item) => ({ ...item }));
    }
    return [];
  });

  // Track custom products created directly inside this modal before saving
  const [customDrafts, setCustomDrafts] = useState<Record<string, CustomProductDraft>>({});

  // Product picker search & filter
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Custom new product form state
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<ProductCategory>('Alimentation & Épicerie');
  const [customUnit, setCustomUnit] = useState<
    'pièce' | 'carton' | 'kg' | 'litre' | 'paquet' | 'boîte'
  >('pièce');
  const [customQty, setCustomQty] = useState<number>(10);
  const [customPurchasePrice, setCustomPurchasePrice] = useState<number>(1000);
  const [customSellingPrice, setCustomSellingPrice] = useState<number>(1300);
  const [customVatRate, setCustomVatRate] = useState<number>(organization.defaultVatRate ?? 18);

  const filteredCatalogProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, productSearch, categoryFilter]);

  // Low-stock products in target boutique for optional quick replenishment
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => {
      const qty = getProductStockInBoutique(p.id, boutiqueId);
      return qty <= p.minThreshold;
    });
  }, [products, boutiqueId, getProductStockInBoutique]);

  const handleAddCatalogProduct = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === prod.id);
      if (existingIdx >= 0) {
        return prev.map((item, idx) =>
          idx === existingIdx
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.unitCost,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          unit: prod.unit,
          quantity: 10,
          unitCost: prod.purchasePrice,
          vatRate: prod.vatRate,
          total: 10 * prod.purchasePrice,
        },
      ];
    });
  };

  const handleAddCustomProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || customQty <= 0) return;

    const tempId = `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const generatedSku = `ACH-${String(Date.now()).slice(-5)}`;
    const safeCost = Math.max(0, customPurchasePrice);
    const safeQty = Math.max(1, customQty);

    setCustomDrafts((prev) => ({
      ...prev,
      [tempId]: {
        name: customName.trim(),
        category: customCategory,
        unit: customUnit,
        purchasePrice: safeCost,
        sellingPrice: Math.max(safeCost, customSellingPrice),
        vatRate: customVatRate,
      },
    }));

    setItems((prev) => [
      ...prev,
      {
        productId: tempId,
        productName: customName.trim(),
        sku: generatedSku,
        unit: customUnit,
        quantity: safeQty,
        unitCost: safeCost,
        vatRate: customVatRate,
        total: safeQty * safeCost,
      },
    ]);

    setCustomName('');
    setCustomQty(10);
    setShowCustomForm(false);
  };

  const handleLoadLowStock = () => {
    if (lowStockProducts.length === 0) return;
    const newItems: PurchaseItem[] = lowStockProducts.map((p) => {
      const currentQty = getProductStockInBoutique(p.id, boutiqueId);
      const suggestedQty = Math.max(10, p.minThreshold * 2 - currentQty);
      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        unit: p.unit,
        quantity: suggestedQty,
        unitCost: p.purchasePrice,
        vatRate: p.vatRate,
        total: suggestedQty * p.purchasePrice,
      };
    });
    setItems(newItems);
  };

  const handleProductChange = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              productId: prod.id,
              productName: prod.name,
              sku: prod.sku,
              unit: prod.unit,
              quantity: item.quantity,
              unitCost: prod.purchasePrice,
              vatRate: prod.vatRate,
              total: item.quantity * prod.purchasePrice,
            }
          : item
      )
    );
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const safeQty = Math.max(1, qty);
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              quantity: safeQty,
              total: safeQty * item.unitCost,
            }
          : item
      )
    );
  };

  const handleUnitCostChange = (index: number, cost: number) => {
    const safeCost = Math.max(0, cost);
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              unitCost: safeCost,
              total: item.quantity * safeCost,
            }
          : item
      )
    );
  };

  const handleRemoveLine = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const materializeCustomProducts = (): PurchaseItem[] => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    return items.map((item) => {
      if (!item.productId.startsWith('custom-')) return item;
      const draft = customDrafts[item.productId];
      if (!draft) return item;

      const created = addProduct({
        sku: item.sku,
        barcode: `${Date.now().toString().slice(-10)}`,
        name: item.productName,
        category: draft.category,
        unit: draft.unit,
        purchasePrice: item.unitCost,
        sellingPrice: draft.sellingPrice,
        vatRate: item.vatRate,
        minThreshold: 5,
        supplier: supplier?.name || 'Fournisseur',
        stocks: boutiques.map((b) => ({ boutiqueId: b.id, quantity: 0 })),
      });

      return {
        ...item,
        productId: created.id,
        sku: created.sku,
      };
    });
  };

  const subtotalHT = Math.round(items.reduce((sum, i) => sum + i.total, 0));
  const vatAmount = Math.round(
    items.reduce((sum, i) => sum + (i.total * i.vatRate) / 100, 0)
  );
  const totalTTC = subtotalHT + vatAmount;

  const handleCreate = (initialStatus: 'BROUILLON' | 'COMMANDE' | 'RECU') => {
    if (!supplierId || !boutiqueId || items.length === 0) return;
    const finalizedItems = materializeCustomProducts();
    createPurchaseOrder({
      supplierId,
      boutiqueId,
      expectedDate,
      items: finalizedItems,
      notes: notes.trim() || undefined,
      initialStatus,
      initialAmountPaid: paidImmediately ? totalTTC : 0,
    });
    onClose();
  };

  const handleSaveEdit = () => {
    if (!order || !supplierId || !boutiqueId || items.length === 0) return;
    const finalizedItems = materializeCustomProducts();
    updatePurchaseOrder(order.id, {
      supplierId,
      boutiqueId,
      expectedDate,
      items: finalizedItems,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const handleDeleteEntireOrder = () => {
    if (!order) return;
    deletePurchaseOrder(order.id, false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-5xl w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {isEditing
                  ? `Modifier le Bon de Commande · ${order?.orderNumber}`
                  : 'Nouveau Bon de Commande / Achat'}
              </h2>
              <p className="text-xs text-slate-400">
                Sélectionnez librement les produits à commander auprès du fournisseur
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* Top Metadata Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Fournisseur *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.paymentTerms})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Boutique / Dépôt de réception *
              </label>
              <select
                value={boutiqueId}
                onChange={(e) => setBoutiqueId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                {boutiques.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Livraison souhaitée
              </label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Buyer Product Picker Section */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-slate-200 text-xs">
                Choisir les produits à commander
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {lowStockProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={handleLoadLowStock}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold rounded-md transition-colors whitespace-nowrap"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Charger {lowStockProducts.length} article(s) sous seuil</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowCustomForm(!showCustomForm)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-md font-semibold transition-colors whitespace-nowrap ${
                    showCustomForm
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-400'
                  }`}
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>Nouveau produit hors catalogue</span>
                </button>
              </div>
            </div>

            {showCustomForm ? (
              <form
                onSubmit={handleAddCustomProduct}
                className="p-3 bg-slate-900 border border-slate-700 rounded-lg space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Nom du nouveau produit *
                    </label>
                    <input
                      type="text"
                      required
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Ex: Riz Parfumé 25kg"
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Catégorie</label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value as ProductCategory)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-white focus:outline-none focus:border-emerald-500"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Unité</label>
                    <select
                      value={customUnit}
                      onChange={(e) =>
                        setCustomUnit(
                          e.target.value as
                            | 'pièce'
                            | 'carton'
                            | 'kg'
                            | 'litre'
                            | 'paquet'
                            | 'boîte'
                        )
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-white"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Qté commandée *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={customQty}
                      onChange={(e) => setCustomQty(Number(e.target.value) || 1)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-md font-mono font-bold text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Prix Achat HT *</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={customPurchasePrice}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setCustomPurchasePrice(val);
                        setCustomSellingPrice(Math.round(val * 1.3));
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-md font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Prix Vente TTC</label>
                    <input
                      type="number"
                      min={0}
                      value={customSellingPrice}
                      onChange={(e) => setCustomSellingPrice(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-md font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">TVA (%)</label>
                    <select
                      value={customVatRate}
                      onChange={(e) => setCustomVatRate(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-md font-mono text-white"
                    >
                      <option value={18}>18%</option>
                      <option value={20}>20%</option>
                      <option value={0}>0%</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter au bon</span>
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Rechercher un produit du catalogue (nom, SKU, code-barres)..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">Toutes les catégories</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="max-h-40 overflow-y-auto divide-y divide-slate-800/70 border border-slate-800 rounded-lg bg-slate-900/70">
                  {filteredCatalogProducts.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">
                      Aucun article trouvé. Cliquez sur « Nouveau produit hors catalogue » pour commander un nouvel article.
                    </div>
                  ) : (
                    filteredCatalogProducts.map((p) => {
                      const stockQty = getProductStockInBoutique(p.id, boutiqueId);
                      const inOrder = items.find((i) => i.productId === p.id);
                      const isLow = stockQty <= p.minThreshold;
                      return (
                        <div
                          key={p.id}
                          className="px-3 py-2 flex items-center justify-between gap-3 hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-white truncate">{p.name}</div>
                            <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 font-mono">
                              <span>{p.sku}</span>
                              <span>·</span>
                              <span className={isLow ? 'text-amber-400 font-semibold' : ''}>
                                Stock: {stockQty} {p.unit}
                              </span>
                              <span>·</span>
                              <span className="text-slate-300">
                                PA HT: {formatMoney(p.purchasePrice)}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddCatalogProduct(p.id)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                              inOrder
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                                : 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 border border-slate-700'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>{inOrder ? `Ajouté (${inOrder.quantity}) +1` : 'Ajouter'}</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>

          {/* Selected Lines Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                Lignes du bon de commande ({items.length})
              </span>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
                >
                  Vider la sélection
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="p-6 border border-dashed border-slate-700 rounded-lg text-center space-y-2">
                <div className="text-slate-400">
                  Aucun produit sélectionné pour ce bon de commande.
                </div>
                <p className="text-[11px] text-slate-500">
                  Cliquez sur « Ajouter » dans la liste ci-dessus ou créez un nouveau produit hors catalogue.
                </p>
                {isEditing && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleDeleteEntireOrder}
                      className="px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 font-semibold rounded-md"
                    >
                      Supprimer tout le bon de commande
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-slate-800 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 font-semibold">
                      <th className="py-2 px-3">Article commandé</th>
                      <th className="py-2 px-2 text-center w-24">Stock actuel</th>
                      <th className="py-2 px-2 text-center w-28">Qté commandée</th>
                      <th className="py-2 px-2 text-right w-32">Prix Achat HT</th>
                      <th className="py-2 px-2 text-center w-16">TVA</th>
                      <th className="py-2 px-3 text-right w-32">Total HT</th>
                      <th className="py-2 px-2 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {items.map((item, idx) => {
                      const isCustom = item.productId.startsWith('custom-');
                      const currentStock = isCustom
                        ? 0
                        : getProductStockInBoutique(item.productId, boutiqueId);
                      return (
                        <tr key={`${item.productId}-${idx}`}>
                          <td className="py-2 px-3">
                            {isCustom ? (
                              <div>
                                <div className="font-semibold text-emerald-300">
                                  {item.productName}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  Nouvel article · {item.sku} · {item.unit}
                                </div>
                              </div>
                            ) : (
                              <select
                                value={item.productId}
                                onChange={(e) => handleProductChange(idx, e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-emerald-500"
                              >
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.sku})
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-mono tabular-nums text-slate-400">
                            {currentStock} {item.unit}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                handleQuantityChange(idx, Number(e.target.value) || 1)
                              }
                              className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-center font-mono font-bold text-white"
                            />
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min={0}
                              value={item.unitCost}
                              onChange={(e) =>
                                handleUnitCostChange(idx, Number(e.target.value) || 0)
                              }
                              className="w-28 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-right font-mono text-white"
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-400">
                            {item.vatRate}%
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-white tabular-nums">
                            {formatMoney(item.total)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Supprimer ce produit du bon"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes & Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
            <div className="md:col-span-7 space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Observations / Référence devis fournisseur
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Livraison prévue matinée, facture N°..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {!isEditing && (
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-300">
                  <input
                    type="checkbox"
                    checked={paidImmediately}
                    onChange={(e) => setPaidImmediately(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>
                    Marquer cette commande comme réglée comptant ({formatMoney(totalTTC)})
                  </span>
                </label>
              )}
            </div>

            <div className="md:col-span-5 p-3.5 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Total HT</span>
                <span className="font-mono tabular-nums">{formatMoney(subtotalHT)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>TVA déductible</span>
                <span className="font-mono tabular-nums">{formatMoney(vatAmount)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-800">
                <span className="font-bold text-white">Total TTC</span>
                <span className="text-lg font-extrabold font-mono text-emerald-400 tabular-nums">
                  {formatMoney(totalTTC)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={handleDeleteEntireOrder}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/50 border border-rose-800/40 rounded-lg transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer tout le bon</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isEditing ? (
              <button
                type="button"
                disabled={items.length === 0}
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg transition-colors shadow-sm whitespace-nowrap"
              >
                <Check className="w-4 h-4" />
                <span>Enregistrer les modifications</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={items.length === 0}
                  onClick={() => handleCreate('BROUILLON')}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Enregistrer Brouillon</span>
                </button>

                <button
                  type="button"
                  disabled={items.length === 0}
                  onClick={() => handleCreate('COMMANDE')}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-700/40 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Valider Commande</span>
                </button>

                <button
                  type="button"
                  disabled={items.length === 0}
                  onClick={() => handleCreate('RECU')}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg transition-colors shadow-sm whitespace-nowrap"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Commander & Réceptionner Stock</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
