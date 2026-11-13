import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PurchaseItem, PurchaseOrder } from '../../types';
import { X, PackageCheck, Trash2, AlertTriangle } from 'lucide-react';

interface PurchaseReceptionModalProps {
  order: PurchaseOrder;
  onClose: () => void;
}

interface ReceptionLine extends PurchaseItem {
  orderedQuantity: number;
}

export const PurchaseReceptionModal: React.FC<PurchaseReceptionModalProps> = ({
  order,
  onClose,
}) => {
  const { boutiques, formatMoney, receivePurchaseOrder } = useApp();

  const [lines, setLines] = useState<ReceptionLine[]>(() =>
    order.items.map((item) => ({
      ...item,
      orderedQuantity: item.quantity,
    }))
  );

  const destBoutique = boutiques.find((b) => b.id === order.boutiqueId);

  const handleReceivedQtyChange = (index: number, qty: number) => {
    const safeQty = Math.max(0, qty);
    setLines((prev) =>
      prev.map((line, idx) =>
        idx === index
          ? {
              ...line,
              quantity: safeQty,
              total: Math.round(safeQty * line.unitCost),
            }
          : line
      )
    );
  };

  const handleUnitCostChange = (index: number, cost: number) => {
    const safeCost = Math.max(0, cost);
    setLines((prev) =>
      prev.map((line, idx) =>
        idx === index
          ? {
              ...line,
              unitCost: safeCost,
              total: Math.round(line.quantity * safeCost),
            }
          : line
      )
    );
  };

  const handleRemoveLine = (index: number) => {
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const activeLines = lines.filter((l) => l.quantity > 0);
  const subtotalHT = Math.round(activeLines.reduce((sum, l) => sum + l.total, 0));
  const vatAmount = Math.round(
    activeLines.reduce((sum, l) => sum + (l.total * l.vatRate) / 100, 0)
  );
  const totalTTC = subtotalHT + vatAmount;
  const hasDiscrepancy =
    lines.length !== order.items.length ||
    lines.some((l) => l.quantity !== l.orderedQuantity);

  const handleConfirmReception = () => {
    if (activeLines.length === 0) return;
    const finalItems: PurchaseItem[] = activeLines.map(
      ({ orderedQuantity: _ordered, ...rest }) => rest
    );
    receivePurchaseOrder(order.id, finalItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Réception en Stock · {order.orderNumber}
              </h2>
              <p className="text-xs text-slate-400">
                {order.supplierName} → {destBoutique?.name || 'Dépôt'} ({destBoutique?.city})
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
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          <p className="text-slate-300">
            Ajustez les quantités réellement livrées ou supprimez un produit non reçu avant de valider l'entrée en stock.
          </p>

          {lines.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-700 rounded-lg text-center text-slate-400">
              Tous les produits ont été retirés de la réception. Annulez cette fenêtre si vous souhaitez supprimer ou annuler le bon de commande.
            </div>
          ) : (
            <div className="border border-slate-800 rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Article & SKU</th>
                    <th className="py-2.5 px-2 text-center">Commandé</th>
                    <th className="py-2.5 px-2 text-center">Quantité Reçue</th>
                    <th className="py-2.5 px-2 text-right">Prix Unit. HT</th>
                    <th className="py-2.5 px-3 text-right">Total HT</th>
                    <th className="py-2.5 px-2 text-center w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {lines.map((line, idx) => {
                    const diff = line.quantity - line.orderedQuantity;
                    return (
                      <tr key={line.productId + idx} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-white">{line.productName}</div>
                          <div className="text-[10px] font-mono text-slate-400">{line.sku}</div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-400">
                          {line.orderedQuantity} {line.unit}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <input
                              type="number"
                              min={0}
                              value={line.quantity}
                              onChange={(e) =>
                                handleReceivedQtyChange(idx, Number(e.target.value) || 0)
                              }
                              className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-center font-mono font-bold text-white"
                            />
                            {diff !== 0 && (
                              <span
                                className={`text-[10px] font-mono font-semibold ${
                                  diff < 0 ? 'text-amber-400' : 'text-cyan-400'
                                }`}
                              >
                                {diff > 0 ? `+${diff}` : diff} {line.unit}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <input
                            type="number"
                            min={0}
                            value={line.unitCost}
                            onChange={(e) =>
                              handleUnitCostChange(idx, Number(e.target.value) || 0)
                            }
                            className="w-28 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-right font-mono text-white"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white tabular-nums">
                          {formatMoney(line.total)}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Retirer ce produit de la réception"
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

          {hasDiscrepancy && activeLines.length > 0 && (
            <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg flex items-center gap-2 text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Écart constaté par rapport au bon initial : seules les quantités reçues ci-dessus
                seront ajoutées au stock et facturées sur ce bon.
              </span>
            </div>
          )}

          {/* Summary */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>Montant initial commandé (TTC)</span>
              <span className="font-mono tabular-nums">{formatMoney(order.totalTTC)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Sous-total HT réceptionné</span>
              <span className="font-mono tabular-nums">{formatMoney(subtotalHT)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>TVA déductible</span>
              <span className="font-mono tabular-nums">{formatMoney(vatAmount)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-800">
              <span className="font-bold text-white">Total Réceptionné TTC</span>
              <span className="text-base font-extrabold font-mono text-emerald-400 tabular-nums">
                {formatMoney(totalTTC)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={activeLines.length === 0}
            onClick={handleConfirmReception}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg transition-colors shadow-sm whitespace-nowrap"
          >
            <PackageCheck className="w-4 h-4" />
            <span>Valider la Réception en Stock</span>
          </button>
        </div>
      </div>
    </div>
  );
};
