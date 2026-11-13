import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Supplier, SupplierPaymentTerms } from '../../types';
import { X, Truck, Check } from 'lucide-react';

interface SupplierModalProps {
  supplier: Supplier | null;
  onClose: () => void;
  onCreated?: (supplier: Supplier) => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  supplier,
  onClose,
  onCreated,
}) => {
  const { addSupplier, updateSupplier, suppliers } = useApp();

  const [name, setName] = useState(supplier?.name || '');
  const [code, setCode] = useState(
    supplier?.code || `FRN-${String(suppliers.length + 1).padStart(3, '0')}`
  );
  const [contactName, setContactName] = useState(supplier?.contactName || '');
  const [phone, setPhone] = useState(supplier?.phone || '');
  const [email, setEmail] = useState(supplier?.email || '');
  const [city, setCity] = useState(supplier?.city || 'Dakar');
  const [address, setAddress] = useState(supplier?.address || '');
  const [taxId, setTaxId] = useState(supplier?.taxId || '');
  const [paymentTerms, setPaymentTerms] = useState<SupplierPaymentTerms>(
    supplier?.paymentTerms || '30 jours'
  );
  const [notes, setNotes] = useState(supplier?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (supplier) {
      updateSupplier({
        ...supplier,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        contactName: contactName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        city: city.trim() || 'Dakar',
        address: address.trim() || undefined,
        taxId: taxId.trim() || undefined,
        paymentTerms,
        notes: notes.trim() || undefined,
      });
    } else {
      const created = addSupplier({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        contactName: contactName.trim() || 'Service Commercial',
        phone: phone.trim(),
        email: email.trim() || undefined,
        city: city.trim() || 'Dakar',
        address: address.trim() || undefined,
        taxId: taxId.trim() || undefined,
        paymentTerms,
        notes: notes.trim() || undefined,
      });
      if (onCreated) onCreated(created);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden my-6">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {supplier ? 'Modifier la fiche fournisseur' : 'Nouveau Fournisseur'}
              </h2>
              <p className="text-xs text-slate-400">
                Coordonnées commerciales et conditions de règlement
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-medium mb-1">
                Raison sociale / Nom *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Patisen Sénégal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Code Fournisseur *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Contact principal</label>
              <input
                type="text"
                placeholder="Ex: Ibrahima Mbaye"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Téléphone *</label>
              <input
                type="text"
                required
                placeholder="+221 33 ..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">E-mail commandes</label>
              <input
                type="email"
                placeholder="commandes@fournisseur.sn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Délai de paiement</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value as SupplierPaymentTerms)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Comptant">Comptant</option>
                <option value="15 jours">15 jours</option>
                <option value="30 jours">30 jours</option>
                <option value="60 jours">60 jours</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Ville</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">NINEA / NIF</label>
              <input
                type="text"
                placeholder="Optionnel"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Adresse complète</label>
            <input
              type="text"
              placeholder="Zone industrielle, rue..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Notes internes</label>
            <textarea
              rows={2}
              placeholder="Conditions tarifaires, jours de livraison..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{supplier ? 'Enregistrer' : 'Créer le fournisseur'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
