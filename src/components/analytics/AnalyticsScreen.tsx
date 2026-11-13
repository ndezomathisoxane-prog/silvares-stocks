import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  TrendingUp,
  ShoppingBag,
  RotateCw,
  PieChart as PieIcon,
  Store,
  DollarSign,
  Award,
  AlertCircle,
  LineChart as LineChartIcon,
  FileDown,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const sanitizePdfText = (value: string): string => value.replace(/[\u00A0\u202F]/g, ' ');

export const AnalyticsScreen: React.FC = () => {
  const {
    sales,
    products,
    boutiques,
    selectedBoutiqueId,
    formatMoney,
    getProductStockInBoutique,
    organization,
    currentUser,
  } = useApp();

  const [period, setPeriod] = useState<'today' | '7days' | '30days' | 'all'>('30days');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'units'>('revenue');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Filter sales based on boutique and period
  const relevantSales = sales.filter((s) => {
    if (s.status !== 'COMPLETED') return false;
    if (selectedBoutiqueId !== 'all' && s.boutiqueId !== selectedBoutiqueId) return false;

    if (period === 'all') return true;

    const saleDate = new Date(s.date);
    const now = new Date();

    if (period === 'today') {
      return (
        saleDate.getDate() === now.getDate() &&
        saleDate.getMonth() === now.getMonth() &&
        saleDate.getFullYear() === now.getFullYear()
      );
    }
    if (period === '7days') {
      const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 7;
    }
    if (period === '30days') {
      const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 30;
    }
    return true;
  });

  // Calculate Primary Metrics
  const totalRevenue = relevantSales.reduce((sum, s) => sum + s.total, 0);

  const totalCOGS = relevantSales.reduce((sum, s) => {
    const saleCost = s.items.reduce(
      (c, item) => c + item.purchasePrice * item.quantity,
      0
    );
    return sum + saleCost;
  }, 0);

  const totalGrossMargin = Math.max(0, totalRevenue - totalCOGS);
  const grossMarginRate = totalRevenue > 0 ? (totalGrossMargin / totalRevenue) * 100 : 0;
  const transactionCount = relevantSales.length;
  const averageBasket = transactionCount > 0 ? totalRevenue / transactionCount : 0;

  // Stock Turnover Rate (Rotation de stock) = COGS / Average Stock Value
  const totalCurrentStockValuation = products.reduce((sum, p) => {
    const qty = getProductStockInBoutique(p.id, selectedBoutiqueId);
    return sum + qty * p.purchasePrice;
  }, 0);

  const stockTurnoverRate =
    totalCurrentStockValuation > 0
      ? (totalCOGS / totalCurrentStockValuation).toFixed(2)
      : '0.00';

  // Payment Breakdown
  const paymentMethodTotals: { [key: string]: number } = {
    ESPECES: 0,
    WAVE: 0,
    ORANGE_MONEY: 0,
    CARTE_BANCAIRE: 0,
    CREDIT_CLIENT: 0,
  };

  relevantSales.forEach((s) => {
    s.payments.forEach((p) => {
      paymentMethodTotals[p.method] = (paymentMethodTotals[p.method] || 0) + p.amount;
    });
  });

  // Product sales analysis: aggregation by product
  const productPerformanceMap: {
    [productId: string]: {
      name: string;
      sku: string;
      category: string;
      quantitySold: number;
      revenue: number;
      grossMargin: number;
    };
  } = {};

  relevantSales.forEach((s) => {
    s.items.forEach((item) => {
      if (!productPerformanceMap[item.productId]) {
        productPerformanceMap[item.productId] = {
          name: item.productName,
          sku: item.sku,
          category: '',
          quantitySold: 0,
          revenue: 0,
          grossMargin: 0,
        };
      }
      productPerformanceMap[item.productId].quantitySold += item.quantity;
      productPerformanceMap[item.productId].revenue += item.total;
      productPerformanceMap[item.productId].grossMargin +=
        item.total - item.purchasePrice * item.quantity;
    });
  });

  // Pareto Analysis (Top 20% producing 80% revenue)
  const productRankedByRevenue = Object.values(productPerformanceMap).sort(
    (a, b) => b.revenue - a.revenue
  );

  let cumulativeRevenue = 0;
  const paretoProducts = productRankedByRevenue.map((p) => {
    cumulativeRevenue += p.revenue;
    const share = totalRevenue > 0 ? (cumulativeRevenue / totalRevenue) * 100 : 0;
    return {
      ...p,
      isTopPareto: share <= 80 || cumulativeRevenue - p.revenue < totalRevenue * 0.8,
      cumulativeShare: share,
    };
  });

  // Sleeping / Inactive products (zero sales in period)
  const dormantProducts = products.filter(
    (p) => !productPerformanceMap[p.id] || productPerformanceMap[p.id].quantitySold === 0
  );

  // Multi-boutique benchmark comparison
  const boutiquePerformance = boutiques.map((b) => {
    const boutiqueSales = sales.filter(
      (s) => s.boutiqueId === b.id && s.status === 'COMPLETED'
    );
    const ca = boutiqueSales.reduce((sum, s) => sum + s.total, 0);
    const cogs = boutiqueSales.reduce((sum, s) => {
      return (
        sum + s.items.reduce((c, i) => c + i.purchasePrice * i.quantity, 0)
      );
    }, 0);
    const margin = Math.max(0, ca - cogs);
    const count = boutiqueSales.length;

    return {
      id: b.id,
      name: b.name,
      city: b.city,
      isDepot: b.isDepot,
      ca,
      margin,
      marginRate: ca > 0 ? (margin / ca) * 100 : 0,
      count,
      averageBasket: count > 0 ? ca / count : 0,
    };
  });

  const activeBoutique = boutiques.find((b) => b.id === selectedBoutiqueId);

  // Build last 7 days daily sales volume dataset (filtered by active boutique)
  const dailySalesData = Array.from({ length: 7 }, (_, idx) => {
    const dayDate = new Date();
    dayDate.setHours(0, 0, 0, 0);
    dayDate.setDate(dayDate.getDate() - (6 - idx));

    const yyyy = dayDate.getFullYear();
    const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
    const dd = String(dayDate.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;

    const daySales = sales.filter((s) => {
      if (s.status !== 'COMPLETED') return false;
      if (selectedBoutiqueId !== 'all' && s.boutiqueId !== selectedBoutiqueId) return false;
      const sDate = new Date(s.date);
      return (
        sDate.getFullYear() === dayDate.getFullYear() &&
        sDate.getMonth() === dayDate.getMonth() &&
        sDate.getDate() === dayDate.getDate()
      );
    });

    const revenue = daySales.reduce((sum, s) => sum + s.total, 0);
    const tickets = daySales.length;
    const units = daySales.reduce(
      (sum, s) => sum + s.items.reduce((uSum, item) => uSum + item.quantity, 0),
      0
    );

    const shortLabel = dayDate.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
    });
    const fullDate = dayDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    return {
      dateKey,
      label: shortLabel,
      fullDate,
      revenue,
      tickets,
      units,
    };
  });

  const last7DaysRevenue = dailySalesData.reduce((sum, d) => sum + d.revenue, 0);
  const last7DaysUnits = dailySalesData.reduce((sum, d) => sum + d.units, 0);
  const last7DaysTickets = dailySalesData.reduce((sum, d) => sum + d.tickets, 0);

  const periodLabels: Record<typeof period, string> = {
    today: "Aujourd'hui",
    '7days': '7 Derniers Jours',
    '30days': 'Ce Mois (30 jours)',
    all: "Tout l'Historique",
  };

  const renderChartToPngDataUrl = async (): Promise<{
    dataUrl: string;
    width: number;
    height: number;
  } | null> => {
    const svg = chartContainerRef.current?.querySelector('svg');
    if (!svg) return null;

    const rect = svg.getBoundingClientRect();
    const width = Math.max(Math.round(rect.width), 600);
    const height = Math.max(Math.round(rect.height), 260);

    const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('width', String(width));
    clonedSvg.setAttribute('height', String(height));

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = (err) => reject(err);
        image.src = url;
      });

      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.scale(scale, scale);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      return {
        dataUrl: canvas.toDataURL('image/png'),
        width,
        height,
      };
    } catch {
      return null;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      const scopeLabel =
        selectedBoutiqueId === 'all'
          ? 'Toutes les boutiques (Réseau)'
          : activeBoutique?.name || 'Boutique';

      const now = new Date();
      const dateStr = now.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const timeStr = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      // Top Header Banner
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 32, 'F');

      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(sanitizePdfText(organization.tradeName.toUpperCase()), margin, 11);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text('RAPPORT ANALYTICS & PERFORMANCE DES VENTES', margin, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(203, 213, 225);
      doc.text(
        sanitizePdfText(
          `${organization.name} · NINEA: ${organization.taxId || '-'} · Périmètre : ${scopeLabel}`
        ),
        margin,
        24
      );
      doc.text(
        sanitizePdfText(`Période : ${periodLabels[period]}`),
        margin,
        29
      );

      doc.text(
        sanitizePdfText(`Généré le ${dateStr} à ${timeStr}`),
        pageWidth - margin,
        12,
        { align: 'right' }
      );
      doc.text(
        sanitizePdfText(`Par : ${currentUser?.name || 'Administrateur'}`),
        pageWidth - margin,
        18,
        { align: 'right' }
      );

      let cursorY = 38;

      // Section 1: KPI Summary Table
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('1. SYNTHÈSE DES INDICATEURS CLÉS (BI)', margin, cursorY);
      cursorY += 3;

      autoTable(doc, {
        startY: cursorY,
        head: [['Indicateur', 'Valeur', 'Détail / Observation']],
        body: [
          [
            "Chiffre d'Affaires",
            sanitizePdfText(formatMoney(totalRevenue)),
            `${relevantSales.length} ticket(s) validé(s)`,
          ],
          [
            'Marge Brute Réalisée',
            sanitizePdfText(formatMoney(totalGrossMargin)),
            `Taux de marge : ${grossMarginRate.toFixed(1)}%`,
          ],
          [
            'Panier Moyen',
            sanitizePdfText(formatMoney(averageBasket)),
            'Par passage en caisse',
          ],
          [
            'Rotation de Stock',
            `${stockTurnoverRate}x`,
            'CAMV / Valeur Stock Moyen',
          ],
          [
            'Valorisation Stock Actuel',
            sanitizePdfText(formatMoney(totalCurrentStockValuation)),
            'Capital immobilisé en rayon (Achat HT)',
          ],
        ],
        theme: 'grid',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: 8.5,
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: [15, 23, 42],
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: margin, right: margin },
      });

      cursorY =
        ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ||
          cursorY) + 8;

      // Section 2: 7-Day Daily Sales Line Chart + Data Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `2. VOLUME DES VENTES JOURNALIÈRES - 7 DERNIERS JOURS (${
          chartMetric === 'revenue' ? "Chiffre d'affaires" : 'Articles & Tickets'
        })`,
        margin,
        cursorY
      );
      cursorY += 3;

      const chartImg = await renderChartToPngDataUrl();
      if (chartImg) {
        const imgHeight = Math.min(62, (chartImg.height / chartImg.width) * contentWidth);
        if (cursorY + imgHeight > pageHeight - 20) {
          doc.addPage();
          cursorY = 16;
        }
        doc.setDrawColor(30, 41, 59);
        doc.addImage(chartImg.dataUrl, 'PNG', margin, cursorY, contentWidth, imgHeight);
        cursorY += imgHeight + 5;
      }

      autoTable(doc, {
        startY: cursorY,
        head: [['Jour', 'Tickets', 'Articles Vendus', "Chiffre d'Affaires"]],
        body: [
          ...dailySalesData.map((d) => [
            sanitizePdfText(d.fullDate),
            String(d.tickets),
            `${d.units} unités`,
            sanitizePdfText(formatMoney(d.revenue)),
          ]),
          [
            'TOTAL 7 JOURS',
            String(last7DaysTickets),
            `${last7DaysUnits} unités`,
            sanitizePdfText(formatMoney(last7DaysRevenue)),
          ],
        ],
        theme: 'striped',
        headStyles: {
          fillColor: [16, 185, 129],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 8.5,
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: [15, 23, 42],
        },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: margin, right: margin },
      });

      cursorY =
        ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ||
          cursorY) + 8;

      // Section 3: Payment Channels Breakdown
      if (cursorY > pageHeight - 55) {
        doc.addPage();
        cursorY = 16;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('3. RÉPARTITION DES MODES DE PAIEMENT', margin, cursorY);
      cursorY += 3;

      const paymentRows = [
        { key: 'ESPECES', label: 'Espèces (Cash en Caisse)' },
        { key: 'WAVE', label: 'Wave Sénégal (Mobile Money)' },
        { key: 'ORANGE_MONEY', label: 'Orange Money & MoMo' },
        { key: 'CARTE_BANCAIRE', label: 'Cartes Bancaires (TPE)' },
        { key: 'CREDIT_CLIENT', label: 'Ventes à Crédit (Compte Client)' },
      ].map((m) => {
        const amt = paymentMethodTotals[m.key] || 0;
        const pct = totalRevenue > 0 ? (amt / totalRevenue) * 100 : 0;
        return [m.label, sanitizePdfText(formatMoney(amt)), `${pct.toFixed(1)}%`];
      });

      autoTable(doc, {
        startY: cursorY,
        head: [['Canal de Paiement', 'Montant Encaissé', 'Part (%)']],
        body: paymentRows,
        theme: 'grid',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: 8.5,
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: [15, 23, 42],
        },
        columnStyles: {
          1: { halign: 'right', fontStyle: 'bold' },
          2: { halign: 'right' },
        },
        margin: { left: margin, right: margin },
      });

      cursorY =
        ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ||
          cursorY) + 8;

      // Section 4: Multi-Boutique Benchmark
      if (cursorY > pageHeight - 55) {
        doc.addPage();
        cursorY = 16;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('4. BENCHMARK MULTI-BOUTIQUES', margin, cursorY);
      cursorY += 3;

      autoTable(doc, {
        startY: cursorY,
        head: [['Boutique / Dépôt', 'Ville', 'CA Total', 'Marge Brute', 'Taux Marge', 'Panier Moyen']],
        body: boutiquePerformance.map((bp) => [
          sanitizePdfText(bp.name),
          sanitizePdfText(bp.city),
          sanitizePdfText(formatMoney(bp.ca)),
          sanitizePdfText(formatMoney(bp.margin)),
          `${bp.marginRate.toFixed(1)}%`,
          sanitizePdfText(formatMoney(bp.averageBasket)),
        ]),
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
          2: { halign: 'right', fontStyle: 'bold' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
        },
        margin: { left: margin, right: margin },
      });

      cursorY =
        ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ||
          cursorY) + 8;

      // Section 5: Pareto Top Products
      if (paretoProducts.length > 0) {
        if (cursorY > pageHeight - 55) {
          doc.addPage();
          cursorY = 16;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text('5. MATRICE PARETO - TOP PRODUITS', margin, cursorY);
        cursorY += 3;

        autoTable(doc, {
          startY: cursorY,
          head: [['SKU', 'Produit', 'Qté Vendue', 'CA Généré', 'Marge Brute', 'Part Cumulée']],
          body: paretoProducts.slice(0, 15).map((p) => [
            p.sku,
            sanitizePdfText(p.name),
            `${p.quantitySold}`,
            sanitizePdfText(formatMoney(p.revenue)),
            sanitizePdfText(formatMoney(p.grossMargin)),
            `${p.cumulativeShare.toFixed(1)}%`,
          ]),
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
            2: { halign: 'center' },
            3: { halign: 'right', fontStyle: 'bold' },
            4: { halign: 'right' },
            5: { halign: 'right' },
          },
          margin: { left: margin, right: margin },
        });

        cursorY =
          ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ||
            cursorY) + 8;
      }

      // Section 6: Detailed Sales Transactions
      if (cursorY > pageHeight - 55) {
        doc.addPage();
        cursorY = 16;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `6. JOURNAL DES VENTES (${relevantSales.length} TRANSACTION${
          relevantSales.length > 1 ? 'S' : ''
        })`,
        margin,
        cursorY
      );
      cursorY += 3;

      autoTable(doc, {
        startY: cursorY,
        head: [['N° Ticket', 'Date & Heure', 'Vendeur', 'Client', 'Paiement', 'Total TTC']],
        body:
          relevantSales.length > 0
            ? relevantSales.map((s) => [
                s.ticketNumber,
                new Date(s.date).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                sanitizePdfText(s.sellerName),
                sanitizePdfText(s.customerName || 'Client Comptoir'),
                s.payments.map((p) => p.method.replace('_', ' ')).join(' + '),
                sanitizePdfText(formatMoney(s.total)),
              ])
            : [['-', '-', '-', 'Aucune vente sur la période sélectionnée', '-', '-']],
        theme: 'grid',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [15, 23, 42],
        },
        columnStyles: {
          5: { halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: margin, right: margin, bottom: 18 },
      });

      // Add page footers
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(
          sanitizePdfText(`${organization.tradeName} · Rapport Analytics BI`),
          margin,
          pageHeight - 8
        );
        doc.text(`Page ${i} / ${totalPages}`, pageWidth - margin, pageHeight - 8, {
          align: 'right',
        });
      }

      const fileDate = now.toISOString().slice(0, 10);
      doc.save(`rapport-analytics-${period}-${fileDate}.pdf`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Title & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Tableau de Bord & Analytics BI
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Périmètre : <span className="text-emerald-400 font-medium">{selectedBoutiqueId === 'all' ? 'Toutes les boutiques (Réseau)' : activeBoutique?.name}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Selector Tabs */}
          <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                period === 'today' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setPeriod('7days')}
              className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                period === '7days' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              7 Derniers Jours
            </button>
            <button
              onClick={() => setPeriod('30days')}
              className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                period === '30days' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ce Mois (30 jours)
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                period === 'all' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tout l'Historique
            </button>
          </div>

          {/* Export PDF Button */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-sm whitespace-nowrap shrink-0"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            <span>{isExportingPdf ? 'Export en cours...' : 'Exporter PDF'}</span>
          </button>
        </div>
      </div>

      {/* Primary BI Indicators Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Chiffre d'Affaires</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold font-mono text-white tabular-nums">
            {formatMoney(totalRevenue)}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>{relevantSales.length} tickets validés</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Marge Brute Réalisée</span>
            <Award className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-extrabold font-mono text-cyan-400 tabular-nums">
            {formatMoney(totalGrossMargin)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Taux de marge : <strong className="text-cyan-300 font-mono">{grossMarginRate.toFixed(1)}%</strong>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Panier Moyen</span>
            <ShoppingBag className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-extrabold font-mono text-purple-400 tabular-nums">
            {formatMoney(averageBasket)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Par passage en caisse</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Rotation de Stock</span>
            <RotateCw className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold font-mono text-amber-400 tabular-nums">
            {stockTurnoverRate}x
          </div>
          <div className="text-[10px] text-slate-400 mt-1">CAMV / Valeur Stock Moyen</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Valorisation Stock Actuel</span>
            <Store className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold font-mono text-emerald-300 tabular-nums">
            {formatMoney(totalCurrentStockValuation)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Capital immobilisé en rayon</div>
        </div>
      </div>

      {/* 7-Day Daily Sales Volume Line Chart (Recharts) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <LineChartIcon className="w-4 h-4 text-emerald-400" />
              Volume des Ventes Journalières (7 Derniers Jours)
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Total sur 7 jours :{' '}
              <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                {formatMoney(last7DaysRevenue)}
              </span>{' '}
              · <span className="font-mono text-slate-300 tabular-nums">{last7DaysUnits} articles</span> ·{' '}
              <span className="font-mono text-slate-300 tabular-nums">{last7DaysTickets} tickets</span>
            </p>
          </div>

          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setChartMetric('revenue')}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                chartMetric === 'revenue'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Chiffre d'affaires
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('units')}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                chartMetric === 'units'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Articles & Tickets
            </button>
          </div>
        </div>

        <div ref={chartContainerRef} className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dailySalesData}
              margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={chartMetric === 'revenue' ? 78 : 42}
                tickFormatter={(val: number) =>
                  chartMetric === 'revenue'
                    ? val >= 1000
                      ? `${Math.round(val / 1000)}k`
                      : `${val}`
                    : `${val}`
                }
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const point = payload[0].payload;
                  return (
                    <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 shadow-xl text-xs space-y-1">
                      <div className="font-semibold text-white capitalize">{point.fullDate}</div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400">Chiffre d'affaires :</span>
                        <span className="font-mono font-bold text-emerald-400 tabular-nums">
                          {formatMoney(point.revenue)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400">Articles vendus :</span>
                        <span className="font-mono font-semibold text-cyan-400 tabular-nums">
                          {point.units} unités
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400">Transactions :</span>
                        <span className="font-mono text-slate-200 tabular-nums">
                          {point.tickets} ticket(s)
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              {chartMetric === 'revenue' ? (
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Chiffre d'affaires"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#34d399', stroke: '#0f172a', strokeWidth: 2 }}
                />
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="units"
                    name="Articles vendus"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#06b6d4', stroke: '#0f172a', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#22d3ee', stroke: '#0f172a', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="tickets"
                    name="Tickets"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: '#a855f7', stroke: '#0f172a', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: '#c084fc', stroke: '#0f172a', strokeWidth: 2 }}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Middle Row: Payment Channels & Multi-Boutique Benchmark */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Payment Channels Breakdown */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              Répartition des Modes de Paiement
            </span>
            <span className="text-xs font-mono text-slate-400">{formatMoney(totalRevenue)}</span>
          </div>

          <div className="space-y-3 pt-1">
            {[
              { key: 'ESPECES', label: 'Espèces (Cash en Caisse)', color: 'bg-emerald-500', textCol: 'text-emerald-400' },
              { key: 'WAVE', label: 'Wave Sénégal (Mobile Money)', color: 'bg-cyan-500', textCol: 'text-cyan-400' },
              { key: 'ORANGE_MONEY', label: 'Orange Money & MoMo', color: 'bg-orange-500', textCol: 'text-orange-400' },
              { key: 'CARTE_BANCAIRE', label: 'Cartes Bancaires (TPE)', color: 'bg-purple-500', textCol: 'text-purple-400' },
              { key: 'CREDIT_CLIENT', label: 'Ventes à Crédit (Compte Client)', color: 'bg-amber-500', textCol: 'text-amber-400' },
            ].map((method) => {
              const amount = paymentMethodTotals[method.key] || 0;
              const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;

              return (
                <div key={method.key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{method.label}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className={`font-bold tabular-nums ${method.textCol}`}>
                        {formatMoney(amount)}
                      </span>
                      <span className="text-slate-500 text-[11px] w-10 text-right">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${method.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Multi-boutique Benchmark Grid */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Store className="w-4 h-4 text-emerald-400" />
              Benchmark Multi-Boutiques (Comparatif des Sites)
            </span>
            <span className="text-[11px] text-slate-400">Performances globales</span>
          </div>

          <div className="space-y-3">
            {boutiquePerformance.map((bp) => {
              const shareOfTotal = totalRevenue > 0 ? (bp.ca / totalRevenue) * 100 : 0;

              return (
                <div
                  key={bp.id}
                  className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-white">{bp.name}</span>
                      <span className="text-[11px] text-slate-400 ml-2">({bp.city}) {bp.isDepot ? '· Entrepôt Central' : ''}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-emerald-400 tabular-nums">
                        {formatMoney(bp.ca)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {shareOfTotal.toFixed(1)}% du CA réseau
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-xs font-mono text-slate-300 border-t border-slate-700/40 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Marge Brute</span>
                      <span className="font-bold text-cyan-400">{formatMoney(bp.margin)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Taux Marge</span>
                      <span className="font-semibold text-white">{bp.marginRate.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Panier Moyen</span>
                      <span className="font-semibold text-purple-400">{formatMoney(bp.averageBasket)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Pareto 80/20 Analysis & Sleeping Products Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Pareto Top 20% Table */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-400" />
                Matrice Pareto (Top 20% des Produits Générant 80% du CA)
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Références stratégiques à réapprovisionner en priorité pour éviter les ruptures coûteuses.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                  <th className="py-2.5 px-3">Produit & Réf</th>
                  <th className="py-2.5 px-3 text-center">Quantité Vendue</th>
                  <th className="py-2.5 px-3 text-right">CA Généré</th>
                  <th className="py-2.5 px-3 text-right">Marge Brute</th>
                  <th className="py-2.5 px-3 text-right">Part Cumulée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {paretoProducts.slice(0, 7).map((prod) => (
                  <tr key={prod.sku} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3">
                      <div className="font-semibold text-white">{prod.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{prod.sku}</div>
                    </td>
                    <td className="py-2 px-3 text-center font-mono tabular-nums text-slate-200">
                      {prod.quantitySold} unités
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400 tabular-nums">
                      {formatMoney(prod.revenue)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-cyan-400 tabular-nums">
                      {formatMoney(prod.grossMargin)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                        prod.isTopPareto
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20'
                          : 'text-slate-400'
                      }`}>
                        {prod.cumulativeShare.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inactive / Dormant Stock Warning */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              Produits Dormants (Zéro Vente)
            </span>
            <span className="text-xs font-mono text-amber-400 font-bold">
              {dormantProducts.length} références
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Ces références n'ont enregistré aucune vente sur la période sélectionnée. Envisager des promotions, remises ou transferts vers d'autres points de vente.
          </p>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {dormantProducts.map((dp) => {
              const currentStock = getProductStockInBoutique(dp.id, selectedBoutiqueId);
              return (
                <div
                  key={dp.id}
                  className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-200 line-clamp-1">{dp.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">{dp.category.split(' & ')[0]}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-bold text-slate-300">
                      {currentStock} en stock
                    </span>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {formatMoney(currentStock * dp.purchasePrice)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
