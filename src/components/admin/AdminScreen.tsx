import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Boutique,
  BusinessSector,
  CurrencyCode,
  Organization,
  User,
  UserRole,
} from '../../types';
import {
  Building2,
  Check,
  Edit2,
  KeyRound,
  Lock,
  LogOut,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Store,
  Trash2,
  User as UserIcon,
  UserCheck,
  UserPlus,
  UserX,
  X,
  AlertCircle,
} from 'lucide-react';

const ROLE_LABELS: Record<UserRole, string> = {
  DIRECTRICE: 'Directrice / Propriétaire',
  GERANT: 'Gérant de Boutique',
  VENDEUR: 'Vendeur / Caissier',
  COMPTABLE: 'Comptable / Audit',
};

const ROLE_PERMISSIONS_MATRIX: {
  role: UserRole;
  description: string;
  pos: string;
  stock: string;
  analytics: string;
  expenses: string;
  admin: string;
}[] = [
  {
    role: 'DIRECTRICE',
    description: 'Contrôle total du réseau multi-boutiques',
    pos: 'Complet + Retours',
    stock: 'Complet + Transferts',
    analytics: 'Réseau complet',
    expenses: 'Création & Validation',
    admin: 'Organisation, Sites & Profils',
  },
  {
    role: 'GERANT',
    description: 'Pilotage opérationnel de sa boutique',
    pos: 'Complet + Clôture Z',
    stock: 'Réceptions & Inventaire',
    analytics: 'Sa boutique',
    expenses: 'Validation locale',
    admin: 'Consultation équipe locale',
  },
  {
    role: 'VENDEUR',
    description: 'Comptoir de vente et saisie des dépenses uniquement',
    pos: 'Vente & Clôture X/Z',
    stock: 'Aucun accès',
    analytics: 'Aucun accès',
    expenses: 'Saisie des dépenses uniquement',
    admin: 'Aucun accès',
  },
  {
    role: 'COMPTABLE',
    description: 'Audit financier, marges et fiscalité',
    pos: 'Consultation tickets',
    stock: 'Valorisation CUMP',
    analytics: 'Complet + Marges',
    expenses: 'Approbation & P&L',
    admin: 'Mon profil uniquement',
  },
];

