import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sale } from '../../types';
import { X, Search, RotateCcw, CheckCircle, Eye } from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';

interface ReturnsModalProps {
  onClose: () => void;
}

export const ReturnsModal: React.FC<ReturnsModalProps> = ({ onClose }) => {
  const { sales, selectedBoutiqueId, processReturn, formatMoney } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState('Article défectueux / Non conforme');
  const [viewTicketSale, setViewTicketSale] = useState<Sale | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Filter sales for active boutique or all
  const filteredSales = sales.filter((s) => {
    const isSameBoutique = selectedBoutiqueId === 'all' || s.boutiqueId === selectedBoutiqueId;
    if (!isSameBoutique) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.ticketNumber.toLowerCase().includes(q) ||
      (s.customerName && s.customerName.toLowerCase().includes(q)) ||
      s.sellerName.toLowerCase().includes(q)
    );
  });

  const openReturnForSale = (sale: Sale) => {
    const initial: Record<string, number> = {};
    sale.items.forEach((item) => {
      if (item.quantity > 0) {
        initial[item.productId] = 0;
      }
    });
    setReturnQuantities(initial);
    setSelectedSale(sale);
  };

  const setProductReturnNegQty = (productId: string, maxSoldQty: number, nextNegQty: number) => {
    const clamped = Math.max(-maxSoldQty, Math.min(0, Math.round(nextNegQty)));
    setReturnQuantities((prev) => ({
      ...prev,
      [productId]: clamped,
    }));
  };

  const selectAllForReturn = () => {
    if (!selectedSale) return;
    const allNeg: Record<string, number> = {};
    selectedSale.items.forEach((item) => {
      if (item.quantity > 0) {
        allNeg[item.productId] = -item.quantity;
      }
    });
    setReturnQuantities(allNeg);
  };

  const clearReturnSelection = () => {
    if (!selectedSale) return;
    const zeros: Record<string, number> = {};
    selectedSale.items.forEach((item) => {
      if (item.quantity > 0) {
        zeros[item.productId] = 0;
      }
    });
    setReturnQuantities(zeros);
  };

  const selectedReturnUnits = selectedSale
    ? selectedSale.items.reduce(
        (sum, item) => sum + Math.abs(returnQuantities[item.productId] ?? 0),
        0
      )
    : 0;

  const selectedRefundTotal = selectedSale
    ? selectedSale.items.reduce((sum, item) => {
        if (item.quantity <= 0) return sum;
        const retCount = Math.abs(returnQuantities[item.productId] ?? 0);
        if (retCount === 0) return sum;
        const unitNet = item.total / item.quantity;
        return sum - Math.round(unitNet * retCount);
      }, 0)
    : 0;

  const isFullSelectedReturn = selectedSale
    ? selectedSale.items.every(
        (item) =>
          item.quantity <= 0 || Math.abs(returnQuantities[item.productId] ?? 0) === item.quantity
      )
    : false;

  const handleConfirmReturn = () => {
    if (!selectedSale || selectedReturnUnits === 0) return;

    const positiveQuantities: Record<string, number> = {};
    selectedSale.items.forEach((item) => {
      const count = Math.abs(returnQuantities[item.productId] ?? 0);
      if (count > 0) {
        positiveQuantities[item.productId] = (positiveQuantities[item.productId] || 0) + count;
      }
    });

    processReturn(selectedSale.id, returnReason, positiveQuantities);
    setSuccessMessage(
      isFullSelectedReturn
        ? `Le ticket ${selectedSale.ticketNumber} a été entièrement annulé. Tous les articles ont été réintégrés en stock.`
        : `Retour par produit enregistré (${selectedReturnUnits} article${selectedReturnUnits > 1 ? 's' : ''}, avoir ${formatMoney(selectedRefundTotal)}) pour le ticket ${selectedSale.ticketNumber}.`
    );
    setSelectedSale(null);
    setReturnQuantities({});
    setTimeout(() => {
      setSuccessMessage('');
    }, 4500);
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[85vh]">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Historique des Ventes & Retours par Produit</h2>
                <div className="text-xs text-slate-400">
                  Sélectionnez un ticket et saisissez une quantité négative (-1, -2...) sur les produits retournés
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search bar */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par N° ticket (ex: TKT-2026-001) ou nom du client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {successMessage && (
            <div className="m-4 p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Content Body: Split view or Ticket List */}
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            {filteredSales.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Aucun ticket correspondant à votre recherche.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSales.map((sale) => {
                  const isCreditNote = sale.total < 0 || sale.items.some((i) => i.quantity < 0);
                  const canReturn =
                    sale.status !== 'RETURNED' && sale.items.some((i) => i.quantity > 0);

                  return (
                    <div
                      key={sale.id}
                      className={`p-3.5 rounded-lg border transition-all ${
                        sale.status === 'RETURNED'
                          ? 'bg-slate-900/40 border-slate-800 opacity-60'
                          : isCreditNote
                          ? 'bg-amber-950/15 border-amber-800/40'
                          : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-white">
                            {sale.ticketNumber}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(sale.date).toLocaleDateString('fr-FR')} {new Date(sale.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[11px] text-slate-400">·</span>
                          <span className="text-[11px] text-slate-300">
                            Vendeur: <span className="font-medium">{sale.sellerName}</span>
                          </span>
                          {sale.customerName && (
                            <>
                              <span className="text-[11px] text-slate-400">·</span>
                              <span className="text-[11px] text-emerald-400">
                                Client: {sale.customerName}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {sale.status === 'RETURNED' ? (
                            <span className="text-[10px] font-semibold text-rose-400 bg-rose-950/50 border border-rose-800/40 px-2 py-0.5 rounded">
                              Ticket Retourné / Annulé
                            </span>
                          ) : isCreditNote ? (
                            <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/50 border border-amber-800/40 px-2 py-0.5 rounded">
                              Avoir / Retour Produit
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded">
                              Encaissé
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Items row */}
                      <div className="text-xs text-slate-300 flex items-center justify-between border-t border-slate-800/60 pt-2">
                        <div className="text-[11px] text-slate-400 truncate max-w-md">
                          {sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(' · ')}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`font-mono font-bold text-xs tabular-nums ${
                              sale.total < 0 ? 'text-amber-400' : 'text-white'
                            }`}
                          >
                            {formatMoney(sale.total)}
                          </span>

                          <button
                            type="button"
                            onClick={() => setViewTicketSale(sale)}
                            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                            title="Voir le ticket"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canReturn && (
                            <button
                              type="button"
                              onClick={() => openReturnForSale(sale)}
                              className="px-2.5 py-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 bg-amber-950/40 border border-amber-800/40 rounded hover:bg-amber-900/40 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Retour par produit
                            </button>
                          )}
                        </div>
                      </div>

                      {sale.returnReason && (
                        <div
                          className={`mt-2 text-[10px] px-2 py-1 rounded ${
                            sale.status === 'RETURNED'
                              ? 'text-rose-400 bg-rose-950/20'
                              : 'text-amber-300 bg-amber-950/20'
                          }`}
                        >
                          Motif de retour : {sale.returnReason} (le {new Date(sale.returnedAt || sale.date).toLocaleDateString('fr-FR')})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Return Confirmation Sub-Modal */}
          {selectedSale && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-60 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-lg w-full shadow-2xl flex flex-col max-h-[85vh]">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Retour par produit · {selectedSale.ticketNumber}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Indiquez une quantité négative (-1, -2...) pour chaque produit à reprendre en stock.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={selectAllForReturn}
                      className="px-2 py-1 text-[11px] font-medium text-amber-300 bg-amber-950/50 border border-amber-700/50 hover:bg-amber-900/50 rounded transition-colors whitespace-nowrap"
                    >
                      Tout reprendre
                    </button>
                    <button
                      type="button"
                      onClick={clearReturnSelection}
                      className="px-2 py-1 text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors whitespace-nowrap"
                    >
                      RAZ
                    </button>
                  </div>
                </div>

                {/* Per-product return list */}
                <div className="my-3 border border-slate-800 rounded-lg divide-y divide-slate-800 overflow-y-auto max-h-60 bg-slate-950/40">
                  {selectedSale.items
                    .filter((item) => item.quantity > 0)
                    .map((item) => {
                      const negQty = returnQuantities[item.productId] ?? 0;
                      const unitNet = item.total / item.quantity;
                      const lineRefund = Math.round(unitNet * negQty);

                      return (
                        <div
                          key={item.productId}
                          className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                            negQty < 0 ? 'bg-amber-950/20' : ''
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-white truncate">
                              {item.productName}
                            </div>
                            <div className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
                              Vendu : {item.quantity} × {formatMoney(Math.round(unitNet))}
                              {negQty < 0 && (
                                <span className="ml-2 text-amber-400 font-semibold">
                                  · Avoir {formatMoney(lineRefund)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setProductReturnNegQty(item.productId, item.quantity, negQty - 1)
                              }
                              disabled={negQty <= -item.quantity}
                              className="w-7 h-7 rounded bg-slate-800 hover:bg-amber-600 hover:text-slate-950 disabled:opacity-40 disabled:hover:bg-slate-800 disabled:hover:text-slate-400 text-amber-400 font-bold text-xs flex items-center justify-center transition-colors"
                              title="Augmenter la quantité retournée (-1)"
                            >
                              -
                            </button>

                            <input
                              type="number"
                              min={-item.quantity}
                              max={0}
                              value={negQty}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === '') {
                                  setProductReturnNegQty(item.productId, item.quantity, 0);
                                  return;
                                }
                                const parsed = parseInt(raw, 10);
                                if (Number.isNaN(parsed)) return;
                                const normalized = parsed > 0 ? -parsed : parsed;
                                setProductReturnNegQty(item.productId, item.quantity, normalized);
                              }}
                              aria-label={`Quantité retournée pour ${item.productName}`}
                              className={`w-14 h-7 text-center font-mono text-xs font-bold tabular-nums rounded border focus:outline-none ${
                                negQty < 0
                                  ? 'bg-amber-950/60 border-amber-500/60 text-amber-300'
                                  : 'bg-slate-800 border-slate-700 text-slate-300'
                              }`}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                setProductReturnNegQty(item.productId, item.quantity, negQty + 1)
                              }
                              disabled={negQty >= 0}
                              className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs flex items-center justify-center transition-colors"
                              title="Diminuer la quantité retournée"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Refund summary */}
                <div className="p-3 bg-slate-800/50 border border-slate-800 rounded-lg flex items-center justify-between mb-3 text-xs">
                  <span className="text-slate-300">
                    Total à rembourser ({selectedReturnUnits} unité{selectedReturnUnits > 1 ? 's' : ''}) :
                  </span>
                  <span className="font-mono font-extrabold text-sm text-amber-400 tabular-nums">
                    {formatMoney(selectedRefundTotal)}
                  </span>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Motif obligatoire du retour :
                  </label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Article défectueux / Non conforme">Article défectueux / Non conforme</option>
                    <option value="Erreur de référence ou de taille">Erreur de référence ou de taille</option>
                    <option value="Changement d'avis du client">Changement d'avis du client</option>
                    <option value="Erreur de saisie caisse">Erreur de saisie caisse</option>
                    <option value="Autre motif justifié">Autre motif justifié</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSale(null);
                      setReturnQuantities({});
                    }}
                    className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReturn}
                    disabled={selectedReturnUnits === 0}
                    className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap"
                  >
                    Valider le Retour ({selectedReturnUnits})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
            >
              Fermer
            </button>
          </div>

        </div>
      </div>

      {/* Ticket Viewer if eye clicked */}
      {viewTicketSale && (
        <ReceiptModal
          sale={viewTicketSale}
          onClose={() => setViewTicketSale(null)}
        />
      )}
    </>
  );
};
