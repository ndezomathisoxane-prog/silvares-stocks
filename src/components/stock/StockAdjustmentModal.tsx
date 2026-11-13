import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, ArrowDownRight, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface StockAdjustmentModalProps {
  onClose: () => void;
  defaultProductId?: string;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  onClose,
  defaultProductId,
}) => {
  const { products, boutiques, selectedBoutiqueId, recordStockAdjustment, formatMoney } = useApp();

  const [type, setType] = useState<'RECEPTION_FOURNISSEUR' | 'CASSE_PERTE'>('RECEPTION_FOURNISSEUR');
  const [productId, setProductId] = useState<string>(defaultProductId || (products[0]?.id ?? ''));
  const [boutiqueId, setBoutiqueId] = useState<string>(
    selectedBoutiqueId === 'all' ? (boutiques[0]?.id ?? 'b1') : selectedBoutiqueId
  );
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(() => {
    const p = products.find((prod) => prod.id === (defaultProductId || products[0]?.id));
    return p ? p.purchasePrice : 1000;
  });
  const [reference, setReference] = useState('BL-FOURN-');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const selectedProduct = products.find((p) => p.id === productId);

  const handleProductChange = (id: string) => {
    setProductId(id);
    const p = products.find((prod) => prod.id === id);
    if (p) setUnitCost(p.purchasePrice);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || quantity <= 0) return;

    recordStockAdjustment({
      productId,
      boutiqueId,
      type,
      quantity,
      unitCost: type === 'RECEPTION_FOURNISSEUR' ? unitCost : undefined,
      reference: reference.trim() || (type === 'RECEPTION_FOURNISSEUR' ? 'BL-RECEPT' : 'CASSE-SORTIE'),
      reason,
    });

    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">
            {type === 'RECEPTION_FOURNISSEUR'
              ? 'Réception Fournisseur (Entrée Stock)'
              : 'Déclaration de Perte / Casse (Sortie Stock)'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Mouvement de stock enregistré !</h3>
            <p className="text-xs text-slate-300">
              Le stock a été actualisé en temps réel avec calcul automatique du CUMP.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Movement Type Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setType('RECEPTION_FOURNISSEUR')}
                className={`py-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
                  type === 'RECEPTION_FOURNISSEUR'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>Entrée / Réception Fournisseur</span>
              </button>
              <button
                type="button"
                onClick={() => setType('CASSE_PERTE')}
                className={`py-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
                  type === 'CASSE_PERTE'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Sortie / Casse / Péremption</span>
              </button>
            </div>

            {/* Product & Boutique */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Article concerné :
                </label>
                <select
                  value={productId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Point de vente ou Dépôt :
                </label>
                <select
                  value={boutiqueId}
                  onChange={(e) => setBoutiqueId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {boutiques.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Quantité {type === 'RECEPTION_FOURNISSEUR' ? 'reçue' : 'perdue'} :
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white"
                    />
                    <span className="text-xs text-slate-400 font-mono">
                      {selectedProduct?.unit}
                    </span>
                  </div>
                </div>

                {type === 'RECEPTION_FOURNISSEUR' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Prix d'achat unitaire (CUMP) :
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={unitCost}
                      onChange={(e) => setUnitCost(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white"
                    />
                  </div>
                )}
              </div>

              {type === 'RECEPTION_FOURNISSEUR' && (
                <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/60 text-[11px] text-slate-300 flex justify-between">
                  <span>Valorisation totale de la livraison :</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatMoney(quantity * unitCost)}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  N° Bon de Livraison (BL) / Facture Fournisseur :
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex: BL-PATS-9982"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motif / Justification :
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    type === 'RECEPTION_FOURNISSEUR'
                      ? 'Réapprovisionnement stock mensuel'
                      : 'Bouteille brisée lors de la manutention en rayon'
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            {/* Actions */}
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
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm ${
                  type === 'RECEPTION_FOURNISSEUR'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                Valider le Mouvement
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
