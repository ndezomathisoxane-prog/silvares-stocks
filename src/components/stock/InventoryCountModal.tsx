import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, ClipboardCheck, AlertTriangle, CheckCircle, Search, Printer } from 'lucide-react';

interface InventoryCountModalProps {
  onClose: () => void;
}

export const InventoryCountModal: React.FC<InventoryCountModalProps> = ({ onClose }) => {
  const {
    products,
    boutiques,
    selectedBoutiqueId,
    recordStockAdjustment,
    getProductStockInBoutique,
    formatMoney,
    organization,
    currentUser,
  } = useApp();

  const [activeBoutiqueId, setActiveBoutiqueId] = useState<string>(
    selectedBoutiqueId === 'all' ? 'b1' : selectedBoutiqueId
  );
  const [searchFilter, setSearchFilter] = useState('');
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Map of counted stock: productId -> countedQty
  const [countedMap, setCountedMap] = useState<{ [productId: string]: number }>(() => {
    const map: { [productId: string]: number } = {};
    products.forEach((p) => {
      map[p.id] = getProductStockInBoutique(p.id, activeBoutiqueId);
    });
    return map;
  });

  const handleBoutiqueChange = (bId: string) => {
    setActiveBoutiqueId(bId);
    const map: { [productId: string]: number } = {};
    products.forEach((p) => {
      map[p.id] = getProductStockInBoutique(p.id, bId);
    });
    setCountedMap(map);
  };

  const handleCountChange = (productId: string, val: number) => {
    setCountedMap((prev) => ({
      ...prev,
      [productId]: Math.max(0, val),
    }));
  };

  const filteredProducts = products.filter((p) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  // Calculate totals
  let totalTheoreticalUnits = 0;
  let totalCountedUnits = 0;
  let totalNetFinancialVariance = 0;
  let itemsWithVarianceCount = 0;

  products.forEach((p) => {
    const theo = getProductStockInBoutique(p.id, activeBoutiqueId);
    const counted = countedMap[p.id] ?? theo;
    const diff = counted - theo;

    totalTheoreticalUnits += theo;
    totalCountedUnits += counted;
    totalNetFinancialVariance += diff * p.purchasePrice;

    if (diff !== 0) itemsWithVarianceCount++;
  });

  const handleApplyAdjustment = () => {
    const ref = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    products.forEach((p) => {
      const theo = getProductStockInBoutique(p.id, activeBoutiqueId);
      const counted = countedMap[p.id] ?? theo;
      if (counted !== theo) {
        recordStockAdjustment({
          productId: p.id,
          boutiqueId: activeBoutiqueId,
          type: 'AJUSTEMENT_INVENTAIRE',
          quantity: counted, // sets the new exact counted quantity
          reference: ref,
          reason: `Régularisation inventaire physique (Écart de ${counted - theo} ${p.unit})`,
        });
      }
    });

    setSessionCompleted(true);
  };

  const targetBoutique = boutiques.find((b) => b.id === activeBoutiqueId);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        id="printable-inventory-session"
        className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
      >
        {/* Formal Print-Only Header */}
        <div className="hidden print:flex items-start justify-between border-b-2 border-slate-800 pb-3 mb-3">
          <div>
            <div className="text-base font-extrabold uppercase">{organization.tradeName}</div>
            <div className="text-xs font-semibold">{organization.name}</div>
            <div className="text-[10px]">
              {organization.address}, {organization.city} · Tél : {organization.phone}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-extrabold uppercase">Fiche d'Écarts d'Inventaire Physique</div>
            <div className="text-xs font-semibold">
              Boutique : {targetBoutique?.name} ({targetBoutique?.city})
            </div>
            <div className="text-[10px]">
              Édité le {new Date().toLocaleDateString('fr-FR')} à{' '}
              {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} ·{' '}
              Par {currentUser?.name || 'Administrateur'}
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="no-print p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Session d'Inventaire Physique Périodique</h2>
              <div className="text-xs text-slate-400">
                Pointage des stocks réels, détection automatique des écarts et régularisation traçable
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!sessionCompleted && (
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Imprimer Fiche</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {sessionCompleted ? (
          <div className="p-10 text-center space-y-4">
            <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">
              Inventaire régularisé avec succès pour {targetBoutique?.name} !
            </h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              Toutes les fiches de stock ont été mises à jour avec les quantités physiques comptées.
              Les écritures de variation de stock ont été enregistrées avec traçabilité complète.
            </p>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors"
              >
                Fermer la session
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Top Toolbar: Boutique Picker & Quick Search */}
            <div className="no-print p-4 border-b border-slate-800 bg-slate-850 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">Boutique auditée :</span>
                <select
                  value={activeBoutiqueId}
                  onChange={(e) => handleBoutiqueChange(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                >
                  {boutiques.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrer un article..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500"
                />
              </div>
            </div>

            {/* Financial & Unit Variance KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-900 border-b border-slate-800">
              <div className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">Unités Théoriques</div>
                <div className="text-sm font-bold font-mono text-slate-200 tabular-nums">
                  {totalTheoreticalUnits}
                </div>
              </div>
              <div className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">Unités Comptées</div>
                <div className="text-sm font-bold font-mono text-emerald-400 tabular-nums">
                  {totalCountedUnits}
                </div>
              </div>
              <div className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">Articles avec Écart</div>
                <div className={`text-sm font-bold font-mono tabular-nums ${itemsWithVarianceCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {itemsWithVarianceCount} réf.
                </div>
              </div>
              <div className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">Impact Financier Net</div>
                <div className={`text-sm font-bold font-mono tabular-nums ${
                  totalNetFinancialVariance === 0
                    ? 'text-emerald-400'
                    : totalNetFinancialVariance < 0
                    ? 'text-rose-400'
                    : 'text-cyan-400'
                }`}>
                  {formatMoney(totalNetFinancialVariance)}
                </div>
              </div>
            </div>

            {/* Items Counting Table */}
            <div className="p-4 overflow-y-auto flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                      <th className="py-2.5 px-3">Article & SKU</th>
                      <th className="py-2.5 px-3 text-right">Stock Informatique</th>
                      <th className="py-2.5 px-3 text-center">Stock Physique Compté</th>
                      <th className="py-2.5 px-3 text-right">Écart Unitaire</th>
                      <th className="py-2.5 px-3 text-right">Impact Financier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredProducts.map((p) => {
                      const theo = getProductStockInBoutique(p.id, activeBoutiqueId);
                      const counted = countedMap[p.id] ?? theo;
                      const diff = counted - theo;
                      const varianceMoney = diff * p.purchasePrice;

                      return (
                        <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-white">{p.name}</div>
                            <div className="text-[10px] font-mono text-slate-500">{p.sku} · {p.category.split(' & ')[0]}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300">
                            {theo} {p.unit}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1 print:hidden">
                              <input
                                type="number"
                                min="0"
                                value={counted}
                                onChange={(e) => handleCountChange(p.id, Number(e.target.value) || 0)}
                                className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-center font-mono font-bold text-white text-xs"
                              />
                              <span className="text-[10px] text-slate-500 font-mono">{p.unit}</span>
                            </div>
                            <span className="hidden print:inline font-mono font-bold">
                              {counted} {p.unit}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            {diff === 0 ? (
                              <span className="text-slate-500 font-medium">0</span>
                            ) : diff > 0 ? (
                              <span className="text-cyan-400 font-bold">+{diff}</span>
                            ) : (
                              <span className="text-rose-400 font-bold">{diff}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                            {varianceMoney === 0 ? (
                              <span className="text-slate-500">-</span>
                            ) : (
                              <span className={varianceMoney > 0 ? 'text-cyan-400' : 'text-rose-400'}>
                                {formatMoney(varianceMoney)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Print-Only Signatures Footer */}
            <div className="hidden print:grid grid-cols-3 gap-6 pt-6 mt-4 border-t border-slate-300 text-[11px]">
              <div>
                <div className="font-bold">Visa Inventoriste</div>
                <div className="h-10 border-b border-dashed border-slate-400 mt-2" />
              </div>
              <div>
                <div className="font-bold">Visa Gérant / Contrôle</div>
                <div className="h-10 border-b border-dashed border-slate-400 mt-2" />
              </div>
              <div>
                <div className="font-bold">Date & Cachet</div>
                <div className="h-10 border-b border-dashed border-slate-400 mt-2" />
              </div>
            </div>

            {/* Footer */}
            <div className="no-print p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="text-xs text-slate-400">
                {itemsWithVarianceCount > 0 ? (
                  <span className="text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {itemsWithVarianceCount} écart(s) détecté(s) qui seront régularisés en base de données.
                  </span>
                ) : (
                  <span className="text-emerald-400">
                    Aucun écart constaté. Le stock informatique est en conformité avec le comptage physique.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleApplyAdjustment}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors shadow-sm"
                >
                  Valider et Appliquer l'Inventaire
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
