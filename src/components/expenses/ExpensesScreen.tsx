import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ExpenseCategory, ExpensePaymentSource, ExpenseStatus } from '../../types';
import {
  Receipt,
  Plus,
  CheckCircle,
  Clock,
  FileCheck,
  XCircle,
  TrendingDown,
  Building,
  Check,
  X,
  FileText,
  DollarSign,
  PieChart,
} from 'lucide-react';

export const ExpensesScreen: React.FC = () => {
  const {
    expenses,
    addExpense,
    updateExpenseStatus,
    deleteExpense,
    boutiques,
    selectedBoutiqueId,
    sales,
    currentUser,
    formatMoney,
    getCashRegisterSummary,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | ExpenseStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New expense form
  const [category, setCategory] = useState<ExpenseCategory>('Loyer & Charges Locatives');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(50000);
  const [paymentSource, setPaymentSource] = useState<ExpensePaymentSource>('CAISSE');
  const [targetBoutiqueId, setTargetBoutiqueId] = useState<string>(
    selectedBoutiqueId === 'all' ? (boutiques[0]?.id ?? 'b1') : selectedBoutiqueId
  );
  const [receiptNumber, setReceiptNumber] = useState('');

  // Categories list
  const categories: ExpenseCategory[] = [
    'Loyer & Charges Locatives',
    'Salaires & Primes',
    'Transport & Logistique',
    'Eau, Électricité & Internet',
    'Fournitures & Emballages',
    'Maintenance & Entretien',
    'Taxes & Frais Administratifs',
  ];

  // Filter expenses
  const filteredExpenses = expenses.filter((e) => {
    if (selectedBoutiqueId !== 'all' && e.boutiqueId !== selectedBoutiqueId) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    return true;
  });

  // Financial P&L express calculation
  const relevantSales = sales.filter((s) => {
    if (s.status !== 'COMPLETED') return false;
    if (selectedBoutiqueId !== 'all' && s.boutiqueId !== selectedBoutiqueId) return false;
    return true;
  });

  const totalCA = relevantSales.reduce((sum, s) => sum + s.total, 0);

  const totalCOGS = relevantSales.reduce((sum, s) => {
    return (
      sum + s.items.reduce((c, item) => c + item.purchasePrice * item.quantity, 0)
    );
  }, 0);

  const totalGrossMargin = Math.max(0, totalCA - totalCOGS);

  // Total validated expenses
  const validatedExpenses = expenses.filter((e) => {
    if (selectedBoutiqueId !== 'all' && e.boutiqueId !== selectedBoutiqueId) return false;
    return e.status === 'VALIDE';
  });

  const totalValidatedExpensesAmount = validatedExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Operating Net Profit = Gross Margin - Validated Expenses
  const netOperatingProfit = totalGrossMargin - totalValidatedExpensesAmount;
  const netMarginRate = totalCA > 0 ? (netOperatingProfit / totalCA) * 100 : 0;

  // Breakdown by category
  const expensesByCategory: { [cat: string]: number } = {};
  validatedExpenses.forEach((e) => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
  });

  const cashSummary = getCashRegisterSummary(selectedBoutiqueId);

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) return;

    addExpense({
      boutiqueId: targetBoutiqueId,
      category,
      description: description.trim(),
      amount: Number(amount) || 0,
      date: new Date().toISOString().split('T')[0],
      paymentSource,
      requestedBy: currentUser.name,
      receiptNumber: receiptNumber.trim() || undefined,
    });

    setShowAddModal(false);
    setDescription('');
    setAmount(50000);
    setPaymentSource('CAISSE');
    setReceiptNumber('');
  };

  const isSeller = currentUser.role === 'VENDEUR';
  const canApprove =
    currentUser.role === 'DIRECTRICE' ||
    currentUser.role === 'GERANT' ||
    currentUser.role === 'COMPTABLE';

  useEffect(() => {
    if (isSeller && currentUser.boutiqueId !== 'all') {
      setTargetBoutiqueId(currentUser.boutiqueId);
    } else if (selectedBoutiqueId !== 'all') {
      setTargetBoutiqueId(selectedBoutiqueId);
    } else if (boutiques[0]?.id) {
      setTargetBoutiqueId(boutiques[0].id);
    }
  }, [isSeller, currentUser.boutiqueId, selectedBoutiqueId, boutiques]);

  const activeBoutique = boutiques.find((b) => b.id === selectedBoutiqueId);
  const boutiqueLabel = selectedBoutiqueId === 'all' ? 'Toutes les boutiques' : activeBoutique?.name;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Title & Primary Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            {isSeller ? 'Saisie des Dépenses' : 'Gestion des Dépenses & Résultat Net (P&L)'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isSeller
              ? `Enregistrement et suivi des dépenses courantes (${boutiqueLabel}).`
              : `Circuit d'approbation et rapprochement financier en temps réel (${boutiqueLabel}).`}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Engager une Dépense</span>
        </button>
      </div>

      {/* P&L Express Summary Dashboard (hidden for VENDEUR) */}
      {isSeller ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[11px] text-slate-400">Dépenses saisies (boutique)</span>
            <div className="text-lg font-bold font-mono text-white tabular-nums mt-0.5">
              {filteredExpenses.length}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Suivi de vos demandes de décaissement
            </div>
          </div>
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[11px] text-slate-400">En attente de validation</span>
            <div className="text-lg font-bold font-mono text-amber-400 tabular-nums mt-0.5">
              {formatMoney(
                filteredExpenses
                  .filter((e) => e.status === 'EN_ATTENTE')
                  .reduce((sum, e) => sum + e.amount, 0)
              )}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Soumises à la Direction / Gérance
            </div>
          </div>
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[11px] text-slate-400">Déduit de la caisse (Espèces)</span>
            <div className="text-lg font-bold font-mono text-rose-400 tabular-nums mt-0.5">
              -{formatMoney(cashSummary.cashExpenses)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {cashSummary.cashExpenseItems.length} sortie(s) de caisse
            </div>
          </div>
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[11px] text-slate-400">Solde net caisse espèces</span>
            <div
              className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${
                cashSummary.netCash >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatMoney(cashSummary.netCash)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono tabular-nums">
              Ventes espèces ({formatMoney(cashSummary.cashSales)}) - Dépenses
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Compte de Résultat Simplifié en Temps Réel (P&L Express)
              </h2>
            </div>
            <div className="text-[11px] font-mono tabular-nums text-slate-300">
              Caisse Espèces :{' '}
              <span className="text-rose-400">-{formatMoney(cashSummary.cashExpenses)}</span> déduits
              {' · '}
              Solde net :{' '}
              <span className={cashSummary.netCash >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {formatMoney(cashSummary.netCash)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-slate-400">1. Chiffre d'Affaires (CA)</span>
              <div className="text-lg font-bold font-mono text-white tabular-nums mt-0.5">
                {formatMoney(totalCA)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Dont Coût Marchandises : -{formatMoney(totalCOGS)}
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-slate-400">2. Marge Commerciale Brute</span>
              <div className="text-lg font-bold font-mono text-cyan-400 tabular-nums mt-0.5">
                {formatMoney(totalGrossMargin)}
              </div>
              <div className="text-[10px] text-cyan-300 mt-0.5 font-mono">
                {totalCA > 0 ? ((totalGrossMargin / totalCA) * 100).toFixed(1) : 0}% du CA
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-slate-400">3. Charges d'Exploitation (Validées)</span>
              <div className="text-lg font-bold font-mono text-rose-400 tabular-nums mt-0.5">
                -{formatMoney(totalValidatedExpensesAmount)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {validatedExpenses.length} factures payées · {formatMoney(cashSummary.cashExpenses)} en caisse
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border ${
              netOperatingProfit >= 0
                ? 'bg-emerald-950/30 border-emerald-500/40'
                : 'bg-rose-950/30 border-rose-500/40'
            }`}>
              <span className="text-[11px] text-slate-300 font-semibold">
                4. Résultat Net d'Exploitation (Bénéfice)
              </span>
              <div className={`text-xl font-extrabold font-mono tabular-nums mt-0.5 ${
                netOperatingProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {formatMoney(netOperatingProfit)}
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5 font-mono">
                Marge Nette : <strong>{netMarginRate.toFixed(1)}%</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expenses Ledger & Approval Workflow */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm space-y-4">
        
        {/* Filters bar */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/50">
          
          {/* Status selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'all', label: 'Toutes les dépenses' },
              { id: 'EN_ATTENTE', label: 'En attente d’approbation' },
              { id: 'VALIDE', label: 'Validées & Payées' },
              { id: 'BROUILLON', label: 'Brouillons' },
              { id: 'REJETE', label: 'Rejetées' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id as any)}
                className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === st.id
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Expenses List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                <th className="py-3 px-4">Réf & Date</th>
                <th className="py-3 px-4">Catégorie & Libellé</th>
                <th className="py-3 px-4">Boutique</th>
                <th className="py-3 px-4 text-right">Montant</th>
                <th className="py-3 px-4 text-center">Statut Circuit</th>
                <th className="py-3 px-4 text-center">Actions d'Approbation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredExpenses.map((exp) => {
                const b = boutiques.find((bt) => bt.id === exp.boutiqueId);

                return (
                  <tr key={exp.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-white">{exp.reference}</div>
                      <div className="text-[10px] text-slate-400">{exp.date}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-white font-medium line-clamp-1">{exp.description}</div>
                      <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-emerald-400">{exp.category}</span>
                        <span>·</span>
                        <span
                          className={
                            (exp.paymentSource ?? 'CAISSE') === 'CAISSE' && exp.status !== 'REJETE' && exp.status !== 'BROUILLON'
                              ? 'text-amber-300 font-medium'
                              : 'text-slate-400'
                          }
                        >
                          {(exp.paymentSource ?? 'CAISSE') === 'CAISSE'
                            ? 'Caisse (Déduit)'
                            : exp.paymentSource === 'MOBILE_MONEY'
                            ? 'Mobile Money'
                            : 'Banque / Virement'}
                        </span>
                        {exp.receiptNumber && (
                          <span>· Réf Justif : {exp.receiptNumber}</span>
                        )}
                        <span>· Émis par : {exp.requestedBy}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      <span>{b?.name}</span>
                      <div className="text-[10px] text-slate-500">{b?.city}</div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-400 tabular-nums">
                      {formatMoney(exp.amount)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          exp.status === 'VALIDE'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20'
                            : exp.status === 'EN_ATTENTE'
                            ? 'bg-amber-950/60 text-amber-400 border border-amber-500/20'
                            : exp.status === 'REJETE'
                            ? 'bg-rose-950/60 text-rose-400 border border-rose-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {exp.status === 'VALIDE'
                          ? 'Validé / Payé'
                          : exp.status === 'EN_ATTENTE'
                          ? 'En attente validation'
                          : exp.status === 'REJETE'
                          ? 'Rejeté'
                          : 'Brouillon'}
                      </span>
                      {exp.approvedBy && (
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          Par {exp.approvedBy} ({exp.approvedAt})
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {exp.status === 'EN_ATTENTE' && canApprove && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateExpenseStatus(exp.id, 'VALIDE')}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold rounded flex items-center gap-1 transition-colors"
                              title="Valider et imputer en comptabilité"
                            >
                              <Check className="w-3 h-3" />
                              <span>Valider</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => updateExpenseStatus(exp.id, 'REJETE')}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-rose-950/40 text-rose-400 text-[11px] font-medium rounded border border-slate-700 hover:border-rose-800 transition-colors"
                              title="Rejeter cette dépense"
                            >
                              <X className="w-3 h-3" />
                              <span>Rejeter</span>
                            </button>
                          </>
                        )}

                        {exp.status === 'BROUILLON' && (
                          <button
                            type="button"
                            onClick={() => updateExpenseStatus(exp.id, 'EN_ATTENTE')}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium rounded transition-colors"
                          >
                            Soumettre
                          </button>
                        )}

                        {exp.status === 'VALIDE' && (
                          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Imputé
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredExpenses.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-xs">
            Aucune dépense ne correspond aux critères de filtre.
          </div>
        )}

        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between items-center bg-slate-900/60">
          <span>{filteredExpenses.length} lignes de frais affichées</span>
          <span>Cumul des charges affichées : <strong className="text-rose-400 font-mono">{formatMoney(filteredExpenses.reduce((s, e) => s + e.amount, 0))}</strong></span>
        </div>

      </div>

      {/* New Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                Engager une Nouvelle Dépense d'Exploitation
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Catégorie de charge :
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description détaillée de la dépense * :
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Facture Senelec Novembre ou Achat bobines de papier thermique"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Montant de la dépense (FCFA) * :
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Boutique imputée :
                  </label>
                  <select
                    value={targetBoutiqueId}
                    disabled={isSeller && currentUser.boutiqueId !== 'all'}
                    onChange={(e) => setTargetBoutiqueId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {boutiques.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Source de décaissement :
                </label>
                <select
                  value={paymentSource}
                  onChange={(e) => setPaymentSource(e.target.value as ExpensePaymentSource)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="CAISSE">Caisse boutique (Espèces — déduit automatiquement de la caisse)</option>
                  <option value="BANQUE">Banque / Virement (hors tiroir-caisse)</option>
                  <option value="MOBILE_MONEY">Mobile Money (Wave / Orange Money)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  N° Quittance / Facture / Justificatif :
                </label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="Ex: QUITT-LOY-099 ou FACT-SENELEC-881"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div className="p-3 bg-slate-800/40 rounded-lg text-[11px] text-slate-400">
                {paymentSource === 'CAISSE'
                  ? 'Ce montant sera immédiatement déduit du solde espèces de la caisse (et pris en compte lors de la clôture X/Z).'
                  : 'Cette dépense entrera dans le circuit de validation sans impacter les espèces du tiroir-caisse.'}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg shadow-sm"
                >
                  Enregistrer la dépense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
