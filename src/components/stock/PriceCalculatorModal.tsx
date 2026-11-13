import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { X, Calculator, Check, ArrowRight } from 'lucide-react';

interface PriceCalculatorModalProps {
  initialProduct?: Product | null;
  onClose: () => void;
}

type MarginMode = 'ON_SELLING' | 'ON_COST';
type RoundStep = 1 | 25 | 50 | 100;

export const PriceCalculatorModal: React.FC<PriceCalculatorModalProps> = ({
  initialProduct,
  onClose,
}) => {
  const { products, updateProduct, formatMoney } = useApp();

  const [selectedProductId, setSelectedProductId] = useState<string>(initialProduct?.id || '');
  const [purchasePrice, setPurchasePrice] = useState<number>(initialProduct?.purchasePrice ?? 1000);
  const [targetMarginPct, setTargetMarginPct] = useState<number>(() => {
    if (initialProduct && initialProduct.sellingPrice > 0 && initialProduct.purchasePrice > 0) {
      const currentMargin =
        ((initialProduct.sellingPrice - initialProduct.purchasePrice) / initialProduct.sellingPrice) * 100;
      return Math.max(0, Math.min(90, Math.round(currentMargin * 10) / 10));
    }
    return 30;
  });
  const [marginMode, setMarginMode] = useState<MarginMode>('ON_SELLING');
  const [roundStep, setRoundStep] = useState<RoundStep>(1);
  const [appliedMessage, setAppliedMessage] = useState('');

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    setAppliedMessage('');
    const found = products.find((p) => p.id === prodId);
    if (found) {
      setPurchasePrice(found.purchasePrice);
      if (found.sellingPrice > 0 && found.purchasePrice > 0) {
        const curMargin =
          marginMode === 'ON_SELLING'
            ? ((found.sellingPrice - found.purchasePrice) / found.sellingPrice) * 100
            : ((found.sellingPrice - found.purchasePrice) / found.purchasePrice) * 100;
        setTargetMarginPct(Math.max(0, Math.round(curMargin * 10) / 10));
      }
    }
  };

  const calculation = useMemo(() => {
    const cost = Math.max(0, Number(purchasePrice) || 0);
    const pct = Math.max(0, Number(targetMarginPct) || 0);

    let rawPrice = cost;
    let isInvalidRate = false;

    if (marginMode === 'ON_SELLING') {
      if (pct >= 99) {
        isInvalidRate = true;
        rawPrice = cost * 100;
      } else {
        rawPrice = cost / (1 - pct / 100);
      }
    } else {
      rawPrice = cost * (1 + pct / 100);
    }

    const recommendedPrice =
      roundStep === 1 ? Math.round(rawPrice) : Math.round(rawPrice / roundStep) * roundStep;

    const unitProfit = recommendedPrice - cost;
    const realMarginOnSelling = recommendedPrice > 0 ? (unitProfit / recommendedPrice) * 100 : 0;
    const realMarkupOnCost = cost > 0 ? (unitProfit / cost) * 100 : 0;
    const multiplier = cost > 0 ? recommendedPrice / cost : 0;

    return {
      cost,
      recommendedPrice,
      unitProfit,
      realMarginOnSelling,
      realMarkupOnCost,
      multiplier,
      isInvalidRate,
    };
  }, [purchasePrice, targetMarginPct, marginMode, roundStep]);

  const handleApplyToProduct = () => {
    if (!selectedProduct || calculation.isInvalidRate) return;
    updateProduct({
      ...selectedProduct,
      purchasePrice: calculation.cost,
      sellingPrice: calculation.recommendedPrice,
    });
    setAppliedMessage(
      `Prix de vente mis à jour pour "${selectedProduct.name}" : ${formatMoney(calculation.recommendedPrice)}.`
    );
  };

  const presetMargins = [15, 20, 25, 30, 35, 40, 50];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Calculateur de Prix de Vente</h2>
              <p className="text-xs text-slate-400">
                Déterminez le prix de vente conseillé selon le prix d'achat et la marge cible
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

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Optional Product Link */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Produit du catalogue (optionnel pour appliquer directement) :
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleSelectProduct(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Simulation libre (sans lier de produit) --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · Achat: {formatMoney(p.purchasePrice)} · Vente actuelle: {formatMoney(p.sellingPrice)}
                </option>
              ))}
            </select>
          </div>

          {/* Calculation Mode Toggle */}
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-slate-300">
              Méthode de calcul de la marge :
            </span>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setMarginMode('ON_SELLING')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  marginMode === 'ON_SELLING'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Marge sur prix de vente (%)
              </button>
              <button
                type="button"
                onClick={() => setMarginMode('ON_COST')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  marginMode === 'ON_COST'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Majoration sur prix d'achat (%)
              </button>
            </div>
          </div>

          {/* Inputs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Prix d'achat (HT / Coût) :
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={purchasePrice}
                onChange={(e) => {
                  setPurchasePrice(Math.max(0, Number(e.target.value) || 0));
                  setAppliedMessage('');
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-mono font-bold tabular-nums text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Marge cible (%) :
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max={marginMode === 'ON_SELLING' ? 98.9 : 500}
                  step="0.5"
                  value={targetMarginPct}
                  onChange={(e) => {
                    setTargetMarginPct(Math.max(0, Number(e.target.value) || 0));
                    setAppliedMessage('');
                  }}
                  className="w-full pl-3 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-mono font-bold tabular-nums text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Margin Presets + Rounding Step */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 mr-1">Cibles :</span>
              {presetMargins.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setTargetMarginPct(pct);
                    setAppliedMessage('');
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-mono tabular-nums transition-colors whitespace-nowrap ${
                    targetMarginPct === pct
                      ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold'
                      : 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Arrondi :</span>
              {([1, 25, 50, 100] as RoundStep[]).map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setRoundStep(step)}
                  className={`px-2 py-1 rounded text-[11px] font-mono tabular-nums transition-colors whitespace-nowrap ${
                    roundStep === step
                      ? 'bg-slate-700 text-white font-bold'
                      : 'bg-slate-800/70 text-slate-400 hover:text-white'
                  }`}
                >
                  {step === 1 ? 'Exact' : step}
                </button>
              ))}
            </div>
          </div>

          {calculation.isInvalidRate && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg text-xs text-rose-300">
              En mode « Marge sur prix de vente », le pourcentage cible doit être strictement inférieur à 99 %.
            </div>
          )}

          {/* Result Panel */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-baseline justify-between gap-4 pb-3 border-b border-slate-800">
              <div>
                <div className="text-xs text-slate-400">Prix de vente conseillé</div>
                {selectedProduct && (
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-mono tabular-nums">
                    <span>Actuel : {formatMoney(selectedProduct.sellingPrice)}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="text-emerald-400 font-semibold">
                      {formatMoney(calculation.recommendedPrice)}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-2xl font-extrabold font-mono text-emerald-400 tabular-nums">
                {formatMoney(calculation.recommendedPrice)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-[11px] text-slate-400">Bénéfice unitaire</div>
                <div className="font-mono font-bold text-white tabular-nums mt-0.5">
                  {formatMoney(calculation.unitProfit)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Taux de marge (PV)</div>
                <div className="font-mono font-bold text-slate-200 tabular-nums mt-0.5">
                  {calculation.realMarginOnSelling.toFixed(1)} %
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Coefficient</div>
                <div className="font-mono font-bold text-slate-200 tabular-nums mt-0.5">
                  × {calculation.multiplier.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {appliedMessage && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg flex items-center gap-2 text-xs text-emerald-300">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{appliedMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Fermer
          </button>
          {selectedProduct && (
            <button
              type="button"
              onClick={handleApplyToProduct}
              disabled={calculation.isInvalidRate}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Check className="w-4 h-4" />
              <span>Appliquer au produit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
