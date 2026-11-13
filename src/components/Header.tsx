import React, { useState } from 'react';
import { MainTab, useApp } from '../context/AppContext';
import { User } from '../types';
import {
  Store,
  RefreshCw,
  ChevronDown,
  User as UserIcon,
  Building2,
  Shield,
  KeyRound,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  LayoutGrid,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    organization,
    activeTab,
    setActiveTab,
    openAdminSection,
    boutiques,
    selectedBoutiqueId,
    setSelectedBoutiqueId,
    users,
    currentUser,
    switchUserWithPassword,
    logout,
    resetToDefaults,
  } = useApp();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showBoutiqueMenu, setShowBoutiqueMenu] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Profile switch password modal state
  const [pendingSwitchUser, setPendingSwitchUser] = useState<User | null>(null);
  const [switchPassword, setSwitchPassword] = useState('');
  const [showSwitchPassword, setShowSwitchPassword] = useState(false);
  const [switchError, setSwitchError] = useState('');

  const activeBoutique = boutiques.find((b) => b.id === selectedBoutiqueId);
  const activeUsers = users.filter((u) => u.isActive);
  const isSeller = currentUser.role === 'VENDEUR';
  const isBoutiqueLockedForSeller = isSeller && currentUser.boutiqueId !== 'all';

  const tabTitles: Record<MainTab, string> = {
    menu: 'Menu Principal',
    pos: 'Comptoir POS',
    stock: 'Stocks & Inventaire',
    purchases: 'Achats & Fournisseurs',
    analytics: 'Analytics BI',
    sales_reps: 'Vendeurs & Objectifs',
    expenses: isSeller ? 'Saisie des Dépenses' : 'Dépenses & P&L',
    admin: 'Organisation & Profils',
  };

  const handleOpenSwitchModal = (targetUser: User) => {
    setShowRoleMenu(false);
    if (targetUser.id === currentUser.id) return;
    setPendingSwitchUser(targetUser);
    setSwitchPassword('');
    setShowSwitchPassword(false);
    setSwitchError('');
  };

  const handleConfirmSwitchUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingSwitchUser) return;
    const res = switchUserWithPassword(pendingSwitchUser.id, switchPassword);
    if (!res.ok) {
      setSwitchError(res.error || 'Mot de passe incorrect.');
      return;
    }
    setPendingSwitchUser(null);
    setSwitchPassword('');
    setSwitchError('');
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        
        {/* Zone 1: Brand wordmark + quiet active section indicator */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className="flex items-center gap-2.5 shrink-0 hover:opacity-90 transition-opacity"
            title="Retour au Menu principal"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-extrabold text-lg tracking-tight">
              {organization.tradeName.charAt(0).toUpperCase()}
            </div>
            <span className="text-base lg:text-lg font-bold tracking-tight text-white whitespace-nowrap">
              {organization.tradeName}
            </span>
          </button>

          {activeTab !== 'menu' && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 min-w-0">
              <span aria-hidden="true">/</span>
              <span className="font-medium text-slate-200 truncate">{tabTitles[activeTab]}</span>
            </div>
          )}
        </div>

        {/* Zone 2: Clean single Menu navigation control */}
        <nav className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'menu'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Menu</span>
          </button>
        </nav>

        {/* Zone 3: Context Controls & User Account Menu */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          {/* Boutique Selector Dropdown (locked to assigned boutique for VENDEUR) */}
          <div className="relative">
            {isBoutiqueLockedForSeller ? (
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800/70 border border-slate-700/80 rounded-lg text-xs font-medium text-slate-300 whitespace-nowrap"
                title="Boutique affectée à votre profil vendeur"
              >
                <Store className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xl:inline max-w-[140px] truncate">
                  {activeBoutique?.name || 'Boutique'}
                </span>
                <Lock className="w-3 h-3 text-slate-500" />
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    setShowBoutiqueMenu(!showBoutiqueMenu);
                    setShowRoleMenu(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
                  title="Changer de boutique active"
                >
                  <Store className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden xl:inline max-w-[130px] truncate">
                    {selectedBoutiqueId === 'all' ? 'Toutes les boutiques' : activeBoutique?.name}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showBoutiqueMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 z-50">
                    <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 border-b border-slate-800">
                      Sélectionner un point de vente
                    </div>
                    <button
                      onClick={() => {
                        setSelectedBoutiqueId('all');
                        setShowBoutiqueMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 ${
                        selectedBoutiqueId === 'all' ? 'text-emerald-400 font-semibold bg-slate-800/60' : 'text-slate-300'
                      }`}
                    >
                      <span>Vue Réseau (Toutes les boutiques)</span>
                      {selectedBoutiqueId === 'all' && <span className="text-emerald-400 text-xs">Actif</span>}
                    </button>
                    {boutiques.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setSelectedBoutiqueId(b.id);
                          setShowBoutiqueMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 ${
                          selectedBoutiqueId === b.id ? 'text-emerald-400 font-semibold bg-slate-800/60' : 'text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-slate-200">{b.name}</div>
                          <div className="text-[10px] text-slate-400">{b.city} · {b.code}</div>
                        </div>
                        {selectedBoutiqueId === b.id && <span className="text-emerald-400 text-xs">Actif</span>}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* User Profile & Account Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowRoleMenu(!showRoleMenu);
                setShowBoutiqueMenu(false);
              }}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
              title="Mon profil et gestion du compte"
            >
              <div className="w-5 h-5 rounded-full bg-slate-700 text-emerald-400 font-bold flex items-center justify-center text-[11px]">
                {currentUser.name.charAt(0)}
              </div>
              <span className="hidden sm:inline font-medium max-w-[110px] truncate">{currentUser.name}</span>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                {currentUser.role}
              </span>
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50">
                <div className="px-3.5 py-2.5 border-b border-slate-800">
                  <div className="text-xs font-bold text-white">{currentUser.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
                </div>

                {/* Quick Admin & Profile Links (restricted for VENDEUR) */}
                {!isSeller && (
                  <div className="py-1 border-b border-slate-800">
                    <button
                      onClick={() => {
                        openAdminSection('profile');
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Mon Profil & Code PIN</span>
                    </button>
                    <button
                      onClick={() => {
                        openAdminSection('users');
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Shield className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Gestion Profils Utilisateurs</span>
                    </button>
                    <button
                      onClick={() => {
                        openAdminSection('organization');
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Configuration Organisation</span>
                    </button>
                    <button
                      onClick={() => {
                        openAdminSection('login_config');
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                      <span>Paramètres Écran de Connexion</span>
                    </button>
                  </div>
                )}

                {/* Switch User (Password Required) */}
                <div className="px-3.5 py-1.5 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>Changer de profil</span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Mot de passe requis
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {activeUsers.map((u) => {
                    const isCurrent = currentUser.id === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleOpenSwitchModal(u)}
                        className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                          isCurrent ? 'bg-slate-800/80 text-white' : 'text-slate-300'
                        }`}
                      >
                        <span className="truncate pr-2">{u.name}</span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-emerald-400">
                            {u.role}
                          </span>
                          {isCurrent ? (
                            <span className="text-[10px] text-slate-400">(Actif)</span>
                          ) : (
                            <Lock className="w-3 h-3 text-slate-500" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
                
                <div className="p-2 border-t border-slate-800 space-y-1.5">
                  <button
                    onClick={() => {
                      setShowRoleMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-950/30 rounded border border-amber-900/30 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Déconnexion / Écran de connexion</span>
                  </button>
                  {!isSeller && (
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        setShowResetConfirm(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-rose-400 hover:bg-rose-950/30 rounded border border-rose-900/30 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Réinitialiser les données de démo</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Password Verification Modal for Profile Switching */}
      {pendingSwitchUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmSwitchUser}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 font-bold flex items-center justify-center text-sm shrink-0">
                  {pendingSwitchUser.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-400">Changement de profil</div>
                  <h3 className="text-sm font-bold text-white truncate">
                    {pendingSwitchUser.name}
                  </h3>
                  <div className="text-[11px] font-mono text-emerald-400">
                    {pendingSwitchUser.role}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingSwitchUser(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {switchError && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 rounded-lg flex items-center gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{switchError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mot de passe de {pendingSwitchUser.name} :
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showSwitchPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={switchPassword}
                  onChange={(e) => {
                    setSwitchPassword(e.target.value);
                    setSwitchError('');
                  }}
                  placeholder="Saisissez le mot de passe du profil"
                  className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSwitchPassword(!showSwitchPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showSwitchPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {organization.loginSettings.showQuickDemoProfiles && (
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Mot de passe par défaut des comptes démo : <span className="font-mono text-slate-300">admin</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingSwitchUser(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors"
              >
                Ouvrir ce profil
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Modal for Demo Data Reset */}
      {showResetConfirm && !isSeller && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Réinitialiser les données ?</h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Cela va remettre l’organisation, les profils utilisateurs, les stocks, les ventes et les dépenses à leur état de démonstration initial.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  resetToDefaults();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-sm"
              >
                Confirmer la réinitialisation
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
