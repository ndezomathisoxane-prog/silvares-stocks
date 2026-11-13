import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Calculator, AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';

interface ShiftClosureModalProps {
  onClose: () => void;
}

export const ShiftClosureModal: React.FC<ShiftClosureModalProps> = ({ onClose }) => {
  const {
    sales,
    selectedBoutiqueId,
    currentUser,
    formatMoney,
    recordShiftClosure,
    getCashRegisterSummary,
  } = useApp();

  const [closureType, setClosureType] = useState<'X' | 'Z'>('Z');
  const [openingCash, setOpeningCash] = useState<number>(50000); // 50,000 FCFA float
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Cash denomination counter
  const [denominations, setDenominations] = useState<{ [key: number]: number }>({
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
    500: 0,
    250: 0,
    200: 0,
    100: 0,
    50: 0,
  });

  // Calculate today's sales for this boutique
  const todaySales = sales.filter((s) => {
    const isSameBoutique = selectedBoutiqueId === 'all' || s.boutiqueId === selectedBoutiqueId;
    return isSameBoutique && s.status === 'COMPLETED';
  });

  let totalCash = 0;
  let totalWave = 0;
  let totalOrange = 0;
  let totalMomo = 0;
  let totalCard = 0;
  let totalCredit = 0;

  todaySales.forEach((sale) => {
    sale.payments.forEach((p) => {
      if (p.method === 'ESPECES') totalCash += p.amount;
      else if (p.method === 'WAVE') totalWave += p.amount;
      else if (p.method === 'ORANGE_MONEY') totalOrange += p.amount;
      else if (p.method === 'MTN_MOMO') totalMomo += p.amount;
      else if (p.method === 'CARTE_BANCAIRE') totalCard += p.amount;
      else if (p.method === 'CREDIT_CLIENT') totalCredit += p.amount;
    });
  });

  const totalSalesAmount = totalCash + totalWave + totalOrange + totalMomo + totalCard + totalCredit;

  const { cashExpenses: totalCashExpenses, cashExpenseItems } =
    getCashRegisterSummary(selectedBoutiqueId);

  // Expected physical cash in drawer = opening float + cash collected - cash expenses
  const expectedCashInDrawer = openingCash + totalCash - totalCashExpenses;

  // Counted cash calculated from breakdown
  const countedCash = Object.entries(denominations).reduce(
    (sum, [denom, count]) => sum + Number(denom) * count,
    0
  );

  const variance = countedCash - expectedCashInDrawer;

  const handleDenomChange = (val: number, count: number) => {
    setDenominations((prev) => ({
      ...prev,
      [val]: Math.max(0, count),
    }));
  };

  const handleQuickFillCount = () => {
    // Quick populate exact matching counts for demo convenience
    const fillable = Math.max(0, expectedCashInDrawer);
    const tens = Math.floor(fillable / 10000);
    const rem1 = fillable % 10000;
    const fives = Math.floor(rem1 / 5000);
    const rem2 = rem1 % 5000;
    const twos = Math.floor(rem2 / 2000);
    const rem3 = rem2 % 2000;
    const ones = Math.floor(rem3 / 1000);
    const rem4 = rem3 % 1000;
    const fiveHundreds = Math.floor(rem4 / 500);

    setDenominations({
      10000: tens,
      5000: fives,
      2000: twos,
      1000: ones,
      500: fiveHundreds,
      250: 0,
      200: 0,
      100: 0,
      50: 0,
    });
  };

  const handleSaveClosure = () => {
    recordShiftClosure({
      boutiqueId: selectedBoutiqueId === 'all' ? 'b1' : selectedBoutiqueId,
      sellerId: currentUser.id,
      sellerName: currentUser.name,
      type: closureType,
      openingCash,
      expectedCash: expectedCashInDrawer,
      countedCash,
      variance,
      totalSales: totalSalesAmount,
      totalWave,
      totalOrange,
      totalMomo,
      totalCard,
      totalCredit,
      totalCashExpenses,
      notes,
    });
    setIsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Clôture de Caisse & Rapprochement</h2>
              <div className="text-xs text-slate-400">
                Caissier: <span className="text-slate-200">{currentUser.name}</span> · {new Date().toLocaleDateString('fr-FR')}
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

        {isSubmitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">
              Clôture {closureType} enregistrée avec succès !
            </h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              Le rapport de caisse a été archivé. Les totaux et les écarts de caisse ont été transmis au module d'audit commercial et financier.
            </p>
            <div className="p-3 bg-slate-800/80 rounded-lg text-xs font-mono max-w-xs mx-auto border border-slate-700">
              {totalCashExpenses > 0 && (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Dépenses déduites:</span>
                  <span className="font-bold text-rose-400 tabular-nums">-{formatMoney(totalCashExpenses)}</span>
                </div>
              )}
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Espèces comptées:</span>
                <span className="font-bold text-white tabular-nums">{formatMoney(countedCash)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Écart enregistré:</span>
                <span className={`font-bold tabular-nums ${variance === 0 ? 'text-emerald-400' : variance < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {variance === 0 ? '0 FCFA' : formatMoney(variance)}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
            >
              Fermer et retourner au comptoir
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Mode selection */}
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-800">
              <div>
                <div className="text-xs font-semibold text-slate-200">Type de rapport</div>
                <div className="text-[11px] text-slate-400">
                  {closureType === 'Z'
                    ? 'Clôture journalière définitive (fin de shift / fermeture)'
                    : 'Rapport X provisoire d’étape sans remise à zéro'}
                </div>
              </div>
              <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => setClosureType('X')}
                  className={`px-3 py-1 text-xs font-semibold rounded ${
                    closureType === 'X' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Rapport X
                </button>
                <button
                  type="button"
                  onClick={() => setClosureType('Z')}
                  className={`px-3 py-1 text-xs font-semibold rounded ${
                    closureType === 'Z' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Clôture Z
                </button>
              </div>
            </div>

            {/* Sales breakdown recap */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60">
                <span className="text-[11px] text-slate-400">Ventes Espèces</span>
                <div className="text-sm font-bold font-mono text-emerald-400 tabular-nums">
                  {formatMoney(totalCash)}
                </div>
              </div>
              <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60">
                <span className="text-[11px] text-slate-400">Mobile Wave</span>
                <div className="text-sm font-bold font-mono text-cyan-400 tabular-nums">
                  {formatMoney(totalWave)}
                </div>
              </div>
              <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60">
                <span className="text-[11px] text-slate-400">Orange Money / MoMo</span>
                <div className="text-sm font-bold font-mono text-orange-400 tabular-nums">
                  {formatMoney(totalOrange + totalMomo)}
                </div>
              </div>
              <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60">
                <span className="text-[11px] text-slate-400">CB & Crédits</span>
                <div className="text-sm font-bold font-mono text-purple-400 tabular-nums">
                  {formatMoney(totalCard + totalCredit)}
                </div>
              </div>
            </div>

            {/* Drawer reconciliation calculation */}
            <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                <span className="text-xs text-slate-300">Fond de caisse initial :</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(Number(e.target.value) || 0)}
                    className="w-28 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-mono text-xs text-white"
                  />
                  <span className="text-xs font-mono text-slate-400">FCFA</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Total Espèces encaissées (Ventes) :</span>
                <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                  +{formatMoney(totalCash)}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">
                    Dépenses déduites de la caisse ({cashExpenseItems.length}) :
                  </span>
                  <span className="font-mono font-semibold text-rose-400 tabular-nums">
                    -{formatMoney(totalCashExpenses)}
                  </span>
                </div>

                {cashExpenseItems.length > 0 && (
                  <div className="pl-3 border-l border-slate-700 space-y-1 max-h-24 overflow-y-auto">
                    {cashExpenseItems.map((exp) => (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between text-[11px] text-slate-400 gap-2"
                      >
                        <span className="truncate">
                          <span className="font-mono text-slate-500">{exp.reference}</span> · {exp.description}
                        </span>
                        <span className="font-mono text-rose-400 tabular-nums shrink-0">
                          -{formatMoney(exp.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-slate-700/60 text-white">
                <span>Espèces Théoriques Attendues dans le Tiroir :</span>
                <span
                  className={`font-mono tabular-nums ${
                    expectedCashInDrawer < 0 ? 'text-rose-400' : 'text-emerald-300'
                  }`}
                >
                  {formatMoney(expectedCashInDrawer)}
                </span>
              </div>
            </div>

            {/* Physical cash count breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">
                    Comptage Physique des Billets & Pièces
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleQuickFillCount}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium"
                >
                  Remplir comptage exact théorique
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[10000, 5000, 2000, 1000, 500, 250, 200, 100, 50].map((denom) => (
                  <div
                    key={denom}
                    className="flex items-center justify-between p-2 bg-slate-800/60 rounded border border-slate-700 text-xs"
                  >
                    <span className="font-mono text-slate-300 font-semibold">{denom} F</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">x</span>
                      <input
                        type="number"
                        min="0"
                        value={denominations[denom] || 0}
                        onChange={(e) => handleDenomChange(denom, Number(e.target.value) || 0)}
                        className="w-14 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-right font-mono text-white text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Variance summary banner */}
            <div className={`p-4 rounded-lg border ${
              variance === 0
                ? 'bg-emerald-950/30 border-emerald-500/40'
                : variance < 0
                ? 'bg-rose-950/30 border-rose-500/40'
                : 'bg-amber-950/30 border-amber-500/40'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {variance === 0 ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className={`w-5 h-5 ${variance < 0 ? 'text-rose-400' : 'text-amber-400'}`} />
                  )}
                  <div>
                    <div className="text-xs font-bold text-white">
                      {variance === 0
                        ? 'Caisse Parfaitement Équilibrée'
                        : variance < 0
                        ? 'Déficit / Manquant de Caisse Détecté'
                        : 'Excédent de Caisse Constaté'}
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Compté : <span className="font-mono font-bold text-white">{formatMoney(countedCash)}</span> · Attendu : <span className="font-mono text-slate-300">{formatMoney(expectedCashInDrawer)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Écart de Caisse</div>
                  <div className={`text-base font-extrabold font-mono tabular-nums ${
                    variance === 0
                      ? 'text-emerald-400'
                      : variance < 0
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}>
                    {variance > 0 ? `+${formatMoney(variance)}` : formatMoney(variance)}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes / explanation */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Observations & Justifications (optionnel) :
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Exemple : Écart de 500 F dû à une erreur de rendu sur ticket TKT-004..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveClosure}
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors shadow-sm"
              >
                Valider la Clôture {closureType}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
