import React, { useState } from 'react';
import { Sale } from '../../types';
import { useApp } from '../../context/AppContext';
import { Printer, Share2, X, Check, Copy } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const { formatMoney, boutiques, organization } = useApp();
  const [ticketWidth, setTicketWidth] = useState<'80mm' | '58mm'>('80mm');
  const [copied, setCopied] = useState(false);

  const boutique = boutiques.find((b) => b.id === sale.boutiqueId);

  const handlePrint = () => {
    window.print();
  };

  const isRefundTicket = sale.total < 0;
  const hasReturnItems = sale.items.some((i) => i.quantity < 0);

  const getWhatsAppShareText = () => {
    let text = `*${organization.tradeName.toUpperCase()} - ${isRefundTicket ? "TICKET D'AVOIR / RETOUR" : 'TICKET DE CAISSE'}*\n`;
    text += `Boutique: ${boutique?.name || 'Magasin'}\n`;
    text += `Ticket N°: ${sale.ticketNumber}\n`;
    text += `Date: ${new Date(sale.date).toLocaleString('fr-FR')}\n`;
    text += `Caissier: ${sale.sellerName}\n`;
    text += `--------------------------------\n`;
    sale.items.forEach((item) => {
      text += `${item.quantity}x ${item.productName} = ${formatMoney(item.total)}\n`;
    });
    text += `--------------------------------\n`;
    text += `*${isRefundTicket ? 'NET A REMBOURSER' : 'TOTAL A PAYER'}: ${formatMoney(sale.total)}*\n`;
    text += `Paiement: ${sale.payments.map((p) => `${p.method}: ${formatMoney(p.amount)}`).join(', ')}\n`;
    if (sale.changeReturned > 0) {
      text += `Monnaie Rendue: ${formatMoney(sale.changeReturned)}\n`;
    }
    text += `\nMerci de votre visite et à très bientôt !`;
    return encodeURIComponent(text);
  };

  const handleShareWhatsApp = () => {
    const phone = sale.customerId ? '221' : '';
    const url = `https://wa.me/${phone}?text=${getWhatsAppShareText()}`;
    window.open(url, '_blank');
  };

  const handleCopyText = () => {
    const rawText = decodeURIComponent(getWhatsAppShareText());
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header Controls */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">Ticket N° {sale.ticketNumber}</span>
            <div className="flex items-center bg-slate-800 rounded p-0.5 text-xs font-mono">
              <button
                onClick={() => setTicketWidth('80mm')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  ticketWidth === '80mm' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                80mm
              </button>
              <button
                onClick={() => setTicketWidth('58mm')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  ticketWidth === '58mm' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                58mm
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Paper Simulation */}
        <div className="p-6 overflow-y-auto flex-1 flex justify-center bg-slate-950/50">
          <div
            id="printable-receipt"
            style={{ width: ticketWidth === '80mm' ? '320px' : '260px' }}
            className="bg-white text-slate-900 p-5 rounded-sm shadow-md font-mono text-[11px] leading-tight select-text"
          >
            {/* Header info */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                {organization.tradeName}
              </h2>
              <div className="text-[10px] text-slate-600 mt-0.5">
                {boutique?.name || organization.name}
              </div>
              <div className="text-[9px] text-slate-500">{boutique?.address || organization.address}</div>
              <div className="text-[9px] text-slate-500">Tél: {boutique?.phone || organization.phone}</div>
              <div className="text-[9px] text-slate-500">NINEA: {organization.taxId} · RC: {organization.tradeRegister}</div>
              {(isRefundTicket || hasReturnItems) && (
                <div className="mt-1.5 inline-block border border-slate-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-900">
                  {isRefundTicket ? "TICKET D'AVOIR / RETOUR PRODUIT" : 'VENTE / ÉCHANGE AVEC RETOUR'}
                </div>
              )}
            </div>

            {/* Ticket Metadata */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[10px] space-y-0.5 text-slate-700">
              <div className="flex justify-between">
                <span>TICKET N°:</span>
                <span className="font-bold">{sale.ticketNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>{new Date(sale.date).toLocaleDateString('fr-FR')} {new Date(sale.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>CAISSIER(E):</span>
                <span>{sale.sellerName}</span>
              </div>
              {sale.customerName && (
                <div className="flex justify-between">
                  <span>CLIENT:</span>
                  <span className="font-semibold truncate max-w-[150px]">{sale.customerName}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-slate-200">
                <span>ARTICLE</span>
                <span className="text-right">TOTAL</span>
              </div>
              <div className="space-y-1.5 pt-1.5">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between font-medium">
                      <span className="truncate pr-1">{item.productName}</span>
                      <span className="tabular-nums text-right">{formatMoney(item.total)}</span>
                    </div>
                    <div className="text-[9px] text-slate-500 flex justify-between">
                      <span>{item.quantity} x {formatMoney(item.unitPrice)}</span>
                      {item.discountPercent > 0 && (
                        <span className="text-rose-600 font-bold">-{item.discountPercent}%</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[10px]">
              <div className="flex justify-between text-slate-600">
                <span>Sous-total:</span>
                <span className="tabular-nums">{formatMoney(sale.subtotal)}</span>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Remise accordée:</span>
                  <span className="tabular-nums">-{formatMoney(sale.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Dont TVA (18% / 0%):</span>
                <span className="tabular-nums">{formatMoney(sale.vatAmount)}</span>
              </div>
              <div className="flex justify-between text-xs font-black pt-1 border-t border-slate-300 text-slate-900">
                <span>{isRefundTicket ? 'NET A REMBOURSER:' : 'NET A PAYER:'}</span>
                <span className="tabular-nums">{formatMoney(sale.total)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-0.5">
              {sale.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between text-slate-700">
                  <span className="font-semibold uppercase">{p.method.replace('_', ' ')}:</span>
                  <span className="tabular-nums font-bold">{formatMoney(p.amount)}</span>
                </div>
              ))}
              {sale.payments.some((p) => p.reference) && (
                <div className="text-[9px] text-slate-500 pt-0.5">
                  Réf transaction: {sale.payments.map((p) => p.reference).filter(Boolean).join(', ')}
                </div>
              )}
              {sale.changeReturned > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold pt-1">
                  <span>MONNAIE RENDUE:</span>
                  <span className="tabular-nums">{formatMoney(sale.changeReturned)}</span>
                </div>
              )}
            </div>

            {/* Barcode & Footer note */}
            <div className="pt-3 text-center space-y-2">
              <div className="flex justify-center py-1">
                {/* Visual barcode lines */}
                <div className="flex items-center gap-[2px] h-9">
                  {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 3, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 2, 4, 1, 2].map(
                    (w, idx) => (
                      <div
                        key={idx}
                        className="bg-black h-full"
                        style={{ width: `${w}px` }}
                      />
                    )
                  )}
                </div>
              </div>
              <div className="text-[9px] tracking-widest text-slate-600">{sale.ticketNumber}</div>
              <div className="text-[9px] text-slate-500 italic">
                {organization.receiptFooter}
              </div>
              <div className="text-[9px] font-bold text-slate-700">
                MERCI DE VOTRE CONFIANCE !
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-900">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copié !' : 'Copier texte'}</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/30 rounded-lg transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors font-semibold"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer Ticket</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
