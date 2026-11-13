import React from 'react';
import { MainTab, useApp } from '../../context/AppContext';
import { CurrencyCode, UserRole } from '../../types';
import {
  ShoppingCart,
  Package,
  Truck,
  BarChart3,
  Users,
  Receipt,
  Building2,
  ArrowRight,
} from 'lucide-react';

const ROLE_DISPLAY: Record<UserRole, string> = {
  DIRECTRICE: 'Directrice / Propriétaire',
  GERANT: 'Gérant de Boutique',
  VENDEUR: 'Vendeur / Caissier',
  COMPTABLE: 'Comptable / Audit',
};

interface ModuleCardConfig {
  id: Exclude<MainTab, 'menu'>;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const MenuScreen: React.FC = () => {
  const {
    organization,
    currentUser,
    boutiques,
    selectedBoutiqueId,
    setActiveTab,
    canAccessTab,
    currency,
    setCurrency,
  } = useApp();

  const isSeller = currentUser.role === 'VENDEUR';
  const activeBoutique = boutiques.find((b) => b.id === selectedBoutiqueId);
  const scopeLabel =
    selectedBoutiqueId === 'all' ? 'Toutes les boutiques' : activeBoutique?.name || 'Boutique';

  const allModules: ModuleCardConfig[] = [
    {
      id: 'pos',
      title: 'Comptoir de vente (POS)',
      icon: ShoppingCart,
    },
    {
      id: 'expenses',
      title: isSeller ? 'Saisie des dépenses' : 'Dépenses & Résultat (P&L)',
      icon: Receipt,
    },
    {
      id: 'stock',
      title: 'Stocks & Inventaire',
      icon: Package,
    },
    {
      id: 'purchases',
      title: 'Achats & Fournisseurs',
      icon: Truck,
    },
    {
      id: 'analytics',
      title: 'Analytics & Rapports BI',
      icon: BarChart3,
    },
    {
      id: 'sales_reps',
      title: 'Vendeurs & Objectifs',
      icon: Users,
    },
    {
      id: 'admin',
      title: 'Organisation & Profils',
      icon: Building2,
    },
  ];

  const availableModules = allModules.filter((m) => canAccessTab(m.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Workspace Header & Currency Preference */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-extrabold tracking-tight text-white [text-wrap:balance]">
            Menu Principal
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-200">{currentUser.name}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-medium">{ROLE_DISPLAY[currentUser.role]}</span>
            <span aria-hidden="true">·</span>
            <span>{organization.tradeName}</span>
            <span aria-hidden="true">·</span>
            <span>{scopeLabel}</span>
          </div>
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-slate-400">Devise :</span>
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
            {(['XOF', 'EUR', 'USD'] as CurrencyCode[]).map((cur) => (
              <button
                key={cur}
                type="button"
                onClick={() => setCurrency(cur)}
                className={`px-3 py-1 rounded-md font-mono text-xs font-semibold transition-colors whitespace-nowrap ${
                  currency === cur
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cur === 'XOF' ? 'FCFA' : cur}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Modules Grid */}
      <div
        className={
          isSeller
            ? 'grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl'
            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
        }
      >
        {availableModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => setActiveTab(mod.id)}
              className="group bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/80 rounded-xl p-5 text-left transition-all flex items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 group-hover:border-emerald-400 flex items-center justify-center transition-colors shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-white truncate">
                  {mod.title}
                </h2>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
