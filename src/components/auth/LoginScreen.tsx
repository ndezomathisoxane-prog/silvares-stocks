import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BusinessSector, CurrencyCode, User } from '../../types';
import {
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  PlusCircle,
  ShieldCheck,
  ArrowRight,
  Delete,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const {
    organization,
    boutiques,
    users,
    loginWithEmail,
    loginWithPin,
    switchUserWithPassword,
    createOrganization,
  } = useApp();

  const initialMode: 'email' | 'pin' | 'create_org' = organization.loginSettings.allowEmailPassword
    ? 'email'
    : 'pin';

  const [mode, setMode] = useState<'email' | 'pin' | 'create_org'>(initialMode);
  const [error, setError] = useState('');

  // Quick Profile Password Modal state
  const [pendingProfileUser, setPendingProfileUser] = useState<User | null>(null);
  const [profileModalPassword, setProfileModalPassword] = useState('');
  const [showProfileModalPassword, setShowProfileModalPassword] = useState(false);
  const [profileModalError, setProfileModalError] = useState('');

  // Email Login state
  const [email, setEmail] = useState(users[0]?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // PIN Login state
  const [selectedPinUserId, setSelectedPinUserId] = useState<string>(users[0]?.id || '');
  const [pinInput, setPinInput] = useState('');

  // Create Organization state
  const [orgName, setOrgName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [sector, setSector] = useState<BusinessSector>('Commerce Général & Supérette');
  const [country, setCountry] = useState('Sénégal');
  const [city, setCity] = useState('Dakar');
  const [address, setAddress] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>('XOF');
  const [defaultVatRate, setDefaultVatRate] = useState<number>(18);
  const [boutiqueName, setBoutiqueName] = useState('Boutique Principale');
  const [boutiqueCode, setBoutiqueCode] = useState('POS-01');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPin, setAdminPin] = useState('0000');
  const [includeSampleCatalog, setIncludeSampleCatalog] = useState(true);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = loginWithEmail(email, password);
    if (!res.ok) {
      setError(res.error || 'Identifiants invalides.');
    }
  };

  const handlePinDigit = (digit: string) => {
    setError('');
    if (pinInput.length < 4) {
      const next = pinInput + digit;
      setPinInput(next);
      if (next.length === 4) {
        const res = loginWithPin(next, selectedPinUserId || undefined);
        if (!res.ok) {
          setError(res.error || 'Code PIN incorrect.');
          setPinInput('');
        }
      }
    }
  };

  const handlePinBackspace = () => {
    setError('');
    setPinInput((prev) => prev.slice(0, -1));
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = loginWithPin(pinInput, selectedPinUserId || undefined);
    if (!res.ok) {
      setError(res.error || 'Code PIN incorrect.');
      setPinInput('');
    }
  };

  const handleQuickProfileClick = (user: User) => {
    setError('');
    if (!user.isActive) {
      setError('Ce profil utilisateur est actuellement désactivé.');
      return;
    }
    setPendingProfileUser(user);
    setProfileModalPassword('');
    setShowProfileModalPassword(false);
    setProfileModalError('');
  };

  const handleConfirmProfileLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingProfileUser) return;
    const res = switchUserWithPassword(pendingProfileUser.id, profileModalPassword);
    if (!res.ok) {
      setProfileModalError(res.error || 'Mot de passe incorrect.');
      return;
    }
    setPendingProfileUser(null);
    setProfileModalPassword('');
    setProfileModalError('');
  };

  const handleCreateOrgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!orgName.trim() || !adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      setError('Veuillez renseigner les champs obligatoires de l’organisation et de l’administrateur.');
      return;
    }
    if (!/^\d{4}$/.test(adminPin)) {
      setError('Le code PIN caisse doit contenir exactement 4 chiffres.');
      return;
    }
    createOrganization({
      orgName,
      tradeName: tradeName || orgName,
      sector,
      country,
      city,
      address,
      phone: orgPhone,
      email: adminEmail,
      taxId,
      defaultCurrency,
      defaultVatRate,
      boutiqueName,
      boutiqueCode,
      adminName,
      adminEmail,
      adminPhone,
      adminPassword,
      adminPin,
      includeSampleCatalog,
    });
  };

  const activeUsers = users.filter((u) => u.isActive);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top minimal bar */}
      <header className="border-b border-slate-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-extrabold text-lg">
              {organization.tradeName.charAt(0).toUpperCase()}
            </div>
            <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
              {organization.tradeName}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
            <span>{organization.name}</span>
            <span aria-hidden="true">·</span>
            <span>{organization.city}, {organization.country}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-300">{boutiques.length} point(s) de vente</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setError('');
              setMode(mode === 'create_org' ? initialMode : 'create_org');
            }}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            {mode === 'create_org' ? 'Retour à la connexion' : 'Créer une organisation'}
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Side: Organization Context & Quick Access */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="space-y-4">
              <div className="text-xs font-mono text-emerald-400">
                {organization.sector}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight [text-wrap:balance]">
                {organization.loginSettings.welcomeTitle}
              </h1>

              <p className="text-sm text-slate-300 leading-relaxed">
                {organization.loginSettings.welcomeSubtitle}
              </p>

              {/* Organization Metadata Summary */}
              <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Organisation active</span>
                  <span className="font-semibold text-white">{organization.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">N° Fiscal / NINEA</span>
                  <span className="font-mono text-slate-200">{organization.taxId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Devise & TVA</span>
                  <span className="font-mono text-emerald-400">
                    {organization.defaultCurrency} · TVA {organization.defaultVatRate}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Sites rattachés</span>
                  <span className="font-mono text-white">{boutiques.length} boutiques / dépôts</span>
                </div>
              </div>
            </div>

            {/* Quick Login Profiles (Controlled by Login Settings) */}
            {organization.loginSettings.showQuickDemoProfiles && (
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    Accès rapide par profil utilisateur
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Mot de passe démo : admin
                  </span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {users.map((u) => {
                    const userBoutique = boutiques.find((b) => b.id === u.boutiqueId);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleQuickProfileClick(u)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          u.isActive
                            ? 'bg-slate-900 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/80'
                            : 'bg-slate-900/30 border-slate-800/50 opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {u.name}
                              {!u.isActive && (
                                <span className="ml-2 text-[10px] text-rose-400 font-normal">
                                  (Suspendu)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {u.jobTitle || u.role} ·{' '}
                              {u.boutiqueId === 'all' ? 'Tout le réseau' : userBoutique?.name || 'Boutique'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono text-slate-400">
                            PIN {u.pinCode || '0000'}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                            {u.role}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Login Form / PIN Keypad / Organization Wizard */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between">
            <div>
              {/* Auth Mode Switcher */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-6">
                {organization.loginSettings.allowEmailPassword && (
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setMode('email');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      mode === 'email'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Identifiants Email</span>
                  </button>
                )}

                {organization.loginSettings.allowPinLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setMode('pin');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      mode === 'pin'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Code PIN Caisse</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setMode('create_org');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    mode === 'create_org'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Créer Organisation</span>
                </button>
              </div>

              {error && (
                <div className="mb-5 p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg flex items-center gap-2 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* MODE 1: EMAIL & PASSWORD */}
              {mode === 'email' && (
                <form onSubmit={handleEmailSubmit} className="space-y-5">
                  <div>
                    <h2 className="text-base font-bold text-white">Connexion Utilisateur</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Accédez à votre session sécurisée selon vos droits RBAC.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Adresse e-mail professionnelle
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="nom@entreprise.com"
                          className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Mot de passe
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Saisissez votre mot de passe"
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {organization.loginSettings.showQuickDemoProfiles && (
                        <div className="text-[11px] text-slate-500 mt-1.5">
                          Astuce démo : utilisez le mot de passe <span className="font-mono text-slate-300">admin</span> pour les comptes pré-enregistrés.
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Ouvrir ma session</span>
                  </button>
                </form>
              )}

              {/* MODE 2: TACTILE POS PIN PAD */}
              {mode === 'pin' && (
                <form onSubmit={handlePinSubmit} className="space-y-5">
                  <div>
                    <h2 className="text-base font-bold text-white">Déverrouillage Rapide par Code PIN</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sélectionnez votre profil puis composez votre code personnel à 4 chiffres.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Opérateur / Caissier :
                    </label>
                    <select
                      value={selectedPinUserId}
                      onChange={(e) => {
                        setSelectedPinUserId(e.target.value);
                        setPinInput('');
                        setError('');
                      }}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
                    >
                      {activeUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} — {u.role}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PIN Dots Display */}
                  <div className="flex items-center justify-center gap-4 py-2">
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        className={`w-11 h-12 rounded-xl border flex items-center justify-center font-mono text-lg font-bold transition-all ${
                          pinInput.length > idx
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                            : 'bg-slate-950 border-slate-700 text-slate-600'
                        }`}
                      >
                        {pinInput.length > idx ? '•' : ''}
                      </div>
                    ))}
                  </div>

                  {/* Tactile Keypad */}
                  <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => handlePinDigit(digit)}
                        className="h-12 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-mono text-base font-bold text-white transition-colors"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPinInput('')}
                      className="h-12 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                    >
                      Effacer
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePinDigit('0')}
                      className="h-12 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-mono text-base font-bold text-white transition-colors"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handlePinBackspace}
                      className="h-12 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                      title="Corriger"
                    >
                      <Delete className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={pinInput.length < 4}
                    className={`w-full py-2.5 rounded-lg text-xs font-bold transition-colors ${
                      pinInput.length === 4
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Valider le Code PIN
                  </button>
                </form>
              )}

              {/* MODE 3: CREATE NEW ORGANIZATION */}
              {mode === 'create_org' && (
                <form onSubmit={handleCreateOrgSubmit} className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      Créer & Initialiser une Nouvelle Organisation
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Déployez un espace multi-boutiques isolé avec votre premier magasin et compte Direction.
                    </p>
                  </div>

                  {/* Organization Identity */}
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-emerald-400">
                      1. Identité de l’entreprise & Fiscalité
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Raison sociale *</label>
                        <input
                          type="text"
                          required
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          placeholder="Ex: Teranga Retail Group SARL"
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Nom commercial (Enseigne)</label>
                        <input
                          type="text"
                          value={tradeName}
                          onChange={(e) => setTradeName(e.target.value)}
                          placeholder="Ex: Teranga Market"
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Secteur d’activité</label>
                        <select
                          value={sector}
                          onChange={(e) => setSector(e.target.value as BusinessSector)}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        >
                          <option value="Commerce Général & Supérette">Commerce Général & Supérette</option>
                          <option value="Mode & Prêt-à-porter">Mode & Prêt-à-porter</option>
                          <option value="Quincaillerie & Brico">Quincaillerie & Brico</option>
                          <option value="Grossiste Multi-sites">Grossiste Multi-sites</option>
                          <option value="Électronique & Services">Électronique & Services</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">NINEA / NIF / SIRET</label>
                        <input
                          type="text"
                          value={taxId}
                          onChange={(e) => setTaxId(e.target.value)}
                          placeholder="Ex: 00458912-2A1"
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Pays</label>
                        <input
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Ville</label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Devise par défaut</label>
                        <select
                          value={defaultCurrency}
                          onChange={(e) => setDefaultCurrency(e.target.value as CurrencyCode)}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                        >
                          <option value="XOF">FCFA (XOF)</option>
                          <option value="EUR">Euro (€)</option>
                          <option value="USD">Dollar ($)</option>
                          <option value="GNF">Franc Guinéen (GNF)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Taux de TVA par défaut</label>
                        <select
                          value={defaultVatRate}
                          onChange={(e) => setDefaultVatRate(Number(e.target.value))}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                        >
                          <option value={18}>18% (UEMOA)</option>
                          <option value={20}>20%</option>
                          <option value={0}>0% (Exonéré)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Nom de la 1ère boutique *</label>
                        <input
                          type="text"
                          required
                          value={boutiqueName}
                          onChange={(e) => setBoutiqueName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Code point de vente</label>
                        <input
                          type="text"
                          value={boutiqueCode}
                          onChange={(e) => setBoutiqueCode(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono uppercase text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Adresse siège / boutique</label>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Rue, Quartier"
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Téléphone entreprise</label>
                        <input
                          type="text"
                          value={orgPhone}
                          onChange={(e) => setOrgPhone(e.target.value)}
                          placeholder="+221 33 ..."
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Founder / Admin Profile */}
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-emerald-400">
                      2. Compte Propriétaire / Directrice Générale
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Nom complet *</label>
                        <input
                          type="text"
                          required
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          placeholder="Ex: Awa Ndiaye"
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">E-mail de connexion *</label>
                        <input
                          type="email"
                          required
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder="direction@entreprise.com"
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Mot de passe *</label>
                        <input
                          type="password"
                          required
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="Minimum 4 caractères"
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">PIN Caisse (4 ch.)</label>
                          <input
                            type="text"
                            maxLength={4}
                            value={adminPin}
                            onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Téléphone</label>
                          <input
                            type="text"
                            value={adminPhone}
                            onChange={(e) => setAdminPhone(e.target.value)}
                            placeholder="+221 77..."
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeSampleCatalog}
                        onChange={(e) => setIncludeSampleCatalog(e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-emerald-500"
                      />
                      <span className="text-xs text-slate-300">
                        Pré-charger un catalogue de démarrage (8 articles) pour tester immédiatement la caisse
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>Créer l’organisation et ouvrir l’espace</span>
                  </button>
                </form>
              )}
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              <span>Isolation multi-tenant active · RBAC à 4 niveaux</span>
              <span className="font-mono">{organization.email}</span>
            </div>
          </div>

        </div>
      </main>

      {/* Password Verification Modal when selecting a quick profile */}
      {pendingProfileUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmProfileLogin}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 font-bold flex items-center justify-center text-sm shrink-0">
                  {pendingProfileUser.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-400">Connexion au profil</div>
                  <h3 className="text-sm font-bold text-white truncate">
                    {pendingProfileUser.name}
                  </h3>
                  <div className="text-[11px] font-mono text-emerald-400">
                    {pendingProfileUser.role}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingProfileUser(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {profileModalError && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 rounded-lg flex items-center gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{profileModalError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mot de passe de {pendingProfileUser.name} :
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showProfileModalPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={profileModalPassword}
                  onChange={(e) => {
                    setProfileModalPassword(e.target.value);
                    setProfileModalError('');
                  }}
                  placeholder="Saisissez le mot de passe"
                  className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowProfileModalPassword(!showProfileModalPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showProfileModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Mot de passe par défaut des comptes démo : <span className="font-mono text-slate-300">admin</span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingProfileUser(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors"
              >
                Se connecter
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