export const AdminScreen: React.FC = () => {
  const {
    organization,
    updateOrganization,
    boutiques,
    addBoutique,
    updateBoutique,
    deleteBoutique,
    users,
    currentUser,
    addUser,
    updateUser,
    toggleUserActive,
    deleteUser,
    adminSubTab,
    setAdminSubTab,
    logout,
    sales,
    shiftClosures,
    formatMoney,
  } = useApp();

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3500);
  };

  // --- 1. MY PROFILE STATE ---
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profileJobTitle, setProfileJobTitle] = useState(currentUser.jobTitle || '');
  const [profileEmail, setProfileEmail] = useState(currentUser.email);
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || '');
  const [profilePassword, setProfilePassword] = useState(currentUser.password || 'admin');
  const [profilePin, setProfilePin] = useState(currentUser.pinCode || '0000');

  const handleSaveMyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileEmail.trim()) return;
    if (!/^\d{4}$/.test(profilePin)) {
      showNotice('error', 'Le code PIN caisse doit contenir exactement 4 chiffres.');
      return;
    }
    updateUser({
      ...currentUser,
      name: profileName.trim(),
      jobTitle: profileJobTitle.trim(),
      email: profileEmail.trim().toLowerCase(),
      phone: profilePhone.trim(),
      password: profilePassword,
      pinCode: profilePin,
    });
    showNotice('success', 'Votre profil utilisateur et vos identifiants ont été mis à jour.');
  };

  // --- 2. USERS MANAGEMENT STATE ---
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPhone, setUPhone] = useState('');
  const [uJobTitle, setUJobTitle] = useState('');
  const [uRole, setURole] = useState<UserRole>('VENDEUR');
  const [uBoutiqueId, setUBoutiqueId] = useState<string>(boutiques[0]?.id || 'b1');
  const [uPassword, setUPassword] = useState('admin');
  const [uPinCode, setUPinCode] = useState('1234');
  const [uIsActive, setUIsActive] = useState(true);

  const openNewUserModal = () => {
    setEditingUser(null);
    setUName('');
    setUEmail('');
    setUPhone('');
    setUJobTitle('');
    setURole('VENDEUR');
    setUBoutiqueId(boutiques[0]?.id || 'b1');
    setUPassword('admin');
    setUPinCode(String(Math.floor(1000 + Math.random() * 9000)));
    setUIsActive(true);
    setShowUserModal(true);
  };

  const openEditUserModal = (user: User) => {
    setEditingUser(user);
    setUName(user.name);
    setUEmail(user.email);
    setUPhone(user.phone || '');
    setUJobTitle(user.jobTitle || '');
    setURole(user.role);
    setUBoutiqueId(user.boutiqueId);
    setUPassword(user.password || 'admin');
    setUPinCode(user.pinCode || '0000');
    setUIsActive(user.isActive);
    setShowUserModal(true);
  };

  const handleSaveUserModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uName.trim() || !uEmail.trim()) return;
    if (!/^\d{4}$/.test(uPinCode)) {
      showNotice('error', 'Le code PIN doit comporter exactement 4 chiffres.');
      return;
    }

    if (editingUser) {
      updateUser({
        ...editingUser,
        name: uName.trim(),
        email: uEmail.trim().toLowerCase(),
        phone: uPhone.trim(),
        jobTitle: uJobTitle.trim(),
        role: uRole,
        boutiqueId: uBoutiqueId,
        password: uPassword,
        pinCode: uPinCode,
        isActive: uIsActive,
      });
      showNotice('success', `Profil de ${uName.trim()} mis à jour.`);
    } else {
      addUser({
        name: uName.trim(),
        email: uEmail.trim().toLowerCase(),
        phone: uPhone.trim(),
        jobTitle: uJobTitle.trim(),
        role: uRole,
        boutiqueId: uBoutiqueId,
        password: uPassword,
        pinCode: uPinCode,
        isActive: uIsActive,
      });
      showNotice('success', `Nouveau profil utilisateur créé pour ${uName.trim()}.`);
    }
    setShowUserModal(false);
  };

  const handleDeleteUser = (u: User) => {
    const res = deleteUser(u.id);
    if (!res.ok) {
      showNotice('error', res.error || 'Suppression impossible.');
    } else {
      showNotice('success', `Profil ${u.name} supprimé.`);
    }
  };

  // --- 3. ORGANIZATION CONFIG STATE ---
  const [orgForm, setOrgForm] = useState<Organization>(organization);

  const handleSaveOrganization = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrganization(orgForm);
    showNotice('success', 'Configuration de l’organisation enregistrée.');
  };

  // --- 4. BOUTIQUES MANAGEMENT STATE ---
  const [showBoutiqueModal, setShowBoutiqueModal] = useState(false);
  const [editingBoutique, setEditingBoutique] = useState<Boutique | null>(null);
  const [bName, setBName] = useState('');
  const [bCode, setBCode] = useState('');
  const [bCity, setBCity] = useState('');
  const [bAddress, setBAddress] = useState('');
  const [bPhone, setBPhone] = useState('');
  const [bManager, setBManager] = useState('');
  const [bIsDepot, setBIsDepot] = useState(false);

  const openNewBoutiqueModal = () => {
    setEditingBoutique(null);
    setBName('');
    setBCode(`POS-0${boutiques.length + 1}`);
    setBCity(organization.city);
    setBAddress('');
    setBPhone(organization.phone);
    setBManager(currentUser.name);
    setBIsDepot(false);
    setShowBoutiqueModal(true);
  };

  const openEditBoutiqueModal = (b: Boutique) => {
    setEditingBoutique(b);
    setBName(b.name);
    setBCode(b.code);
    setBCity(b.city);
    setBAddress(b.address);
    setBPhone(b.phone);
    setBManager(b.managerName);
    setBIsDepot(Boolean(b.isDepot));
    setShowBoutiqueModal(true);
  };

  const handleSaveBoutique = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bName.trim()) return;
    if (editingBoutique) {
      updateBoutique({
        ...editingBoutique,
        name: bName.trim(),
        code: bCode.trim().toUpperCase(),
        city: bCity.trim(),
        address: bAddress.trim(),
        phone: bPhone.trim(),
        managerName: bManager.trim(),
        isDepot: bIsDepot,
      });
      showNotice('success', `Boutique ${bName.trim()} mise à jour.`);
    } else {
      addBoutique({
        name: bName.trim(),
        code: bCode.trim().toUpperCase() || `POS-${boutiques.length + 1}`,
        city: bCity.trim() || organization.city,
        address: bAddress.trim() || organization.address,
        phone: bPhone.trim() || organization.phone,
        managerName: bManager.trim() || currentUser.name,
        isDepot: bIsDepot,
      });
      showNotice('success', `Nouveau site "${bName.trim()}" ajouté au réseau.`);
    }
    setShowBoutiqueModal(false);
  };

  // --- 5. LOGIN SETTINGS HANDLERS ---
  const handleSaveLoginSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgForm.loginSettings.allowEmailPassword && !orgForm.loginSettings.allowPinLogin) {
      showNotice('error', 'Au moins une méthode de connexion (Email ou PIN) doit rester active.');
      return;
    }
    updateOrganization(orgForm);
    showNotice('success', 'Paramètres de l’écran de connexion enregistrés.');
  };

  const filteredUsers = users.filter((u) => {
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.jobTitle && u.jobTitle.toLowerCase().includes(q))
    );
  });

  const canManageOrg = currentUser.role === 'DIRECTRICE' || currentUser.role === 'GERANT';
  const mySales = sales.filter((s) => s.sellerId === currentUser.id && s.status === 'COMPLETED');
  const myClosures = shiftClosures.filter((c) => c.sellerId === currentUser.id);
  const myTotalRevenue = mySales.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">
            Administration, Organisation & Profils
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {organization.name} · Profil actif : <span className="text-emerald-400 font-medium">{currentUser.name} ({currentUser.role})</span>
          </p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 text-amber-400" />
          <span>Verrouiller / Écran de connexion</span>
        </button>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800">
        {[
          { id: 'profile', label: 'Mon Profil', icon: UserIcon },
          { id: 'users', label: `Utilisateurs & Profils (${users.length})`, icon: Shield },
          { id: 'organization', label: 'Organisation & Fiscalité', icon: Building2 },
          { id: 'boutiques', label: `Boutiques & Dépôts (${boutiques.length})`, icon: Store },
          { id: 'login_config', label: 'Écran de Connexion', icon: KeyRound },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = adminSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setAdminSubTab(tab.id as any);
                setOrgForm(organization);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                active
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* TAB 1: MON PROFIL */}
      {adminSubTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Informations Personnelles & Sécurité</h2>
                <p className="text-xs text-slate-400">Modifiez vos coordonnées, mot de passe et code PIN caisse.</p>
              </div>
              <span className="font-mono text-xs text-emerald-400 font-bold">{currentUser.role}</span>
            </div>

            <form onSubmit={handleSaveMyProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nom complet *</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Intitulé du poste</label>
                  <input
                    type="text"
                    value={profileJobTitle}
                    onChange={(e) => setProfileJobTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Adresse e-mail *</label>
                  <input
                    type="email"
                    required
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Mot de passe de connexion
                  </label>
                  <input
                    type="password"
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Code PIN Rapide Caisse (4 chiffres)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={profilePin}
                    onChange={(e) => setProfilePin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white tracking-widest"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer mon profil</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Panel: Activity & Role Privileges */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold flex items-center justify-center text-base">
                  {currentUser.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{currentUser.name}</div>
                  <div className="text-xs text-slate-400">{ROLE_LABELS[currentUser.role]}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <span className="text-[11px] text-slate-400 block">Ventes enregistrées</span>
                  <span className="font-mono font-bold text-emerald-400 tabular-nums">
                    {formatMoney(myTotalRevenue)}
                  </span>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <span className="text-[11px] text-slate-400 block">Tickets / Clôtures</span>
                  <span className="font-mono font-bold text-white tabular-nums">
                    {mySales.length} tkt · {myClosures.length} clôtures
                  </span>
                </div>
              </div>

              <div className="text-xs space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">Affectation boutique :</span>
                  <span className="font-semibold text-white">
                    {currentUser.boutiqueId === 'all'
                      ? 'Accès Multi-Boutiques (Réseau)'
                      : boutiques.find((b) => b.id === currentUser.boutiqueId)?.name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dernière connexion :</span>
                  <span className="font-mono text-slate-300">
                    {currentUser.lastLogin
                      ? new Date(currentUser.lastLogin).toLocaleString('fr-FR')
                      : 'Session active'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UTILISATEURS & PROFILS (RBAC) */}
      {adminSubTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative min-w-[220px] flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Rechercher un utilisateur..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500"
                  />
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="all">Tous les rôles</option>
                  <option value="DIRECTRICE">Directrice</option>
                  <option value="GERANT">Gérant</option>
                  <option value="VENDEUR">Vendeur / Caissier</option>
                  <option value="COMPTABLE">Comptable</option>
                </select>
              </div>

              {canManageOrg && (
                <button
                  type="button"
                  onClick={openNewUserModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Nouveau Profil Utilisateur</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                    <th className="py-3 px-4">Utilisateur</th>
                    <th className="py-3 px-4">Rôle RBAC</th>
                    <th className="py-3 px-4">Site Affecté</th>
                    <th className="py-3 px-4 text-center">PIN Caisse</th>
                    <th className="py-3 px-4 text-center">Statut</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredUsers.map((u) => {
                    const site = boutiques.find((b) => b.id === u.boutiqueId);
                    const isSelf = u.id === currentUser.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">
                            {u.name}
                            {isSelf && (
                              <span className="ml-2 text-[10px] font-mono text-emerald-400">
                                (Vous)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {u.email} · {u.jobTitle || 'Collaborateur'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] font-bold text-emerald-400">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {u.boutiqueId === 'all' ? 'Tout le réseau' : site?.name || 'Non assigné'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-300">
                          {u.pinCode || '----'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[11px] font-semibold ${
                              u.isActive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {u.isActive ? 'Actif' : 'Suspendu'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {canManageOrg ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditUserModal(u)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                                title="Modifier le profil"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isSelf}
                                onClick={() => toggleUserActive(u.id)}
                                className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors disabled:opacity-30"
                                title={u.isActive ? 'Suspendre l’accès' : 'Réactiver l’accès'}
                              >
                                {u.isActive ? (
                                  <UserX className="w-3.5 h-3.5" />
                                ) : (
                                  <UserCheck className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={isSelf}
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors disabled:opacity-30"
                                title="Supprimer le profil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">Lecture seule</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* RBAC Permissions Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Matrice des Permissions par Rôle (RBAC)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                    <th className="py-2 px-3">Rôle</th>
                    <th className="py-2 px-3">Caisse POS</th>
                    <th className="py-2 px-3">Stocks & Dépôts</th>
                    <th className="py-2 px-3">Analytics BI</th>
                    <th className="py-2 px-3">Dépenses & P&L</th>
                    <th className="py-2 px-3">Administration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {ROLE_PERMISSIONS_MATRIX.map((row) => (
                    <tr key={row.role}>
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-emerald-400">{row.role}</div>
                        <div className="text-[10px] text-slate-500">{row.description}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{row.pos}</td>
                      <td className="py-2.5 px-3 text-slate-300">{row.stock}</td>
                      <td className="py-2.5 px-3 text-slate-300">{row.analytics}</td>
                      <td className="py-2.5 px-3 text-slate-300">{row.expenses}</td>
                      <td className="py-2.5 px-3 text-slate-300">{row.admin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONFIGURATION DE L'ORGANISATION */}
      {adminSubTab === 'organization' && (
        <form
          onSubmit={handleSaveOrganization}
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6"
        >
          <div className="pb-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">
                Identité Légale, Fiscalité & Paramètres Généraux
              </h2>
              <p className="text-xs text-slate-400">
                Ces informations apparaissent sur l’en-tête du SaaS et les tickets thermiques imprimés.
              </p>
            </div>
            {!canManageOrg && (
              <span className="text-xs text-amber-400">
                Seule la Direction ou un Gérant peut modifier ces paramètres.
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Raison sociale</label>
              <input
                type="text"
                disabled={!canManageOrg}
                value={orgForm.name}
                onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nom commercial (Enseigne)</label>
              <input
                type="text"
                disabled={!canManageOrg}
                value={orgForm.tradeName}
                onChange={(e) => setOrgForm({ ...orgForm, tradeName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Secteur d’activité</label>
              <select
                disabled={!canManageOrg}
                value={orgForm.sector}
                onChange={(e) => setOrgForm({ ...orgForm, sector: e.target.value as BusinessSector })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white disabled:opacity-60"
              >
                <option value="Commerce Général & Supérette">Commerce Général & Supérette</option>
                <option value="Mode & Prêt-à-porter">Mode & Prêt-à-porter</option>
                <option value="Quincaillerie & Brico">Quincaillerie & Brico</option>
                <option value="Grossiste Multi-sites">Grossiste Multi-sites</option>
                <option value="Électronique & Services">Électronique & Services</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">N° Fiscal (NINEA / NIF / SIRET)</label>
              <input
                type="text"
                disabled={!canManageOrg}
                value={orgForm.taxId}
                onChange={(e) => setOrgForm({ ...orgForm, taxId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Registre de Commerce (RCCM)</label>
              <input
                type="text"
                disabled={!canManageOrg}
                value={orgForm.tradeRegister}
                onChange={(e) => setOrgForm({ ...orgForm, tradeRegister: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail de direction</label>
              <input
                type="email"
                disabled={!canManageOrg}
                value={orgForm.email}
                onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Pays</label>
              <input
                type="text"
                disabled={!canManageOrg}
                value={orgForm.country}
                onChange={(e) => setOrgForm({ ...orgForm, country: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Ville</label>
              <input
                type="text"
                disabled={!canManageOrg}
                value={orgForm.city}
                onChange={(e) => setOrgForm({ ...orgForm, city: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Téléphone siège</label>
              <input
                type="text"
                disabled={!canManageOrg}
                value={orgForm.phone}
                onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white disabled:opacity-60"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Adresse complète du siège</label>
              <input
                type="text"
                disabled={!canManageOrg}
                value={orgForm.address}
                onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Devise principale</label>
                <select
                  disabled={!canManageOrg}
                  value={orgForm.defaultCurrency}
                  onChange={(e) =>
                    setOrgForm({ ...orgForm, defaultCurrency: e.target.value as CurrencyCode })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white disabled:opacity-60"
                >
                  <option value="XOF">FCFA (XOF)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GNF">GNF</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">TVA défaut</label>
                <select
                  disabled={!canManageOrg}
                  value={orgForm.defaultVatRate}
                  onChange={(e) =>
                    setOrgForm({ ...orgForm, defaultVatRate: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white disabled:opacity-60"
                >
                  <option value={18}>18%</option>
                  <option value={20}>20%</option>
                  <option value={0}>0%</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mention légale en pied de ticket de caisse (80mm / 58mm) :
              </label>
              <input
                type="text"
                disabled={!canManageOrg}
                value={orgForm.receiptFooter}
                onChange={(e) => setOrgForm({ ...orgForm, receiptFooter: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white disabled:opacity-60"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={!canManageOrg}
                checked={orgForm.allowNegativeStock}
                onChange={(e) =>
                  setOrgForm({ ...orgForm, allowNegativeStock: e.target.checked })
                }
                className="rounded bg-slate-950 border-slate-700 text-emerald-500"
              />
              <span className="text-xs text-slate-300">
                Autoriser la vente en caisse même lorsque le stock informatique atteint 0
              </span>
            </label>
          </div>

          {canManageOrg && (
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Enregistrer la configuration</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB 4: BOUTIQUES & DÉPÔTS */}
      {adminSubTab === 'boutiques' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Réseau des Points de Vente & Entrepôts</h2>
              <p className="text-xs text-slate-400">
                Ajoutez ou configurez vos boutiques physiques et dépôts logistiques.
              </p>
            </div>
            {canManageOrg && (
              <button
                type="button"
                onClick={openNewBoutiqueModal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une Boutique / Dépôt</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boutiques.map((b) => (
              <div
                key={b.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-mono text-emerald-400 font-bold">
                        {b.code} {b.isDepot ? '· Dépôt Central' : '· Point de Vente'}
                      </div>
                      <h3 className="text-sm font-bold text-white mt-0.5">{b.name}</h3>
                    </div>

                    {canManageOrg && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditBoutiqueModal(b)}
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
                          title="Modifier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const res = deleteBoutique(b.id);
                            if (!res.ok) showNotice('error', res.error || 'Erreur');
                            else showNotice('success', `Site "${b.name}" supprimé.`);
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 bg-slate-800 rounded-lg"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 space-y-1">
                    <div>{b.address}</div>
                    <div>{b.city} · Tél : <span className="font-mono text-slate-300">{b.phone}</span></div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Responsable :</span>
                  <span className="font-semibold text-white">{b.managerName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: PARAMÈTRES DE L'ÉCRAN DE CONNEXION */}
      {adminSubTab === 'login_config' && (
        <form
          onSubmit={handleSaveLoginSettings}
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6"
        >
          <div className="pb-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">
                Paramétrage de l’Écran de Connexion & Sécurité Session
              </h2>
              <p className="text-xs text-slate-400">
                Personnalisez les méthodes d’authentification, l’accès rapide par code PIN et les messages d’accueil.
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-emerald-400 transition-colors"
            >
              Prévisualiser l’écran de connexion
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Copy & Session */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Titre d’accueil sur la page de connexion
                </label>
                <input
                  type="text"
                  disabled={!canManageOrg}
                  value={orgForm.loginSettings.welcomeTitle}
                  onChange={(e) =>
                    setOrgForm({
                      ...orgForm,
                      loginSettings: { ...orgForm.loginSettings, welcomeTitle: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sous-titre / consigne opérateurs
                </label>
                <textarea
                  rows={2}
                  disabled={!canManageOrg}
                  value={orgForm.loginSettings.welcomeSubtitle}
                  onChange={(e) =>
                    setOrgForm({
                      ...orgForm,
                      loginSettings: { ...orgForm.loginSettings, welcomeSubtitle: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Durée d’expiration de session (minutes)
                </label>
                <select
                  disabled={!canManageOrg}
                  value={orgForm.loginSettings.sessionTimeoutMinutes}
                  onChange={(e) =>
                    setOrgForm({
                      ...orgForm,
                      loginSettings: {
                        ...orgForm.loginSettings,
                        sessionTimeoutMinutes: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white disabled:opacity-60"
                >
                  <option value={60}>60 min (1 heure)</option>
                  <option value={240}>240 min (4 heures)</option>
                  <option value={480}>480 min (Journée de travail 8h)</option>
                  <option value={1440}>1440 min (24 heures)</option>
                </select>
              </div>
            </div>

            {/* Auth Policies Toggles */}
            <div className="space-y-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-bold text-slate-200 pb-1 border-b border-slate-800">
                Méthodes & Règles d’Authentification
              </div>

              <label className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canManageOrg}
                  checked={orgForm.loginSettings.allowEmailPassword}
                  onChange={(e) =>
                    setOrgForm({
                      ...orgForm,
                      loginSettings: {
                        ...orgForm.loginSettings,
                        allowEmailPassword: e.target.checked,
                      },
                    })
                  }
                  className="mt-0.5 rounded bg-slate-900 border-slate-700 text-emerald-500"
                />
                <div>
                  <div className="text-xs font-semibold text-white">Connexion Email & Mot de passe</div>
                  <div className="text-[11px] text-slate-400">
                    Authentification standard recommandée pour la Direction, Gérants et Comptables.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canManageOrg}
                  checked={orgForm.loginSettings.allowPinLogin}
                  onChange={(e) =>
                    setOrgForm({
                      ...orgForm,
                      loginSettings: { ...orgForm.loginSettings, allowPinLogin: e.target.checked },
                    })
                  }
                  className="mt-0.5 rounded bg-slate-900 border-slate-700 text-emerald-500"
                />
                <div>
                  <div className="text-xs font-semibold text-white">Clavier Tactile Code PIN (4 chiffres)</div>
                  <div className="text-[11px] text-slate-400">
                    Permet un changement rapide d’opérateur sur le terminal de caisse tactile.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canManageOrg}
                  checked={orgForm.loginSettings.showQuickDemoProfiles}
                  onChange={(e) =>
                    setOrgForm({
                      ...orgForm,
                      loginSettings: {
                        ...orgForm.loginSettings,
                        showQuickDemoProfiles: e.target.checked,
                      },
                    })
                  }
                  className="mt-0.5 rounded bg-slate-900 border-slate-700 text-emerald-500"
                />
                <div>
                  <div className="text-xs font-semibold text-white">Afficher les raccourcis de profils sur la page d’accueil</div>
                  <div className="text-[11px] text-slate-400">
                    Désactivez en production stricte pour masquer la liste des comptes sur l’écran de connexion.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-900/60 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canManageOrg}
                  checked={orgForm.loginSettings.requirePinForReturns}
                  onChange={(e) =>
                    setOrgForm({
                      ...orgForm,
                      loginSettings: {
                        ...orgForm.loginSettings,
                        requirePinForReturns: e.target.checked,
                      },
                    })
                  }
                  className="mt-0.5 rounded bg-slate-900 border-slate-700 text-emerald-500"
                />
                <div>
                  <div className="text-xs font-semibold text-white">Sécurité retours & annulations</div>
                  <div className="text-[11px] text-slate-400">
                    Exiger un motif obligatoire et validation superviseur lors d’un retour ticket.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {canManageOrg && (
            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Appliquer à l’écran de connexion</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* MODAL: CREATE / EDIT USER PROFILE */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden my-6">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                {editingUser ? `Modifier le profil : ${editingUser.name}` : 'Créer un Profil Utilisateur'}
              </h3>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUserModal} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nom complet *</label>
                  <input
                    type="text"
                    required
                    value={uName}
                    onChange={(e) => setUName(e.target.value)}
                    placeholder="Ex: Moussa Fall"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Poste / Fonction</label>
                  <input
                    type="text"
                    value={uJobTitle}
                    onChange={(e) => setUJobTitle(e.target.value)}
                    placeholder="Ex: Caissier Principal"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail de connexion *</label>
                  <input
                    type="email"
                    required
                    value={uEmail}
                    onChange={(e) => setUEmail(e.target.value)}
                    placeholder="m.fall@entreprise.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={uPhone}
                    onChange={(e) => setUPhone(e.target.value)}
                    placeholder="+221 77 ..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Rôle RBAC</label>
                  <select
                    value={uRole}
                    onChange={(e) => setURole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="VENDEUR">Vendeur / Caissier</option>
                    <option value="GERANT">Gérant de Boutique</option>
                    <option value="COMPTABLE">Comptable</option>
                    <option value="DIRECTRICE">Directrice / Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Boutique affectée</label>
                  <select
                    value={uBoutiqueId}
                    onChange={(e) => setUBoutiqueId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="all">Tout le réseau (Multi-boutiques)</option>
                    {boutiques.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mot de passe</label>
                  <input
                    type="text"
                    required
                    value={uPassword}
                    onChange={(e) => setUPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Code PIN Caisse (4 ch.)</label>
                  <input
                    type="text"
                    maxLength={4}
                    required
                    value={uPinCode}
                    onChange={(e) => setUPinCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white text-center"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={uIsActive}
                  onChange={(e) => setUIsActive(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-emerald-500"
                />
                <span className="text-xs text-slate-300">Compte utilisateur actif (autorisé à se connecter)</span>
              </label>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-xs text-slate-300 bg-slate-800 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg"
                >
                  {editingUser ? 'Mettre à jour' : 'Créer le profil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT BOUTIQUE */}
      {showBoutiqueModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                {editingBoutique ? `Modifier : ${editingBoutique.name}` : 'Nouvelle Boutique ou Dépôt'}
              </h3>
              <button
                type="button"
                onClick={() => setShowBoutiqueModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBoutique} className="p-5 space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nom du site *</label>
                  <input
                    type="text"
                    required
                    value={bName}
                    onChange={(e) => setBName(e.target.value)}
                    placeholder="Ex: Boutique Sacré-Cœur"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    value={bCode}
                    onChange={(e) => setBCode(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono uppercase text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ville</label>
                  <input
                    type="text"
                    value={bCity}
                    onChange={(e) => setBCity(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={bPhone}
                    onChange={(e) => setBPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Adresse physique</label>
                <input
                  type="text"
                  value={bAddress}
                  onChange={(e) => setBAddress(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Responsable / Gérant</label>
                <input
                  type="text"
                  value={bManager}
                  onChange={(e) => setBManager(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={bIsDepot}
                  onChange={(e) => setBIsDepot(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-emerald-500"
                />
                <span className="text-xs text-slate-300">Ce site est un Dépôt / Entrepôt logistique (hors vente comptoir)</span>
              </label>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBoutiqueModal(false)}
                  className="px-4 py-2 text-xs text-slate-300 bg-slate-800 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg"
                >
                  {editingBoutique ? 'Enregistrer' : 'Créer le site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
