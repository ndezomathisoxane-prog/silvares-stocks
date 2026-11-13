import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ProductCategory } from '../../types';
import {
  Package,
  Plus,
  ArrowRightLeft,
  ClipboardCheck,
  Search,
  Filter,
  Edit2,
  Trash2,
  ArrowDownRight,
  TrendingUp,
  AlertTriangle,
  Layers,
  FileText,
  Printer,
  Calculator,
} from 'lucide-react';
import { ProductModal } from './ProductModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { StockTransferModal } from './StockTransferModal';
import { InventoryCountModal } from './InventoryCountModal';
import { InventoryPrintModal } from './InventoryPrintModal';
import { PriceCalculatorModal } from './PriceCalculatorModal';

export const StockScreen: React.FC = () => {
  const {
    products,
    deleteProduct,
    selectedBoutiqueId,
    boutiques,
    formatMoney,
    getProductStockInBoutique,
    transferNotes,
  } = useApp();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'alert' | 'out'>('all');
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'transfers'>('catalog');

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentProductId, setAdjustmentProductId] = useState<string | undefined>();
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPriceCalculator, setShowPriceCalculator] = useState(false);
  const [calculatorProduct, setCalculatorProduct] = useState<Product | null>(null);

  // Active boutique label
  const activeBoutique = boutiques.find((b) => b.id === selectedBoutiqueId);
  const boutiqueLabel = selectedBoutiqueId === 'all' ? 'Tout le Réseau (Toutes Boutiques)' : activeBoutique?.name;

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    // Category filter
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;

    // Stock level
    const currentQty = getProductStockInBoutique(p.id, selectedBoutiqueId);
    if (statusFilter === 'out' && currentQty > 0) return false;
    if (statusFilter === 'alert' && (currentQty > p.minThreshold || currentQty === 0)) return false;
    if (statusFilter === 'normal' && currentQty <= p.minThreshold) return false;

    // Search query
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      p.supplier.toLowerCase().includes(q)
    );
  });

  // Calculate stock valuations for active scope
  let totalStockUnits = 0;
  let totalPurchaseValuation = 0;
  let totalSellingValuation = 0;
  let alertCount = 0;
  let outOfStockCount = 0;

  products.forEach((p) => {
    const qty = getProductStockInBoutique(p.id, selectedBoutiqueId);
    totalStockUnits += qty;
    totalPurchaseValuation += qty * p.purchasePrice;
    totalSellingValuation += qty * p.sellingPrice;
    if (qty === 0) outOfStockCount++;
    else if (qty <= p.minThreshold) alertCount++;
  });

  const dormantGrossMargin = Math.max(0, totalSellingValuation - totalPurchaseValuation);

  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    setShowProductModal(true);
  };

  const handleQuickAddStock = (p: Product) => {
    setAdjustmentProductId(p.id);
    setShowAdjustmentModal(true);
  };

  const handleDelete = (p: Product) => {
    if (window.confirm(`Confirmez-vous la suppression de l'article "${p.name}" ?`)) {
      deleteProduct(p.id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Title & Primary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Gestion des Stocks & Entrepôts
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Périmètre actif : <span className="text-emerald-400 font-medium">{boutiqueLabel}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setCalculatorProduct(null);
              setShowPriceCalculator(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
            <span>Calculateur de Prix</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            <span>Imprimer Inventaire</span>
          </button>

          <button
            onClick={() => setShowInventoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Inventaire Physique</span>
          </button>

          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>Transfert Inter-Boutiques</span>
          </button>

          <button
            onClick={() => {
              setAdjustmentProductId(undefined);
              setShowAdjustmentModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>Réception / Mouvement</span>
          </button>

          <button
            onClick={() => {
              setEditingProduct(null);
              setShowProductModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Produit</span>
          </button>
        </div>
      </div>

      {/* Stock Valuation KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-400">Total Références</span>
          <div className="text-lg font-bold font-mono text-white tabular-nums mt-0.5">
            {products.length} réf.
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{totalStockUnits} unités en rayon</div>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-400">Valeur d'Achat HT</span>
          <div className="text-lg font-bold font-mono text-emerald-400 tabular-nums mt-0.5">
            {formatMoney(totalPurchaseValuation)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Coût d'acquisition immobilisé</div>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-400">Valeur Vente Estimée</span>
          <div className="text-lg font-bold font-mono text-cyan-400 tabular-nums mt-0.5">
            {formatMoney(totalSellingValuation)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Chiffre d'affaires potentiel</div>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-400">Marge Brute Dormante</span>
          <div className="text-lg font-bold font-mono text-amber-400 tabular-nums mt-0.5">
            {formatMoney(dormantGrossMargin)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Bénéfice brut prévisionnel</div>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl col-span-2 sm:col-span-4 lg:col-span-1">
          <span className="text-[11px] font-medium text-slate-400">Alertes Rupture</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-lg font-bold font-mono text-rose-400 tabular-nums">
              {outOfStockCount}
            </span>
            <span className="text-xs text-slate-500">rupture(s) /</span>
            <span className="text-lg font-bold font-mono text-amber-400 tabular-nums">
              {alertCount}
            </span>
            <span className="text-xs text-slate-500">faible(s)</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Besoin de réapprovisionnement</div>
        </div>
      </div>

      {/* Sub-tabs: Catalog vs Transfer Notes */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('catalog')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeSubTab === 'catalog'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Catalogue & Niveaux de Stock ({products.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('transfers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeSubTab === 'transfers'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Bons de Transferts ({transferNotes.length})</span>
        </button>
      </div>

      {activeSubTab === 'catalog' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm space-y-4">
          
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/50">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par nom, code SKU, code-barres ou fournisseur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Toutes les catégories</option>
                <option value="Alimentation & Épicerie">Alimentation & Épicerie</option>
                <option value="Boissons & Frais">Boissons & Frais</option>
                <option value="Hygiène & Entretien">Hygiène & Entretien</option>
                <option value="Mode & Textile">Mode & Textile</option>
                <option value="Quincaillerie & Brico">Quincaillerie & Brico</option>
                <option value="Électronique & Divers">Électronique & Divers</option>
              </select>

              {/* Status Segmented Buttons */}
              <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    statusFilter === 'all' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tous
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('normal')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    statusFilter === 'normal' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('alert')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    statusFilter === 'alert' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Critique ({alertCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('out')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    statusFilter === 'out' ? 'bg-rose-500/20 text-rose-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Rupture ({outOfStockCount})
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Article</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4 text-center">Stock Dispo</th>
                  <th className="py-3 px-4 text-right">Prix Achat (HT)</th>
                  <th className="py-3 px-4 text-right">Prix Vente (TTC)</th>
                  <th className="py-3 px-4 text-right">Marge Brute</th>
                  <th className="py-3 px-4 text-right">Valeur Stock</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredProducts.map((product) => {
                  const currentStock = getProductStockInBoutique(product.id, selectedBoutiqueId);
                  const isLow = currentStock <= product.minThreshold && currentStock > 0;
                  const isOut = currentStock <= 0;
                  const marginAmt = product.sellingPrice - product.purchasePrice;
                  const marginPct = product.sellingPrice > 0 ? (marginAmt / product.sellingPrice) * 100 : 0;
                  const lineValuation = currentStock * product.purchasePrice;

                  return (
                    <tr key={product.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{product.name}</div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {product.sku} · EAN: {product.barcode}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        <span>{product.category.split(' & ')[0]}</span>
                        <div className="text-[10px] text-slate-500">{product.supplier}</div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                            isOut
                              ? 'text-rose-400 bg-rose-950/40 border border-rose-900/30'
                              : isLow
                              ? 'text-amber-400 bg-amber-950/40 border border-amber-900/30'
                              : 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/30'
                          }`}
                        >
                          {currentStock} {product.unit}
                        </span>
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          Seuil min: {product.minThreshold}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                        {formatMoney(product.purchasePrice)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-white">
                        {formatMoney(product.sellingPrice)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <div className="font-bold text-emerald-400">{formatMoney(marginAmt)}</div>
                        <div className="text-[10px] text-slate-400">{marginPct.toFixed(0)}%</div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-200 font-semibold">
                        {formatMoney(lineValuation)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setCalculatorProduct(product);
                              setShowPriceCalculator(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
                            title="Calculer le prix de vente conseillé"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAddStock(product)}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
                            title="Entrée rapide de stock"
                          >
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(product)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                            title="Modifier fiche produit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs">
              Aucun produit ne correspond à ces critères de recherche.
            </div>
          )}

          {/* Footer count summary */}
          <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between items-center bg-slate-900/60">
            <span>Affichage de {filteredProducts.length} sur {products.length} références</span>
            <span>Valorisation totale affichée : <strong className="text-emerald-400 font-mono">{formatMoney(totalPurchaseValuation)}</strong></span>
          </div>

        </div>
      ) : (
        /* Transfer Notes View */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white">Historique des Bons de Transfert</h2>
              <div className="text-xs text-slate-400">Expéditions et réceptions de stock entre boutiques et dépôts</div>
            </div>
            <button
              onClick={() => setShowTransferModal(true)}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau Bon de Transfert</span>
            </button>
          </div>

          <div className="space-y-3">
            {transferNotes.map((note) => {
              const src = boutiques.find((b) => b.id === note.sourceBoutiqueId);
              const dst = boutiques.find((b) => b.id === note.destinationBoutiqueId);

              return (
                <div key={note.id} className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-white">{note.transferNumber}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(note.date).toLocaleDateString('fr-FR')} {new Date(note.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-300">Émis par : {note.createdBy}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 font-bold">
                      {note.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 flex items-center gap-2">
                    <span className="font-semibold text-amber-400">{src?.name}</span>
                    <span>→</span>
                    <span className="font-semibold text-emerald-400">{dst?.name}</span>
                  </div>

                  <div className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded">
                    {note.items.map((i) => `${i.quantity}x ${i.productName}`).join(' · ')}
                  </div>

                  {note.notes && (
                    <div className="text-[11px] text-slate-500 italic">
                      Note : {note.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
        />
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && (
        <StockAdjustmentModal
          defaultProductId={adjustmentProductId}
          onClose={() => {
            setShowAdjustmentModal(false);
            setAdjustmentProductId(undefined);
          }}
        />
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <StockTransferModal onClose={() => setShowTransferModal(false)} />
      )}

      {/* Inventory Count Modal */}
      {showInventoryModal && (
        <InventoryCountModal onClose={() => setShowInventoryModal(false)} />
      )}

      {/* Inventory Print Modal */}
      {showPrintModal && (
        <InventoryPrintModal
          filteredProducts={filteredProducts}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Selling Price Calculator Modal */}
      {showPriceCalculator && (
        <PriceCalculatorModal
          initialProduct={calculatorProduct}
          onClose={() => {
            setShowPriceCalculator(false);
            setCalculatorProduct(null);
          }}
        />
      )}

    </div>
  );
};
