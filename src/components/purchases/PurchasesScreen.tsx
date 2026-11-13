import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PurchaseOrder, PurchaseOrderStatus, Supplier } from '../../types';
import {
  ShoppingCart,
  Truck,
  Plus,
  Search,
  PackageCheck,
  CheckCircle2,
  Clock,
  XCircle,
  FileEdit,
  Wallet,
  FileDown,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  Send,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PurchaseOrderModal } from './PurchaseOrderModal';
import { PurchaseReceptionModal } from './PurchaseReceptionModal';
import { SupplierModal } from './SupplierModal';

const sanitizePdfText = (value: string): string => value.replace(/[\u00A0\u202F]/g, ' ');

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  BROUILLON: 'Brouillon',
  COMMANDE: 'Commandé',
  RECU: 'Reçu en stock',
  ANNULE: 'Annulé',
};

export const PurchasesScreen: React.FC = () => {
  const {
    purchaseOrders,
    suppliers,
    boutiques,
    selectedBoutiqueId,
    formatMoney,
    updatePurchaseOrderStatus,
    removePurchaseOrderItem,
    recordPurchasePayment,
    deletePurchaseOrder,
    deleteSupplier,
    organization,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'suppliers'>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PurchaseOrderStatus>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState<PurchaseOrder | null>(null);
  const [revertStockOnDelete, setRevertStockOnDelete] = useState<boolean>(true);
  const [defaultOrderSupplierId, setDefaultOrderSupplierId] = useState<string | undefined>();
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Payment prompt modal state
  const [payingOrder, setPayingOrder] = useState<PurchaseOrder | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  // Scoped orders
  const scopedOrders = useMemo(() => {
    return [...purchaseOrders]
      .filter((po) => selectedBoutiqueId === 'all' || po.boutiqueId === selectedBoutiqueId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchaseOrders, selectedBoutiqueId]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedOrders.filter((po) => {
      if (statusFilter !== 'all' && po.status !== statusFilter) return false;
      if (!q) return true;
      return (
        po.orderNumber.toLowerCase().includes(q) ||
        po.supplierName.toLowerCase().includes(q) ||
        po.items.some((i) => i.productName.toLowerCase().includes(q))
      );
    });
  }, [scopedOrders, statusFilter, searchQuery]);

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.contactName.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q)
    );
  }, [suppliers, searchQuery]);

  useEffect(() => {
    if (filteredOrders.length === 0) {
      setSelectedOrderId(null);
      return;
    }
    if (!filteredOrders.some((o) => o.id === selectedOrderId)) {
      setSelectedOrderId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedOrderId]);

  const selectedOrder = useMemo(
    () => filteredOrders.find((o) => o.id === selectedOrderId) || null,
    [filteredOrders, selectedOrderId]
  );

  // KPI Metrics
  const nonCancelledOrders = scopedOrders.filter((po) => po.status !== 'ANNULE');
  const totalPurchaseVolume = nonCancelledOrders.reduce((sum, po) => sum + po.totalTTC, 0);
  const pendingOrders = scopedOrders.filter((po) => po.status === 'COMMANDE');
  const pendingValue = pendingOrders.reduce((sum, po) => sum + po.totalTTC, 0);
  const receivedOrders = scopedOrders.filter((po) => po.status === 'RECU');
  const receivedValue = receivedOrders.reduce((sum, po) => sum + po.totalTTC, 0);
  const totalSupplierPayables = nonCancelledOrders.reduce(
    (sum, po) => sum + Math.max(0, po.totalTTC - po.amountPaid),
    0
  );

  const activeBoutique = boutiques.find((b) => b.id === selectedBoutiqueId);
  const scopeLabel =
    selectedBoutiqueId === 'all'
      ? 'Tout le Réseau (Toutes Boutiques)'
      : activeBoutique?.name || 'Boutique';

  const handleOpenPayment = (order: PurchaseOrder) => {
    const remaining = Math.max(0, order.totalTTC - order.amountPaid);
    setPayingOrder(order);
    setPaymentAmount(remaining);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingOrder || paymentAmount <= 0) return;
    recordPurchasePayment(payingOrder.id, paymentAmount);
    setPayingOrder(null);
  };

  const handleExportOrderPdf = (order: PurchaseOrder) => {
    const supplier = suppliers.find((s) => s.id === order.supplierId);
    const destBoutique = boutiques.find((b) => b.id === order.boutiqueId);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 30, 'F');

    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(sanitizePdfText(organization.tradeName.toUpperCase()), margin, 11);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text(`BON DE COMMANDE FOURNISSEUR · ${order.orderNumber}`, margin, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    doc.text(
      sanitizePdfText(`${organization.name} · NINEA : ${organization.taxId || '-'}`),
      margin,
      25
    );
    doc.text(
      sanitizePdfText(`Date : ${new Date(order.date).toLocaleDateString('fr-FR')}`),
      pageWidth - margin,
      12,
      { align: 'right' }
    );
    doc.text(
      sanitizePdfText(`Statut : ${STATUS_LABELS[order.status]}`),
      pageWidth - margin,
      18,
      { align: 'right' }
    );

    autoTable(doc, {
      startY: 36,
      head: [['Fournisseur', 'Livraison / Dépôt Destinataire']],
      body: [
        [
          sanitizePdfText(
            `${order.supplierName}\nContact : ${supplier?.contactName || '-'}\nTél : ${
              supplier?.phone || '-'
            }\nConditions : ${supplier?.paymentTerms || '-'}`
          ),
          sanitizePdfText(
            `${destBoutique?.name || 'Dépôt'}\n${destBoutique?.address || ''}, ${
              destBoutique?.city || ''
            }\nLivraison prévue : ${
              order.expectedDate
                ? new Date(order.expectedDate).toLocaleDateString('fr-FR')
                : 'Non précisée'
            }\nÉmis par : ${order.createdBy}`
          ),
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5, textColor: [15, 23, 42] },
      margin: { left: margin, right: margin },
    });

    const afterMetaY =
      (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 70;

    autoTable(doc, {
      startY: afterMetaY + 6,
      head: [['SKU', 'Désignation Article', 'Quantité', 'Prix Unit. HT', 'TVA', 'Total HT']],
      body: order.items.map((i) => [
        i.sku,
        sanitizePdfText(i.productName),
        `${i.quantity} ${i.unit}`,
        sanitizePdfText(formatMoney(i.unitCost)),
        `${i.vatRate}%`,
        sanitizePdfText(formatMoney(i.total)),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5, textColor: [15, 23, 42] },
      columnStyles: {
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'center' },
        5: { halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });

    const afterItemsY =
      (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 130;

    autoTable(doc, {
      startY: afterItemsY + 5,
      body: [
        ['Total HT', sanitizePdfText(formatMoney(order.subtotalHT))],
        ['TVA Déductible', sanitizePdfText(formatMoney(order.vatAmount))],
        ['Total TTC', sanitizePdfText(formatMoney(order.totalTTC))],
        ['Montant Réglé', sanitizePdfText(formatMoney(order.amountPaid))],
        [
          'Reste à Payer',
          sanitizePdfText(formatMoney(Math.max(0, order.totalTTC - order.amountPaid))),
        ],
      ],
      theme: 'grid',
      bodyStyles: { fontSize: 9, textColor: [15, 23, 42] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: pageWidth - 95, right: margin },
    });

    doc.save(`bon-commande-${order.orderNumber}.pdf`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Primary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">
            Achats, Commandes & Fournisseurs
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Périmètre actif : <span className="text-emerald-400 font-medium">{scopeLabel}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setEditingSupplier(null);
              setShowSupplierModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
          >
            <Truck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Nouveau Fournisseur</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingOrder(null);
              setDefaultOrderSupplierId(undefined);
              setShowOrderModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Bon de Commande</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-400">Volume Achats TTC</span>
          <div className="text-lg font-bold font-mono text-white tabular-nums mt-0.5">
            {formatMoney(totalPurchaseVolume)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {nonCancelledOrders.length} bon(s) actif(s)
          </div>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-400">Commandes en Attente</span>
          <div className="text-lg font-bold font-mono text-cyan-400 tabular-nums mt-0.5">
            {formatMoney(pendingValue)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {pendingOrders.length} livraison(s) attendue(s)
          </div>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-400">Réceptions en Stock</span>
          <div className="text-lg font-bold font-mono text-emerald-400 tabular-nums mt-0.5">
            {formatMoney(receivedValue)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {receivedOrders.length} bon(s) réceptionné(s)
          </div>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-400">Dettes Fournisseurs</span>
          <div
            className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${
              totalSupplierPayables > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {formatMoney(totalSupplierPayables)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Reste à régler</div>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl col-span-2 sm:col-span-1">
          <span className="text-[11px] font-medium text-slate-400">Fournisseurs Actifs</span>
          <div className="text-lg font-bold font-mono text-white tabular-nums mt-0.5">
            {suppliers.length} partenaires
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Répertoire référencé</div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('orders')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeSubTab === 'orders'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Bons de Commande & Réceptions ({scopedOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('suppliers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeSubTab === 'suppliers'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Répertoire Fournisseurs ({suppliers.length})</span>
        </button>
      </div>

      {activeSubTab === 'orders' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/50">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par N° bon, fournisseur ou article..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              {(
                [
                  { id: 'all', label: 'Tous' },
                  { id: 'BROUILLON', label: 'Brouillons' },
                  { id: 'COMMANDE', label: 'Commandés' },
                  { id: 'RECU', label: 'Reçus' },
                  { id: 'ANNULE', label: 'Annulés' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <ShoppingCart className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-xs text-slate-400">
                Aucun bon de commande trouvé pour ces critères.
              </div>
              <button
                type="button"
                onClick={() => {
                  setDefaultOrderSupplierId(undefined);
                  setShowOrderModal(true);
                }}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
              >
                Créer un bon de commande
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
              {/* Orders Table (7 cols) */}
              <div className="lg:col-span-7 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-semibold bg-slate-900/60">
                      <th className="py-2.5 px-4">Bon & Date</th>
                      <th className="py-2.5 px-3">Fournisseur</th>
                      <th className="py-2.5 px-3">Réception</th>
                      <th className="py-2.5 px-3">Règlement</th>
                      <th className="py-2.5 px-4 text-right">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredOrders.map((po) => {
                      const isSelected = po.id === selectedOrder?.id;
                      const dest = boutiques.find((b) => b.id === po.boutiqueId);

                      return (
                        <tr
                          key={po.id}
                          onClick={() => setSelectedOrderId(po.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-500/10' : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div
                              className={`font-mono font-bold tabular-nums ${
                                isSelected ? 'text-emerald-400' : 'text-white'
                              }`}
                            >
                              {po.orderNumber}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                              {new Date(po.date).toLocaleDateString('fr-FR')} · {po.items.length}{' '}
                              ligne(s)
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-200">{po.supplierName}</div>
                            <div className="text-[11px] text-slate-400">
                              {dest?.name || 'Dépôt'}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            {po.status === 'RECU' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 whitespace-nowrap">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Reçu</span>
                              </span>
                            )}
                            {po.status === 'COMMANDE' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 whitespace-nowrap">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Commandé</span>
                              </span>
                            )}
                            {po.status === 'BROUILLON' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 whitespace-nowrap">
                                <FileEdit className="w-3.5 h-3.5" />
                                <span>Brouillon</span>
                              </span>
                            )}
                            {po.status === 'ANNULE' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 whitespace-nowrap">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Annulé</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            {po.status === 'ANNULE' ? (
                              <span className="text-[11px] text-slate-500">-</span>
                            ) : po.paymentStatus === 'PAYE' ? (
                              <span className="text-[11px] font-medium text-emerald-400">
                                Réglé
                              </span>
                            ) : po.paymentStatus === 'PARTIEL' ? (
                              <span className="text-[11px] font-medium text-amber-400">
                                Partiel
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-400">
                                À payer
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-white tabular-nums whitespace-nowrap">
                            {formatMoney(po.totalTTC)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Order Detail Inspector (5 cols) */}
              <div className="lg:col-span-5 p-5 bg-slate-950/30 flex flex-col justify-between space-y-4">
                {selectedOrder ? (
                  <>
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                        <div>
                          <div className="text-[11px] text-slate-400">
                            Bon de commande fournisseur
                          </div>
                          <h3 className="text-base font-extrabold font-mono text-white mt-0.5">
                            {selectedOrder.orderNumber}
                          </h3>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {selectedOrder.supplierName} ·{' '}
                            {new Date(selectedOrder.date).toLocaleDateString('fr-FR')}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {(selectedOrder.status === 'BROUILLON' ||
                            selectedOrder.status === 'COMMANDE') && (
                            <button
                              type="button"
                              onClick={() => setEditingOrder(selectedOrder)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-cyan-300 transition-colors whitespace-nowrap shrink-0"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Modifier</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleExportOrderPdf(selectedOrder)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
                          >
                            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Bon PDF</span>
                          </button>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="grid grid-cols-2 gap-3 text-xs pb-3 border-b border-slate-800">
                        <div>
                          <div className="text-[11px] text-slate-400">Entrepôt / Boutique</div>
                          <div className="font-medium text-slate-200 mt-0.5">
                            {boutiques.find((b) => b.id === selectedOrder.boutiqueId)?.name ||
                              'Dépôt'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-400">Émis / Réceptionné par</div>
                          <div className="font-medium text-slate-200 mt-0.5">
                            {selectedOrder.createdBy}
                            {selectedOrder.receivedBy
                              ? ` · Reçu: ${selectedOrder.receivedBy}`
                              : ''}
                          </div>
                        </div>
                      </div>

                      {/* Ordered Items */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                          <span>Lignes commandées</span>
                          <span>Total HT</span>
                        </div>
                        <div className="divide-y divide-slate-800/60 max-h-52 overflow-y-auto pr-1">
                          {selectedOrder.items.map((item, idx) => {
                            const canModifyItems =
                              selectedOrder.status === 'BROUILLON' ||
                              selectedOrder.status === 'COMMANDE';
                            return (
                              <div
                                key={`${item.productId}-${idx}`}
                                className="py-2 flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-slate-100 truncate">
                                    {item.productName}
                                  </div>
                                  <div className="text-[11px] font-mono tabular-nums text-slate-400">
                                    {item.quantity} {item.unit} × {formatMoney(item.unitCost)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-mono font-semibold text-white tabular-nums">
                                    {formatMoney(item.total)}
                                  </span>
                                  {canModifyItems && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (selectedOrder.items.length === 1) {
                                          setRevertStockOnDelete(true);
                                          setConfirmDeleteOrder(selectedOrder);
                                        } else {
                                          removePurchaseOrderItem(selectedOrder.id, idx);
                                        }
                                      }}
                                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                                      title="Supprimer ce produit du bon"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {selectedOrder.notes && (
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                          Note : {selectedOrder.notes}
                        </div>
                      )}
                    </div>

                    {/* Totals & Workflow Actions */}
                    <div className="space-y-3 pt-3 border-t border-slate-800">
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>Sous-total HT</span>
                          <span className="font-mono tabular-nums">
                            {formatMoney(selectedOrder.subtotalHT)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>TVA déductible</span>
                          <span className="font-mono tabular-nums">
                            {formatMoney(selectedOrder.vatAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-800/80">
                          <span>Total TTC</span>
                          <span className="font-mono tabular-nums text-emerald-400">
                            {formatMoney(selectedOrder.totalTTC)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Déjà réglé</span>
                          <span className="font-mono tabular-nums text-slate-200">
                            {formatMoney(selectedOrder.amountPaid)}
                          </span>
                        </div>
                        {selectedOrder.status !== 'ANNULE' &&
                          selectedOrder.totalTTC - selectedOrder.amountPaid > 0 && (
                            <div className="flex justify-between text-xs font-semibold text-amber-400">
                              <span>Reste à payer</span>
                              <span className="font-mono tabular-nums">
                                {formatMoney(selectedOrder.totalTTC - selectedOrder.amountPaid)}
                              </span>
                            </div>
                          )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {selectedOrder.status === 'BROUILLON' && (
                          <button
                            type="button"
                            onClick={() =>
                              updatePurchaseOrderStatus(selectedOrder.id, 'COMMANDE')
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Valider Commande</span>
                          </button>
                        )}

                        {(selectedOrder.status === 'BROUILLON' ||
                          selectedOrder.status === 'COMMANDE') && (
                          <button
                            type="button"
                            onClick={() => setReceivingOrder(selectedOrder)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Réceptionner en Stock</span>
                          </button>
                        )}

                        {selectedOrder.status !== 'ANNULE' &&
                          selectedOrder.amountPaid < selectedOrder.totalTTC && (
                            <button
                              type="button"
                              onClick={() => handleOpenPayment(selectedOrder)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                              <span>Régler Fournisseur</span>
                            </button>
                          )}

                        {(selectedOrder.status === 'BROUILLON' ||
                          selectedOrder.status === 'COMMANDE') && (
                          <button
                            type="button"
                            onClick={() =>
                              updatePurchaseOrderStatus(selectedOrder.id, 'ANNULE')
                            }
                            className="px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Annuler
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setRevertStockOnDelete(true);
                            setConfirmDeleteOrder(selectedOrder);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors ml-auto whitespace-nowrap"
                          title="Supprimer tout le bon de commande"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-500">
                    Sélectionnez un bon de commande pour consulter ses détails.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Suppliers Directory Tab */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/50">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher un fournisseur, code, contact ou ville..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingSupplier(null);
                setShowSupplierModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter Fournisseur</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredSuppliers.map((sup) => {
              const supOrders = purchaseOrders.filter(
                (po) => po.supplierId === sup.id && po.status !== 'ANNULE'
              );
              const totalOrdered = supOrders.reduce((s, po) => s + po.totalTTC, 0);
              const outstandingDebt = supOrders.reduce(
                (s, po) => s + Math.max(0, po.totalTTC - po.amountPaid),
                0
              );

              return (
                <div
                  key={sup.id}
                  className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-mono text-emerald-400">{sup.code}</div>
                        <h3 className="text-sm font-bold text-white">{sup.name}</h3>
                        <div className="text-xs text-slate-400">
                          Contact : {sup.contactName} · Délai : {sup.paymentTerms}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSupplier(sup);
                            setShowSupplierModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Supprimer le fournisseur "${sup.name}" du répertoire ?`
                              )
                            ) {
                              deleteSupplier(sup.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-1 pt-1">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{sup.phone || 'Non renseigné'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span className="truncate">
                          {sup.address ? `${sup.address}, ` : ''}
                          {sup.city}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-500">Total Commandé</div>
                        <div className="font-mono font-bold text-slate-200 tabular-nums">
                          {formatMoney(totalOrdered)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500">Solde à Payer</div>
                        <div
                          className={`font-mono font-bold tabular-nums ${
                            outstandingDebt > 0 ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {formatMoney(outstandingDebt)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDefaultOrderSupplierId(sup.id);
                        setShowOrderModal(true);
                      }}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-emerald-400 transition-colors"
                    >
                      Passer commande
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create / Edit Purchase Order Modal */}
      {(showOrderModal || editingOrder) && (
        <PurchaseOrderModal
          order={editingOrder}
          defaultSupplierId={defaultOrderSupplierId}
          onClose={() => {
            setShowOrderModal(false);
            setEditingOrder(null);
            setDefaultOrderSupplierId(undefined);
          }}
        />
      )}

      {/* Purchase Reception Modal (with editable received quantities) */}
      {receivingOrder && (
        <PurchaseReceptionModal
          order={receivingOrder}
          onClose={() => setReceivingOrder(null)}
        />
      )}

      {/* Delete Purchase Order Confirmation Modal */}
      {confirmDeleteOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Supprimer le bon {confirmDeleteOrder.orderNumber} ?
                </h3>
                <p className="text-slate-400 mt-1">
                  Fournisseur : <span className="text-slate-200 font-medium">{confirmDeleteOrder.supplierName}</span>.
                  Cette action supprimera définitivement l&apos;ensemble du bon de commande et ses {confirmDeleteOrder.items.length} ligne(s).
                </p>
              </div>
            </div>

            {confirmDeleteOrder.status === 'RECU' && (
              <label className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={revertStockOnDelete}
                  onChange={(e) => setRevertStockOnDelete(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                />
                <span>
                  Retirer également les quantités réceptionnées du stock de la boutique ({boutiques.find((b) => b.id === confirmDeleteOrder.boutiqueId)?.name || 'Dépôt'}).
                </span>
              </label>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteOrder(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  deletePurchaseOrder(
                    confirmDeleteOrder.id,
                    confirmDeleteOrder.status === 'RECU' ? revertStockOnDelete : false
                  );
                  setConfirmDeleteOrder(null);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Supplier Modal */}
      {showSupplierModal && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => {
            setShowSupplierModal(false);
            setEditingSupplier(null);
          }}
        />
      )}

      {/* Supplier Payment Modal */}
      {payingOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmPayment}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4 text-xs"
          >
            <div>
              <h3 className="text-sm font-bold text-white">
                Règlement Fournisseur · {payingOrder.orderNumber}
              </h3>
              <p className="text-slate-400 mt-0.5">{payingOrder.supplierName}</p>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Montant Total TTC :</span>
                <span className="font-mono text-white tabular-nums">
                  {formatMoney(payingOrder.totalTTC)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Déjà réglé :</span>
                <span className="font-mono text-slate-300 tabular-nums">
                  {formatMoney(payingOrder.amountPaid)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-amber-400 pt-1 border-t border-slate-800">
                <span>Solde restant :</span>
                <span className="font-mono tabular-nums">
                  {formatMoney(Math.max(0, payingOrder.totalTTC - payingOrder.amountPaid))}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Montant versé (FCFA)
              </label>
              <input
                type="number"
                min={1}
                max={Math.max(1, payingOrder.totalTTC - payingOrder.amountPaid)}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPayingOrder(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors"
              >
                Valider le règlement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
