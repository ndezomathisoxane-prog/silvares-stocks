/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { MenuScreen } from './components/menu/MenuScreen';
import { POSScreen } from './components/pos/POSScreen';
import { StockScreen } from './components/stock/StockScreen';
import { PurchasesScreen } from './components/purchases/PurchasesScreen';
import { AnalyticsScreen } from './components/analytics/AnalyticsScreen';
import { SalesRepsScreen } from './components/sales/SalesRepsScreen';
import { ExpensesScreen } from './components/expenses/ExpensesScreen';
import { AdminScreen } from './components/admin/AdminScreen';
import { LoginScreen } from './components/auth/LoginScreen';

const MainContent: React.FC = () => {
  const {
    isAuthenticated,
    organization,
    activeTab,
    boutiques,
    currentBoutique,
    selectedBoutiqueId,
    currentUser,
  } = useApp();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const isSeller = currentUser.role === 'VENDEUR';

  return (
    <div className="min-h-full flex flex-col bg-slate-950 text-slate-100">
      {/* Header Navigation */}
      <Header />

      {/* Main Viewport Screen */}
      <main className="flex-1 pb-12">
        {(activeTab === 'menu' ||
          (isSeller && activeTab !== 'pos' && activeTab !== 'expenses')) && <MenuScreen />}
        {activeTab === 'pos' && <POSScreen />}
        {activeTab === 'expenses' && <ExpensesScreen />}
        {!isSeller && activeTab === 'stock' && <StockScreen />}
        {!isSeller && activeTab === 'purchases' && <PurchasesScreen />}
        {!isSeller && activeTab === 'analytics' && <AnalyticsScreen />}
        {!isSeller && activeTab === 'sales_reps' && <SalesRepsScreen />}
        {!isSeller && activeTab === 'admin' && <AdminScreen />}
      </main>

      {/* Clean quiet footer */}
      <footer className="border-t border-slate-900 bg-slate-950 text-slate-500 text-xs py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">{organization.tradeName}</span>
            <span>·</span>
            <span>{organization.name}</span>
            <span>·</span>
            <span className="text-emerald-400/80">NINEA {organization.taxId}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
            <span>Réseau : {boutiques.length} site(s) actif(s)</span>
            <span>·</span>
            <span>Boutique active : {selectedBoutiqueId === 'all' ? 'Toutes' : currentBoutique?.name}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
