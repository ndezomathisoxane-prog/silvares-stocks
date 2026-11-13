import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ProductCategory } from '../../types';
import { X, Sparkles, Check, Calculator } from 'lucide-react';

interface ProductModalProps {
  product?: Product | null;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onClose }) => {
  const { addProduct, updateProduct, boutiques, formatMoney } = useApp();

  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [barcode, setBarcode] = useState(product?.barcode || '');
  const [category, setCategory] = useState<ProductCategory>(
    product?.category || 'Alimentation & Épicerie'
  );
  const [unit, setUnit] = useState<Product['unit']>(product?.unit || 'pièce');
  const [purchasePrice, setPurchasePrice] = useState<number>(product?.purchasePrice || 1000);
  const [sellingPrice, setSellingPrice] = useState<number>(product?.sellingPrice || 1500);
  const [vatRate, setVatRate] = useState<number>(product?.vatRate ?? 18);
  const [minThreshold, setMinThreshold] = useState<number>(product?.minThreshold || 10);
  const [supplier, setSupplier] = useState(product?.supplier || '');
  const [isFavorite, setIsFavorite] = useState(product?.isFavorite || false);
  const [targetMarginPct, setTargetMarginPct] = useState<number>(() => {
    if (product && product.sellingPrice > 0 && product.purchasePrice > 0) {
      return Math.max(
        0,
        Math.min(
          95,
          Math.round(((product.sellingPrice - product.purchasePrice) / product.sellingPrice) * 1000) / 10
        )
      );
    }
    return 30;
  });

  // Initial stock breakdown per boutique
  const [stocks, setStocks] = useState<{ [boutiqueId: string]: number }>(() => {
    const map: { [boutiqueId: string]: number } = {};
    boutiques.forEach((b) => {
      const existing = product?.stocks.find((s) => s.boutiqueId === b.id);
      map[b.id] = existing ? existing.quantity : 0;
    });
    return map;
  });

  // Dynamic margin calculation
  const marginAmount = sellingPrice - purchasePrice;
  const marginPercent = sellingPrice > 0 ? (marginAmount / sellingPrice) * 100 : 0;

  const recommendedSellingPrice =
    targetMarginPct >= 0 && targetMarginPct < 99
      ? Math.round(purchasePrice / (1 - targetMarginPct / 100))
      : sellingPrice;

  const applyTargetMargin = (pct: number) => {
    setTargetMarginPct(pct);
    if (pct >= 0 && pct < 99) {
      setSellingPrice(Math.round(purchasePrice / (1 - pct / 100)));
    }
  };

  const handleGenerateBarcode = () => {
    const random12 = '6044' + Math.floor(10000000 + Math.random() * 90000000).toString();
    setBarcode(random12);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const stockArray = Object.entries(stocks).map(([boutiqueId, quantity]) => ({
      boutiqueId,
      quantity: Number(quantity) || 0,
    }));

    if (product) {
      updateProduct({
        ...product,
        name: name.trim(),
        sku: sku.trim() || `SKU-${Date.now().toString().slice(-5)}`,
        barcode: barcode.trim() || `6044${Date.now().toString().slice(-8)}`,
        category,
        unit,
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        vatRate: Number(vatRate) || 0,
        minThreshold: Number(minThreshold) || 5,
        supplier: supplier.trim() || 'Fournisseur Général',
        stocks: stockArray,
        isFavorite,
      });
    } else {
      addProduct({
        name: name.trim(),
        sku: sku.trim() || `SKU-${Date.now().toString().slice(-5)}`,
        barcode: barcode.trim() || `6044${Date.now().toString().slice(-8)}`,
        category,
        unit,
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        vatRate: Number(vatRate) || 0,
        minThreshold: Number(minThreshold) || 5,
        supplier: supplier.trim() || 'Fournisseur Général',
        stocks: stockArray,
        isFavorite,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">
            {product ? 'Modifier la Fiche Produit' : 'Créer un Nouveau Produit'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Main Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Désignation de l'article * :
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Huile Dinor 1L ou Polo Bazin Brodé"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Catégorie :
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Alimentation & Épicerie">Alimentation & Épicerie</option>
                <option value="Boissons & Frais">Boissons & Frais</option>
                <option value="Hygiène & Entretien">Hygiène & Entretien</option>
                <option value="Mode & Textile">Mode & Textile</option>
                <option value="Quincaillerie & Brico">Quincaillerie & Brico</option>
                <option value="Électronique & Divers">Électronique & Divers</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Unité de vente :
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as Product['unit'])}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="pièce">Pièce / Unité</option>
                <option value="carton">Carton / Pack</option>
                <option value="paquet">Paquet / Sachet</option>
                <option value="boîte">Boîte / Conservée</option>
                <option value="kg">Kilogramme (kg)</option>
                <option value="litre">Litre (L)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Code SKU Référence :
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Ex: HUI-DIN-01"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Code-barres EAN / Douchette :
                </label>
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono"
                >
                  <Sparkles className="w-3 h-3" />
                  Générer code
                </button>
              </div>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="604400012301"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Pricing & Automatic Margin Card */}
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/80 space-y-3">
            <span className="text-xs font-bold text-slate-200">
              Tarification & Calcul Automatique de Marge
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Prix d'Achat HT (Coût) :
                </label>
                <input
                  type="number"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Prix de Vente Public (TTC) :
                </label>
                <input
                  type="number"
                  min="0"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Régime TVA :
                </label>
                <select
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono"
                >
                  <option value={18}>18% (Taux Normal)</option>
                  <option value={0}>0% (Exonéré / Base vivrière)</option>
                </select>
              </div>
            </div>

            {/* Target Margin Calculator Row */}
            <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                  <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Calculateur selon marge cible (%)</span>
                </div>
                <div className="flex items-center gap-1">
                  {[20, 25, 30, 40].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => applyTargetMargin(pct)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono tabular-nums transition-colors ${
                        targetMarginPct === pct
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] text-slate-400 whitespace-nowrap">Marge cible :</label>
                  <input
                    type="number"
                    min="0"
                    max="98.9"
                    step="0.5"
                    value={targetMarginPct}
                    onChange={(e) => setTargetMarginPct(Math.max(0, Number(e.target.value) || 0))}
                    className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-mono tabular-nums text-emerald-400 text-right"
                  />
                  <span className="text-xs font-mono text-slate-400">%</span>
                </div>

                <div className="flex-1 text-right text-xs text-slate-300 font-mono tabular-nums">
                  Prix conseillé :{' '}
                  <span className="font-bold text-emerald-400">
                    {formatMoney(recommendedSellingPrice)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => applyTargetMargin(targetMarginPct)}
                  disabled={targetMarginPct >= 99}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 rounded transition-colors whitespace-nowrap shrink-0"
                >
                  Appliquer
                </button>
              </div>
            </div>

            {/* Calculated Profit & Margin indicators */}
            <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400">Marge Brute Réalisée :</span>
              <div className="flex items-center gap-3 font-mono">
                <span className={`font-bold tabular-nums ${marginAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatMoney(marginAmount)}
                </span>
                <span className={`text-[11px] font-bold tabular-nums ${
                  marginPercent >= 25
                    ? 'text-emerald-400'
                    : marginPercent > 0
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}>
                  · {marginPercent.toFixed(1)}% de marge
                </span>
              </div>
            </div>
          </div>

          {/* Alert Threshold & Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Seuil d'Alerte Critique (Rupture) :
              </label>
              <input
                type="number"
                min="1"
                value={minThreshold}
                onChange={(e) => setMinThreshold(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono"
              />
              <span className="text-[10px] text-slate-500">
                Alerte visuelle dès que le stock passe sous cette quantité.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Fournisseur Principal :
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Ex: Patisen, Kirène, Grossiste Dakar"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
              />
            </div>
          </div>

          {/* Initial Stock per Boutique */}
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/80 space-y-3">
            <span className="text-xs font-bold text-slate-200">
              Niveaux de Stock Répartis par Boutique / Dépôt
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {boutiques.map((b) => (
                <div key={b.id} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                  <div className="text-[11px] font-semibold text-slate-300 truncate mb-1">
                    {b.name}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      value={stocks[b.id] ?? 0}
                      onChange={(e) =>
                        setStocks((prev) => ({
                          ...prev,
                          [b.id]: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-right font-mono text-xs text-white"
                    />
                    <span className="text-[10px] font-mono text-slate-400">{unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Favorite toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isFavorite"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-emerald-500 w-4 h-4"
            />
            <label htmlFor="isFavorite" className="text-xs font-medium text-slate-300 cursor-pointer">
              Afficher dans les favoris rapides de la caisse (POS)
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>{product ? 'Mettre à jour le produit' : 'Enregistrer le produit'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
