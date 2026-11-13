import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TransferNote } from '../../types';
import { X, ArrowRightLeft, Plus, Trash2, Printer, CheckCircle } from 'lucide-react';

interface StockTransferModalProps {
  onClose: () => void;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({ onClose }) => {
  const { boutiques, products, transferStock, getProductStockInBoutique } = useApp();

  const [sourceId, setSourceId] = useState<string>('b3'); // Default from Depot
  const [destId, setDestId] = useState<string>('b1'); // Default to Plateau
  const [transferItems, setTransferItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: products[0]?.id || '', quantity: 10 },
  ]);
  const [notes, setNotes] = useState('');
  const [createdNote, setCreatedNote] = useState<TransferNote | null>(null);

  const addItemRow = () => {
    setTransferItems((prev) => [...prev, { productId: products[0]?.id || '', quantity: 5 }]);
  };

  const removeItemRow = (idx: number) => {
    setTransferItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItemRow = (idx: number, field: 'productId' | 'quantity', value: any) => {
    setTransferItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceId === destId) {
      alert('La boutique source et destination doivent être différentes.');
      return;
    }

    if (transferItems.length === 0) return;

    const note = transferStock(sourceId, destId, transferItems, notes);
    setCreatedNote(note);
  };

  const sourceBoutique = boutiques.find((b) => b.id === sourceId);
  const destBoutique = boutiques.find((b) => b.id === destId);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Transfert de Stock Inter-Boutiques</h2>
              <div className="text-xs text-slate-400">
                Génération de Bon d'Expédition & Réception multi-sites
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

        {createdNote ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Transfert validé ! Le stock du dépôt expéditeur a été décrémenté et celui du magasin destinataire a été incrémenté.
              </span>
            </div>

            {/* Bon de Transfert Preview */}
            <div className="bg-white text-slate-950 p-6 rounded-lg font-mono text-xs shadow-md border border-slate-200">
              <div className="text-center pb-3 border-b border-slate-300">
                <h3 className="font-extrabold text-sm uppercase">SILVARES STOCKS</h3>
                <div className="text-[11px] font-bold text-slate-800 mt-0.5">
                  BON DE TRANSFERT INTER-MAGASINS N° {createdNote.transferNumber}
                </div>
                <div className="text-[10px] text-slate-600">
                  Date: {new Date(createdNote.date).toLocaleString('fr-FR')}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-300 text-[11px]">
                <div>
                  <div className="font-bold text-slate-700">EXPÉDITEUR (DÉPART) :</div>
                  <div className="font-semibold text-slate-900">{sourceBoutique?.name}</div>
                  <div className="text-slate-600">{sourceBoutique?.city}</div>
                </div>
                <div>
                  <div className="font-bold text-slate-700">DESTINATAIRE (ARRIVÉE) :</div>
                  <div className="font-semibold text-slate-900">{destBoutique?.name}</div>
                  <div className="text-slate-600">{destBoutique?.city}</div>
                </div>
              </div>

              <div className="py-3 border-b border-slate-300">
                <div className="flex justify-between font-bold text-[11px] pb-1 border-b border-slate-200">
                  <span>DÉSIGNATION ARTICLE</span>
                  <span className="text-right">QUANTITÉ TRANSFÉRÉE</span>
                </div>
                <div className="space-y-1 pt-1.5">
                  {createdNote.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.productName}</span>
                      <span className="font-bold tabular-nums">{item.quantity} unités</span>
                    </div>
                  ))}
                </div>
              </div>

              {createdNote.notes && (
                <div className="py-2 text-[10px] text-slate-600 italic">
                  Observation : {createdNote.notes}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 text-[10px] text-slate-700">
                <div>Visa Magasinier Expéditeur : __________________</div>
                <div>Visa Gérant Réceptionnaire : __________________</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-lg flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer le Bon de Transfert</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg"
              >
                Terminer
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            
            {/* Origin & Destination */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-800/40 rounded-xl border border-slate-700">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  1. Boutique / Dépôt Source (Départ) :
                </label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  {boutiques.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city}) {b.isDepot ? '★ Dépôt' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  2. Boutique Destinataire (Arrivée) :
                </label>
                <select
                  value={destId}
                  onChange={(e) => setDestId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  {boutiques.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transfer Items list */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Articles à transférer</span>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une référence</span>
                </button>
              </div>

              <div className="space-y-2">
                {transferItems.map((item, idx) => {
                  const availableInSource = getProductStockInBoutique(item.productId, sourceId);
                  const isExceeded = item.quantity > availableInSource;

                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2.5 bg-slate-800/60 rounded-lg border border-slate-700"
                    >
                      <div className="flex-1">
                        <select
                          value={item.productId}
                          onChange={(e) => updateItemRow(idx, 'productId', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                        >
                          {products.map((p) => {
                            const stockCount = getProductStockInBoutique(p.id, sourceId);
                            return (
                              <option key={p.id} value={p.id}>
                                {p.name} (Dispo source : {stockCount} {p.unit})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemRow(idx, 'quantity', Number(e.target.value) || 1)
                          }
                          className={`w-full px-2 py-1.5 bg-slate-900 border rounded text-xs font-mono text-white text-right ${
                            isExceeded ? 'border-rose-500 text-rose-400' : 'border-slate-700'
                          }`}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        disabled={transferItems.length === 1}
                        className="text-slate-500 hover:text-rose-400 p-1 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Instructions ou motif de transport :
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Réapprovisionnement avant rush du weekend - Chauffeur Moussa"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
              />
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
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors shadow-sm"
              >
                Générer Bon & Transférer
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
