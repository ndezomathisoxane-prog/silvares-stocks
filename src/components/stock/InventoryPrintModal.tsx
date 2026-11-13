import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { X, Printer, FileDown, ClipboardList, Layers, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InventoryPrintModalProps {
  filteredProducts: Product[];
  onClose: () => void;
}

const sanitizePdfText = (value: string): string => value.replace(/[\u00A0\u202F]/g, ' ');

export const InventoryPrintModal: React.FC<InventoryPrintModalProps> = ({
  filteredProducts,
  onClose,
}) => {
  const {
    products,
    boutiques,
    selectedBoutiqueId,
    formatMoney,
    getProductStockInBoutique,
    organization,
    currentUser,
  } = useApp();

  const [scope, setScope] = useState<'filtered' | 'all'>(
    filteredProducts.length < products.length ? 'filtered' : 'all'
  );
  const [sheetMode, setSheetMode] = useState<'valued' | 'counting'>('valued');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const itemsToPrint = scope === 'filtered' ? filteredProducts : products;
  const activeBoutique = boutiques.find((b) => b.id === selectedBoutiqueId);
  const boutiqueLabel =
    selectedBoutiqueId === 'all'
      ? 'Tout le Réseau (Toutes Boutiques)'
      : `${activeBoutique?.name || 'Boutique'} (${activeBoutique?.city || ''})`;

  const generatedAt = new Date();
  const formattedDate = generatedAt.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = generatedAt.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Totals for itemsToPrint
  let totalUnits = 0;
  let totalPurchaseValue = 0;
  let totalSellingValue = 0;
  let alertRefs = 0;

  itemsToPrint.forEach((p) => {
    const qty = getProductStockInBoutique(p.id, selectedBoutiqueId);
    totalUnits += qty;
    totalPurchaseValue += qty * p.purchasePrice;
    totalSellingValue += qty * p.sellingPrice;
    if (qty <= p.minThreshold) alertRefs++;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    setIsExportingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header band
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 28, 'F');

      doc.setTextColor(16, 185, 129);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(sanitizePdfText(organization.tradeName.toUpperCase()), 14, 11);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(
        sheetMode === 'counting'
          ? 'FEUILLE DE COMPTAGE INVENTAIRE PHYSIQUE'
          : 'ÉTAT VALORISÉ DE L’INVENTAIRE DES STOCKS',
        14,
        18
      );

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(
        sanitizePdfText(
          `${organization.name} · NINEA: ${organization.taxId || '-'} · Périmètre: ${boutiqueLabel}`
        ),
        14,
        24
      );

      doc.text(
        sanitizePdfText(`Édité le ${formattedDate} à ${formattedTime}`),
        pageWidth - 14,
        11,
        { align: 'right' }
      );
      doc.text(
        sanitizePdfText(`Opérateur: ${currentUser?.name || 'Administrateur'}`),
        pageWidth - 14,
        17,
        { align: 'right' }
      );
      doc.text(
        sanitizePdfText(`${itemsToPrint.length} référence(s) · ${totalUnits} unités`),
        pageWidth - 14,
        23,
        { align: 'right' }
      );

      // Summary KPI row
      autoTable(doc, {
        startY: 32,
        head: [
          [
            'Références',
            'Unités en Stock',
            'Sous Seuil / Rupture',
            "Valeur Stock (Achat HT)",
            'Valeur Vente Estimée (TTC)',
          ],
        ],
        body: [
          [
            `${itemsToPrint.length} réf.`,
            `${totalUnits} unités`,
            `${alertRefs} réf.`,
            sanitizePdfText(formatMoney(totalPurchaseValue)),
            sanitizePdfText(formatMoney(totalSellingValue)),
          ],
        ],
        theme: 'grid',
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 9,
          fontStyle: 'bold',
          textColor: [15, 23, 42],
        },
        margin: { left: 14, right: 14 },
      });

      const afterKpiY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 50;

      if (sheetMode === 'counting') {
        autoTable(doc, {
          startY: afterKpiY + 5,
          head: [
            [
              'SKU',
              'Code-barres',
              'Désignation Article',
              'Catégorie',
              'Stock Info.',
              'Stock Compté',
              'Écart',
              'Observations',
            ],
          ],
          body: itemsToPrint.map((p) => {
            const qty = getProductStockInBoutique(p.id, selectedBoutiqueId);
            return [
              p.sku,
              p.barcode,
              sanitizePdfText(p.name),
              sanitizePdfText(p.category.split(' & ')[0]),
              `${qty} ${p.unit}`,
              '',
              '',
              '',
            ];
          }),
          theme: 'grid',
          headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontSize: 8,
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [15, 23, 42],
            minCellHeight: 8,
          },
          columnStyles: {
            4: { halign: 'center' },
            5: { cellWidth: 26 },
            6: { cellWidth: 20 },
            7: { cellWidth: 42 },
          },
          margin: { left: 14, right: 14, bottom: 24 },
        });
      } else {
        autoTable(doc, {
          startY: afterKpiY + 5,
          head: [
            [
              'SKU',
              'Désignation Article',
              'Catégorie',
              'Fournisseur',
              'Stock Dispo',
              'Seuil Min',
              'Prix Achat HT',
              'Prix Vente TTC',
              'Valeur Stock HT',
            ],
          ],
          body: itemsToPrint.map((p) => {
            const qty = getProductStockInBoutique(p.id, selectedBoutiqueId);
            const val = qty * p.purchasePrice;
            return [
              p.sku,
              sanitizePdfText(p.name),
              sanitizePdfText(p.category.split(' & ')[0]),
              sanitizePdfText(p.supplier),
              `${qty} ${p.unit}`,
              `${p.minThreshold}`,
              sanitizePdfText(formatMoney(p.purchasePrice)),
              sanitizePdfText(formatMoney(p.sellingPrice)),
              sanitizePdfText(formatMoney(val)),
            ];
          }),
          theme: 'striped',
          headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontSize: 8,
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [15, 23, 42],
          },
          columnStyles: {
            4: { halign: 'center' },
            5: { halign: 'center' },
            6: { halign: 'right' },
            7: { halign: 'right' },
            8: { halign: 'right', fontStyle: 'bold' },
          },
          margin: { left: 14, right: 14, bottom: 24 },
        });
      }

      // Page numbers & signature footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(
          'Visa Magasinier : ______________________     Visa Gérant / Contrôle : ______________________',
          14,
          pageHeight - 9
        );
        doc.text(`Page ${i} / ${pageCount}`, pageWidth - 14, pageHeight - 9, {
          align: 'right',
        });
      }

      const dateSlug = generatedAt.toISOString().slice(0, 10);
      const modeSlug = sheetMode === 'counting' ? 'fiche-comptage' : 'etat-valorise';
      doc.save(`inventaire-${modeSlug}-${dateSlug}.pdf`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-5xl w-full shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Modal Control Toolbar (hidden on print) */}
        <div className="no-print p-4 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Impression de l'Inventaire</h2>
              <p className="text-[11px] text-slate-400">
                Aperçu format A4 prêt pour impression papier ou archivage PDF
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Scope toggle */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setScope('filtered')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                  scope === 'filtered'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Filtrés ({filteredProducts.length})
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                  scope === 'all'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Catalogue complet ({products.length})
              </button>
            </div>

            {/* Mode toggle */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setSheetMode('valued')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                  sheetMode === 'valued'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>État Valorisé</span>
              </button>
              <button
                type="button"
                onClick={() => setSheetMode('counting')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                  sheetMode === 'counting'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ClipboardList className="w-3 h-3" />
                <span>Feuille de Comptage</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable A4 Sheet Preview */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 bg-slate-950/60">
          <div
            id="printable-inventory"
            className="bg-white text-slate-900 rounded-lg shadow-lg p-6 sm:p-8 mx-auto max-w-[297mm] space-y-5"
          >
            {/* Document Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
              <div>
                <div className="text-lg font-extrabold tracking-tight text-slate-950 uppercase">
                  {organization.tradeName}
                </div>
                <div className="text-xs font-semibold text-slate-700">{organization.name}</div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  {organization.address}, {organization.city} · Tél : {organization.phone}
                </div>
                {(organization.taxId || organization.tradeRegister) && (
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    {organization.taxId ? `NINEA : ${organization.taxId}` : ''}
                    {organization.taxId && organization.tradeRegister ? ' · ' : ''}
                    {organization.tradeRegister ? `RCCM : ${organization.tradeRegister}` : ''}
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="text-sm font-extrabold uppercase tracking-wide text-slate-950">
                  {sheetMode === 'counting'
                    ? 'Feuille de Comptage Physique'
                    : 'État Valorisé des Stocks'}
                </div>
                <div className="text-xs font-semibold text-emerald-700 mt-0.5">
                  Périmètre : {boutiqueLabel}
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5 font-mono">
                  Édité le {formattedDate} à {formattedTime}
                </div>
                <div className="text-[11px] text-slate-500">
                  Opérateur : {currentUser?.name || 'Administrateur'}
                </div>
              </div>
            </div>

            {/* Summary KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 border border-slate-300 rounded bg-slate-50">
                <div className="text-[10px] uppercase font-semibold text-slate-500">
                  Références Listées
                </div>
                <div className="text-sm font-bold font-mono text-slate-900 tabular-nums">
                  {itemsToPrint.length} réf. ({totalUnits} unités)
                </div>
              </div>
              <div className="p-2.5 border border-slate-300 rounded bg-slate-50">
                <div className="text-[10px] uppercase font-semibold text-slate-500">
                  Sous Seuil / Rupture
                </div>
                <div className="text-sm font-bold font-mono text-amber-700 tabular-nums">
                  {alertRefs} référence(s)
                </div>
              </div>
              <div className="p-2.5 border border-slate-300 rounded bg-slate-50">
                <div className="text-[10px] uppercase font-semibold text-slate-500">
                  Valeur Stock (Achat HT)
                </div>
                <div className="text-sm font-bold font-mono text-emerald-800 tabular-nums">
                  {formatMoney(totalPurchaseValue)}
                </div>
              </div>
              <div className="p-2.5 border border-slate-300 rounded bg-slate-50">
                <div className="text-[10px] uppercase font-semibold text-slate-500">
                  Valeur Vente Estimée
                </div>
                <div className="text-sm font-bold font-mono text-slate-900 tabular-nums">
                  {formatMoney(totalSellingValue)}
                </div>
              </div>
            </div>

            {/* Inventory Table */}
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                  <th className="py-2 px-2.5 border border-slate-700">SKU / EAN</th>
                  <th className="py-2 px-2.5 border border-slate-700">Désignation</th>
                  <th className="py-2 px-2.5 border border-slate-700">Catégorie</th>
                  <th className="py-2 px-2.5 border border-slate-700 text-center">Stock Info.</th>
                  {sheetMode === 'counting' ? (
                    <>
                      <th className="py-2 px-2.5 border border-slate-700 text-center w-24">
                        Stock Compté
                      </th>
                      <th className="py-2 px-2.5 border border-slate-700 text-center w-20">
                        Écart
                      </th>
                      <th className="py-2 px-2.5 border border-slate-700 w-36">Observations</th>
                    </>
                  ) : (
                    <>
                      <th className="py-2 px-2.5 border border-slate-700 text-center">Seuil</th>
                      <th className="py-2 px-2.5 border border-slate-700 text-right">
                        Prix Achat HT
                      </th>
                      <th className="py-2 px-2.5 border border-slate-700 text-right">
                        Prix Vente TTC
                      </th>
                      <th className="py-2 px-2.5 border border-slate-700 text-right">
                        Valeur Stock HT
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {itemsToPrint.map((p, idx) => {
                  const qty = getProductStockInBoutique(p.id, selectedBoutiqueId);
                  const val = qty * p.purchasePrice;
                  const isAlert = qty <= p.minThreshold;

                  return (
                    <tr
                      key={p.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                    >
                      <td className="py-2 px-2.5 border border-slate-300 font-mono text-[10px] text-slate-700">
                        <div className="font-bold text-slate-900">{p.sku}</div>
                        <div>{p.barcode}</div>
                      </td>
                      <td className="py-2 px-2.5 border border-slate-300 font-semibold text-slate-900">
                        {p.name}
                      </td>
                      <td className="py-2 px-2.5 border border-slate-300 text-slate-700">
                        {p.category.split(' & ')[0]}
                      </td>
                      <td
                        className={`py-2 px-2.5 border border-slate-300 text-center font-mono font-bold tabular-nums ${
                          isAlert ? 'text-rose-700' : 'text-slate-900'
                        }`}
                      >
                        {qty} {p.unit}
                      </td>

                      {sheetMode === 'counting' ? (
                        <>
                          <td className="py-2 px-2.5 border border-slate-300 text-center text-slate-400">
                            &nbsp;
                          </td>
                          <td className="py-2 px-2.5 border border-slate-300 text-center text-slate-400">
                            &nbsp;
                          </td>
                          <td className="py-2 px-2.5 border border-slate-300 text-slate-400">
                            &nbsp;
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-2.5 border border-slate-300 text-center font-mono tabular-nums text-slate-600">
                            {p.minThreshold}
                          </td>
                          <td className="py-2 px-2.5 border border-slate-300 text-right font-mono tabular-nums text-slate-700">
                            {formatMoney(p.purchasePrice)}
                          </td>
                          <td className="py-2 px-2.5 border border-slate-300 text-right font-mono tabular-nums text-slate-900 font-semibold">
                            {formatMoney(p.sellingPrice)}
                          </td>
                          <td className="py-2 px-2.5 border border-slate-300 text-right font-mono tabular-nums font-bold text-slate-950">
                            {formatMoney(val)}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {sheetMode === 'valued' && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-950">
                    <td colSpan={3} className="py-2.5 px-2.5 border border-slate-300 text-right uppercase text-[10px]">
                      Totaux Inventaire
                    </td>
                    <td className="py-2.5 px-2.5 border border-slate-300 text-center font-mono tabular-nums">
                      {totalUnits} unités
                    </td>
                    <td colSpan={3} className="py-2.5 px-2.5 border border-slate-300 text-right text-[10px] text-slate-600">
                      Valeur totale d'achat HT :
                    </td>
                    <td className="py-2.5 px-2.5 border border-slate-300 text-right font-mono tabular-nums text-emerald-800">
                      {formatMoney(totalPurchaseValue)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>

            {/* Signatures Footer */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-300 text-[11px] text-slate-700">
              <div>
                <div className="font-bold text-slate-900">Visa Magasinier / Inventoriste</div>
                <div className="h-12 border-b border-dashed border-slate-400 mt-2" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Visa Gérant / Contrôle</div>
                <div className="h-12 border-b border-dashed border-slate-400 mt-2" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Date, Heure & Cachet</div>
                <div className="h-12 border-b border-dashed border-slate-400 mt-2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
