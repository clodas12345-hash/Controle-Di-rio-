import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, RefreshCw, Plus, ShieldCheck, X } from 'lucide-react';

export interface CellConflict {
  fieldKey: string;
  fieldLabel: string;
  category: '99' | 'uber' | 'veiculo' | 'alimentacao' | 'despesas' | 'geral';
  currentValue: number | string;
  newValue: number | string;
  formattedCurrent: string;
  formattedNew: string;
  selectedAction: 'replace' | 'sum' | 'keep';
}

export interface ConflictData {
  targetDate: string;
  formattedDate: string;
  conflicts: CellConflict[];
  rawExtractedData: any;
}

interface ConflictResolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflictData: ConflictData | null;
  onConfirmResolution: (resolvedData: any, targetDate: string) => void;
}

export const ConflictResolverModal: React.FC<ConflictResolverModalProps> = ({
  isOpen,
  onClose,
  conflictData,
  onConfirmResolution,
}) => {
  const [conflicts, setConflicts] = useState<CellConflict[]>(conflictData?.conflicts || []);

  useEffect(() => {
    if (conflictData?.conflicts) {
      setConflicts(conflictData.conflicts);
    }
  }, [conflictData]);

  if (!isOpen || !conflictData) return null;

  const handleActionChange = (fieldKey: string, action: 'replace' | 'sum' | 'keep') => {
    setConflicts(prev =>
      prev.map(c => (c.fieldKey === fieldKey ? { ...c, selectedAction: action } : c))
    );
  };

  const handleSetAll = (action: 'replace' | 'sum' | 'keep') => {
    setConflicts(prev => prev.map(c => ({ ...c, selectedAction: action })));
  };

  const handleApply = () => {
    const raw = { ...conflictData.rawExtractedData };

    // Apply resolved choices
    conflicts.forEach(c => {
      const curNum = typeof c.currentValue === 'number' ? c.currentValue : parseFloat(c.currentValue as string) || 0;
      const newNum = typeof c.newValue === 'number' ? c.newValue : parseFloat(c.newValue as string) || 0;

      if (c.selectedAction === 'replace') {
        raw[c.fieldKey] = c.newValue;
      } else if (c.selectedAction === 'sum') {
        raw[c.fieldKey] = Number((curNum + newNum).toFixed(2));
      } else if (c.selectedAction === 'keep') {
        raw[c.fieldKey] = c.currentValue;
      }
    });

    onConfirmResolution(raw, conflictData.targetDate);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0e121a] border border-amber-500/50 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-amber-950/40 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-xl">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Aviso: Células com Dados Duplicados
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                  {conflicts.length} {conflicts.length === 1 ? 'campo' : 'campos'}
                </span>
              </h3>
              <p className="text-xs text-amber-300/80">
                O dia <span className="font-bold text-amber-200">{conflictData.formattedDate}</span> já possui valores registrados para estas células.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Batch Action Buttons */}
        <div className="px-4 sm:px-5 py-2.5 bg-zinc-950/70 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-zinc-400 font-medium">Ações em massa para todas as células:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSetAll('replace')}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 rounded-lg font-bold transition-all text-[11px] flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Substituir Todos
            </button>
            <button
              type="button"
              onClick={() => handleSetAll('sum')}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-amber-950/60 border border-amber-500/40 text-amber-400 rounded-lg font-bold transition-all text-[11px] flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Somar Todos
            </button>
            <button
              type="button"
              onClick={() => handleSetAll('keep')}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg font-bold transition-all text-[11px] flex items-center gap-1"
            >
              <ShieldCheck className="w-3 h-3" />
              Manter Atual
            </button>
          </div>
        </div>

        {/* Conflicts List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
          {conflicts.map(c => (
            <div
              key={c.fieldKey}
              className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 sm:p-4 space-y-3 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    c.category === '99' ? 'bg-amber-400' :
                    c.category === 'uber' ? 'bg-zinc-100' :
                    c.category === 'veiculo' ? 'bg-emerald-400' : 'bg-indigo-400'
                  }`} />
                  {c.fieldLabel}
                </span>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-400">Atual: <strong className="text-zinc-200">{c.formattedCurrent}</strong></span>
                  <span className="text-zinc-600">➔</span>
                  <span className="text-amber-400 font-bold">Novo: {c.formattedNew}</span>
                </div>
              </div>

              {/* Action Buttons for this specific cell */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleActionChange(c.fieldKey, 'replace')}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                    c.selectedAction === 'replace'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Substituir</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleActionChange(c.fieldKey, 'sum')}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                    c.selectedAction === 'sum'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Somar</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleActionChange(c.fieldKey, 'keep')}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                    c.selectedAction === 'keep'
                      ? 'bg-zinc-800 border-zinc-600 text-zinc-200 shadow-sm'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Manter Atual</span>
                </button>
              </div>

              {/* Preview of outcome */}
              <div className="text-[11px] text-zinc-400 bg-zinc-950/50 p-2 rounded-lg flex items-center justify-between">
                <span>Resultado final para esta célula:</span>
                <span className="font-bold text-zinc-200">
                  {c.selectedAction === 'replace' && `${c.formattedNew} (Substituído)`}
                  {c.selectedAction === 'sum' && (
                    typeof c.currentValue === 'number' && typeof c.newValue === 'number'
                      ? `R$ ${(c.currentValue + c.newValue).toFixed(2)} (Soma)`
                      : `${Number(c.currentValue) + Number(c.newValue)} (Soma)`
                  )}
                  {c.selectedAction === 'keep' && `${c.formattedCurrent} (Mantido original)`}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold rounded-xl text-xs transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-zinc-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Confirmar e Aplicar aos Lançamentos</span>
          </button>
        </div>

      </div>
    </div>
  );
};
