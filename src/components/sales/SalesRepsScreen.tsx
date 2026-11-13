import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SalesRepGoal } from '../../types';
import {
  Users,
  Trophy,
  Target,
  Percent,
  ShieldCheck,
  Edit3,
  Award,
  AlertTriangle,
  TrendingUp,
  X,
  Check,
} from 'lucide-react';

export const SalesRepsScreen: React.FC = () => {
  const {
    users,
    sales,
    boutiques,
    selectedBoutiqueId,
    salesRepGoals,
    updateSalesRepGoal,
    shiftClosures,
    formatMoney,
  } = useApp();

  // Active month
  const currentMonth = '2026-11';
  const [editingGoal, setEditingGoal] = useState<SalesRepGoal | null>(null);
  const [targetInput, setTargetInput] = useState<number>(1500000);
  const [commRateInput, setCommRateInput] = useState<number>(2.5);

  // Filter sellers (role VENDEUR or GERANT)
  const sellers = users.filter((u) => u.role === 'VENDEUR' || u.role === 'GERANT');

  // Compute stats for each seller
  const sellerStats = sellers.map((seller) => {
    const boutique = boutiques.find((b) => b.id === seller.boutiqueId);

    // Sales made by this seller
    const sellerSales = sales.filter(
      (s) => s.sellerId === seller.id && s.status === 'COMPLETED'
    );

    const ca = sellerSales.reduce((sum, s) => sum + s.total, 0);
    const ticketsCount = sellerSales.length;
    const averageBasket = ticketsCount > 0 ? ca / ticketsCount : 0;

    // Goal and commission
    const goal =
      salesRepGoals.find((g) => g.sellerId === seller.id && g.month === currentMonth) || {
        sellerId: seller.id,
        sellerName: seller.name,
        boutiqueId: seller.boutiqueId,
        month: currentMonth,
        monthlyTarget: 1500000,
        commissionRate: 2.5,
      };

    const achievementRate =
      goal.monthlyTarget > 0 ? (ca / goal.monthlyTarget) * 100 : 0;

    // Commission = CA * commissionRate / 100
    const commissionEarned = (ca * goal.commissionRate) / 100;

    // Shift closures for this seller (Audit caisse)
    const closures = shiftClosures.filter((c) => c.sellerId === seller.id);
    const totalVariances = closures.reduce((sum, c) => sum + c.variance, 0);
    const perfectClosures = closures.filter((c) => c.variance === 0).length;
    const reliabilityRate =
      closures.length > 0 ? (perfectClosures / closures.length) * 100 : 100;

    return {
      seller,
      boutique,
      ca,
      ticketsCount,
      averageBasket,
      goal,
      achievementRate,
      commissionEarned,
      closuresCount: closures.length,
      totalVariances,
      reliabilityRate,
    };
  });

  // Sort by CA descending for Leaderboard
  const sortedByCA = [...sellerStats].sort((a, b) => b.ca - a.ca);

  const handleOpenEditGoal = (goal: SalesRepGoal) => {
    setEditingGoal(goal);
    setTargetInput(goal.monthlyTarget);
    setCommRateInput(goal.commissionRate);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;

    updateSalesRepGoal({
      ...editingGoal,
      monthlyTarget: Number(targetInput) || 1000000,
      commissionRate: Number(commRateInput) || 2.0,
    });

    setEditingGoal(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Performance Commerciale & Commissions
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Suivi des quotas mensuels (Novembre 2026), commissions sur CA et audit sécurité de caisse.
          </p>
        </div>
      </div>

      {/* Top Leaderboard Podium */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-white">
              Classement Général des Vendeurs (Mois en Cours)
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Objectifs Novembre 2026</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
          {sortedByCA.slice(0, 3).map((item, index) => {
            const rankColors = [
              { border: 'border-amber-500/40', badge: 'bg-amber-400 text-slate-950', title: '1er Prix - Vendeur Étoile' },
              { border: 'border-slate-400/40', badge: 'bg-slate-300 text-slate-950', title: '2e du Réseau' },
              { border: 'border-amber-700/40', badge: 'bg-amber-600 text-white', title: '3e du Réseau' },
            ];
            const cfg = rankColors[index] || rankColors[2];

            return (
              <div
                key={item.seller.id}
                className={`p-4 bg-slate-800/40 rounded-xl border ${cfg.border} relative overflow-hidden flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded ${cfg.badge}`}>
                      #{index + 1} {cfg.title}
                    </span>
                    <span className="text-xs text-slate-400">{item.boutique?.name}</span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1">{item.seller.name}</h3>
                  <div className="text-xs text-slate-400">{item.seller.email}</div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/60 space-y-2">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-400">CA Réalisé :</span>
                    <span className="text-base font-extrabold font-mono text-emerald-400 tabular-nums">
                      {formatMoney(item.ca)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Taux d'atteinte quota :</span>
                      <span className={`font-bold ${item.achievementRate >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {item.achievementRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.achievementRate >= 100 ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                        style={{ width: `${Math.min(100, item.achievementRate)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-700/40">
                    <span className="text-slate-400">Commission générée :</span>
                    <span className="font-mono font-bold text-cyan-400">
                      {formatMoney(item.commissionEarned)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comprehensive Sales Rep Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Détail Individuel & Audit Caisse par Vendeur
          </h2>
          <span className="text-xs text-slate-400">{sellers.length} commerciaux actifs</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedByCA.map((item) => (
            <div
              key={item.seller.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-all shadow-sm"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{item.seller.name}</h3>
                  <div className="text-xs text-emerald-400 mt-0.5">{item.boutique?.name}</div>
                  <div className="text-[11px] text-slate-500">{item.seller.phone}</div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenEditGoal(item.goal)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Modifier l'objectif ou le taux de commission"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Performance numbers */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-800/40 rounded-lg border border-slate-700/60 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">CA Encaissé</span>
                  <span className="font-mono font-bold text-emerald-400 tabular-nums">
                    {formatMoney(item.ca)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Panier Moyen</span>
                  <span className="font-mono font-bold text-white tabular-nums">
                    {formatMoney(item.averageBasket)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Tickets Générés</span>
                  <span className="font-mono font-bold text-white tabular-nums">
                    {item.ticketsCount} transactions
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Commission ({item.goal.commissionRate}%)</span>
                  <span className="font-mono font-bold text-cyan-400 tabular-nums">
                    {formatMoney(item.commissionEarned)}
                  </span>
                </div>
              </div>

              {/* Goal progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Objectif mensuel :</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {formatMoney(item.goal.monthlyTarget)}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.achievementRate >= 100 ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.min(100, item.achievementRate)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>Atteinte :</span>
                  <span className="font-bold text-emerald-400">
                    {item.achievementRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Cash Register Security / Shift audit */}
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Fiabilité Caisse :
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {item.reliabilityRate.toFixed(0)}% sans écart
                  </span>
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>Clôtures de shifts auditées :</span>
                  <span>{item.closuresCount} sessions</span>
                </div>
                {item.totalVariances !== 0 && (
                  <div className="flex justify-between text-[11px] font-mono text-rose-400">
                    <span>Cumul écarts constatés :</span>
                    <span>{formatMoney(item.totalVariances)}</span>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Edit Goal Sub-Modal */}
      {editingGoal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">
                Paramétrer Objectif & Commission
              </h3>
              <button
                onClick={() => setEditingGoal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Vendeur :
                </label>
                <input
                  type="text"
                  disabled
                  value={editingGoal.sellerName}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Objectif Mensuel de CA (FCFA) :
                </label>
                <input
                  type="number"
                  min="0"
                  step="50000"
                  value={targetInput}
                  onChange={(e) => setTargetInput(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Taux de Commission sur CA (%) :
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={commRateInput}
                    onChange={(e) => setCommRateInput(Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white font-mono"
                  />
                  <span className="text-xs font-mono text-slate-400">%</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingGoal(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
