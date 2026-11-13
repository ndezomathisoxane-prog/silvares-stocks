import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PaymentMethod, Sale } from '../../types';
import {
  Receipt,
  Search,
  User as UserIcon,
  Printer,
  CheckCircle2,
  RotateCcw,
  Store,
  CreditCard,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface RecentReceiptsPanelProps {
  onOpenReceipt: (sale: Sale) => void;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  ESPECES: 'Espèces',
  WAVE: 'Wave',
  ORANGE_MONEY: 'Orange Money',
  MTN_MOMO: 'MTN MoMo',
  CARTE_BANCAIRE: 'Carte bancaire',
  CREDIT_CLIENT: 'Crédit client',
  MIXTE: 'Paiement mixte',
};

const ROLE_LABELS: Record<string, string> = {
  DIRECTRICE: 'Directrice',
  GERANT: 'Gérant',
  VENDEUR: 'Vendeur / Caissier',
  COMPTABLE: 'Comptable',
};

export const RecentReceiptsPanel: React.FC<RecentReceiptsPanelProps> = ({
  onOpenReceipt,
}) => {
  const { sales, boutiques, users, selectedBoutiqueId, formatMoney } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'COMPLETED' | 'RETURNED'>('all');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Scope sales to selected boutique (or all) and sort newest first
  const scopedSales = useMemo(() => {
    return [...sales]
      .filter((s) => selectedBoutiqueId === 'all' || s.boutiqueId === selectedBoutiqueId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, selectedBoutiqueId]);

  // Unique sellers present in scoped sales
  const availableSellers = useMemo(() => {
    const map = new Map<string, string>();
    scopedSales.forEach((s) => {
      if (!map.has(s.sellerId)) {
        map.set(s.sellerId, s.sellerName);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [scopedSales]);

  // Apply search, seller & status filters
  const filteredSales = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedSales.filter((s) => {
      const hasReturn =
        s.status !== 'COMPLETED' || s.total < 0 || s.items.some((i) => i.quantity < 0);
      if (sellerFilter !== 'all' && s.sellerId !== sellerFilter) return false;
      if (statusFilter === 'COMPLETED' && (s.status !== 'COMPLETED' || s.total < 0)) return false;
      if (statusFilter === 'RETURNED' && !hasReturn) return false;
      if (!q) return true;

      return (
        s.ticketNumber.toLowerCase().includes(q) ||
        s.sellerName.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        s.items.some((item) => item.productName.toLowerCase().includes(q))
      );
    });
  }, [scopedSales, sellerFilter, statusFilter, searchQuery]);

  const visibleSales = showAll ? filteredSales : filteredSales.slice(0, 8);

  // Keep selectedSale synchronized with newest / filtered results
  useEffect(() => {
    if (filteredSales.length === 0) {
      setSelectedSaleId(null);
      return;
    }
    const stillVisible = filteredSales.some((s) => s.id === selectedSaleId);
    if (!stillVisible) {
      setSelectedSaleId(filteredSales[0].id);
    }
  }, [filteredSales, selectedSaleId]);

  const selectedSale = useMemo(
    () => filteredSales.find((s) => s.id === selectedSaleId) || null,
    [filteredSales, selectedSaleId]
  );

  const selectedBoutique = boutiques.find((b) => b.id === selectedBoutiqueId);
  const scopeLabel =
    selectedBoutiqueId === 'all'
      ? 'Toutes les boutiques'
      : selectedBoutique?.name || 'Boutique active';

  const selectedSellerUser = selectedSale
    ? users.find((u) => u.id === selectedSale.sellerId)
    : undefined;
  const selectedSaleBoutique = selectedSale
    ? boutiques.find((b) => b.id === selectedSale.boutiqueId)
    : undefined;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSellerFilter('all');
    setStatusFilter('all');
  };

  return (
    <section
      id="recent-receipts-section"
      className="mt-6 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
    >
      {/* Header & Filter Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span>Historique récent des tickets de caisse</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            <span>{scopeLabel}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-300">
              {filteredSales.length} ticket{filteredSales.length > 1 ? 's' : ''}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative w-60 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="N° ticket, vendeur, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Seller Filter */}
          <select
            value={sellerFilter}
            onChange={(e) => setSellerFilter(e.target.value)}
            aria-label="Filtrer par vendeur"
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Tous les vendeurs</option>
            {availableSellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.name}
              </option>
            ))}
          </select>

          {/* Status Segmented Control */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tous
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Encaissés
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('RETURNED')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === 'RETURNED'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Retournés
            </button>
          </div>
        </div>
      </div>

      {/* Master-Detail Split */}
      {filteredSales.length === 0 ? (
        <div className="p-10 text-center space-y-3">
          <Receipt className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-xs text-slate-400">
            Aucun ticket de caisse ne correspond aux critères sélectionnés.
          </div>
          {(searchQuery || sellerFilter !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* Left: Tickets List Table */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-semibold bg-slate-900/60">
                    <th className="py-2.5 px-4">Ticket & Date</th>
                    <th className="py-2.5 px-3">Vendeur</th>
                    <th className="py-2.5 px-3">Client</th>
                    <th className="py-2.5 px-3">Paiement</th>
                    <th className="py-2.5 px-3">Statut</th>
                    <th className="py-2.5 px-4 text-right">Total TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {visibleSales.map((sale) => {
                    const isSelected = sale.id === selectedSale?.id;
                    const saleDate = new Date(sale.date);
                    const paymentSummary = sale.payments
                      .map((p) => PAYMENT_METHOD_LABELS[p.method] || p.method)
                      .join(' + ');

                    return (
                      <tr
                        key={sale.id}
                        onClick={() => setSelectedSaleId(sale.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-500/10'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-2.5 px-4">
                          <div
                            className={`font-mono font-bold tabular-nums ${
                              isSelected ? 'text-emerald-400' : 'text-white'
                            }`}
                          >
                            {sale.ticketNumber}
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-slate-400">
                            {saleDate.toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                            })}{' '}
                            ·{' '}
                            {saleDate.toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-200 flex items-center gap-1.5">
                            <UserIcon className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{sale.sellerName}</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-slate-300">
                          <span className="truncate block max-w-[120px]">
                            {sale.customerName || 'Client Comptoir'}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-slate-300">
                          <span className="truncate block max-w-[115px]">{paymentSummary}</span>
                        </td>

                        <td className="py-2.5 px-3">
                          {sale.status === 'RETURNED' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 whitespace-nowrap">
                              <RotateCcw className="w-3 h-3" />
                              <span>Retourné</span>
                            </span>
                          ) : sale.total < 0 || sale.items.some((i) => i.quantity < 0) ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 whitespace-nowrap">
                              <RotateCcw className="w-3 h-3" />
                              <span>Avoir / Retour</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 whitespace-nowrap">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Encaissé</span>
                            </span>
                          )}
                        </td>

                        <td
                          className={`py-2.5 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                            sale.total < 0 ? 'text-amber-400' : 'text-white'
                          }`}
                        >
                          {formatMoney(sale.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredSales.length > 8 && (
              <div className="p-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 bg-slate-900/40">
                <span>
                  Affichage de {visibleSales.length} sur {filteredSales.length} tickets
                </span>
                <button
                  type="button"
                  onClick={() => setShowAll((prev) => !prev)}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium whitespace-nowrap"
                >
                  {showAll ? (
                    <>
                      <span>Afficher moins</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Voir tous les tickets ({filteredSales.length})</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right: Selected Sale Detail Inspector */}
          <div className="lg:col-span-5 p-5 bg-slate-950/30 flex flex-col justify-between space-y-4">
            {selectedSale ? (
              <>
                <div className="space-y-4">
                  {/* Sale Header */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <div className="text-[11px] text-slate-400">Détail de la vente</div>
                      <h3 className="text-base font-extrabold font-mono text-white tabular-nums mt-0.5">
                        {selectedSale.ticketNumber}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-mono tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {new Date(selectedSale.date).toLocaleDateString('fr-FR', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          à{' '}
                          {new Date(selectedSale.date).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenReceipt(selectedSale)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Reçu 80mm</span>
                    </button>
                  </div>

                  {/* Seller, Boutique, Client & Payment Metadata */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs pb-3 border-b border-slate-800">
                    <div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <UserIcon className="w-3 h-3 text-emerald-400" />
                        <span>Vendeur / Caissier</span>
                      </div>
                      <div className="font-semibold text-white mt-0.5">
                        {selectedSale.sellerName}
                      </div>
                      {selectedSellerUser && (
                        <div className="text-[11px] text-slate-400">
                          {selectedSellerUser.jobTitle ||
                            ROLE_LABELS[selectedSellerUser.role] ||
                            selectedSellerUser.role}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Store className="w-3 h-3 text-slate-400" />
                        <span>Point de vente</span>
                      </div>
                      <div className="font-medium text-slate-200 mt-0.5">
                        {selectedSaleBoutique?.name || 'Boutique'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Client : {selectedSale.customerName || 'Client Comptoir'}
                      </div>
                    </div>

                    <div className="col-span-2 pt-1">
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                        <CreditCard className="w-3 h-3 text-slate-400" />
                        <span>Règlement</span>
                      </div>
                      <div className="space-y-1">
                        {selectedSale.payments.map((p, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs text-slate-200"
                          >
                            <span>
                              {PAYMENT_METHOD_LABELS[p.method] || p.method}
                              {p.reference ? (
                                <span className="font-mono text-[11px] text-slate-400 ml-1.5">
                                  ({p.reference})
                                </span>
                              ) : null}
                            </span>
                            <span className="font-mono font-semibold tabular-nums">
                              {formatMoney(p.amount)}
                            </span>
                          </div>
                        ))}
                        {selectedSale.changeReturned > 0 && (
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Monnaie rendue</span>
                            <span className="font-mono tabular-nums text-emerald-400">
                              {formatMoney(selectedSale.changeReturned)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span>Articles ({selectedSale.items.reduce((s, i) => s + i.quantity, 0)})</span>
                      <span>Montant</span>
                    </div>
                    <div className="divide-y divide-slate-800/60 max-h-56 overflow-y-auto pr-1">
                      {selectedSale.items.map((item, idx) => (
                        <div key={idx} className="py-2 flex items-start justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <div className="font-medium text-slate-100 truncate">
                              {item.productName}
                              {item.quantity < 0 && (
                                <span className="ml-1.5 text-[10px] font-semibold text-amber-400">
                                  (Retour)
                                </span>
                              )}
                            </div>
                            <div
                              className={`text-[11px] font-mono tabular-nums ${
                                item.quantity < 0 ? 'text-amber-400' : 'text-slate-400'
                              }`}
                            >
                              {item.quantity} × {formatMoney(item.unitPrice)}
                              {item.discountPercent > 0 && (
                                <span className="text-rose-400 ml-1.5">
                                  (-{item.discountPercent}%)
                                </span>
                              )}
                            </div>
                          </div>
                          <div
                            className={`font-mono font-semibold tabular-nums shrink-0 ${
                              item.total < 0 ? 'text-amber-400' : 'text-white'
                            }`}
                          >
                            {formatMoney(item.total)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Return Notice if returned or contains negative return items */}
                  {(selectedSale.status === 'RETURNED' ||
                    selectedSale.total < 0 ||
                    selectedSale.items.some((i) => i.quantity < 0)) && (
                    <div
                      className={`p-2.5 rounded-lg border text-xs space-y-0.5 ${
                        selectedSale.status === 'RETURNED'
                          ? 'bg-rose-950/30 border-rose-800/40 text-rose-300'
                          : 'bg-amber-950/30 border-amber-800/40 text-amber-300'
                      }`}
                    >
                      <div className="font-semibold flex items-center gap-1.5">
                        <RotateCcw
                          className={`w-3.5 h-3.5 ${
                            selectedSale.status === 'RETURNED' ? 'text-rose-400' : 'text-amber-400'
                          }`}
                        />
                        <span>
                          {selectedSale.status === 'RETURNED'
                            ? 'Ticket annulé / retourné'
                            : 'Ticket avec retour produit (quantité négative)'}
                        </span>
                      </div>
                      {selectedSale.returnReason && (
                        <div className="text-[11px] opacity-90">
                          Motif : {selectedSale.returnReason}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Totals Footer */}
                <div className="pt-3 border-t border-slate-800 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Sous-total HT</span>
                    <span className="font-mono tabular-nums">
                      {formatMoney(selectedSale.subtotal)}
                    </span>
                  </div>
                  {selectedSale.discountAmount > 0 && (
                    <div className="flex justify-between text-rose-400">
                      <span>Remises accordées</span>
                      <span className="font-mono tabular-nums">
                        -{formatMoney(selectedSale.discountAmount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400">
                    <span>Dont TVA</span>
                    <span className="font-mono tabular-nums">
                      {formatMoney(selectedSale.vatAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-800/80">
                    <span className="font-bold text-slate-200">
                      {selectedSale.total < 0 ? 'Net à rembourser' : 'Total Net TTC'}
                    </span>
                    <span
                      className={`text-base font-extrabold font-mono tabular-nums ${
                        selectedSale.total < 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {formatMoney(selectedSale.total)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                Sélectionnez un ticket dans la liste pour afficher son détail.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
