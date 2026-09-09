import React, { useState, useMemo } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Calendar, 
  CalendarDays, 
  CalendarRange, 
  Layers, 
  Download, 
  Copy, 
  Check, 
  ArrowLeft, 
  Share2, 
  FileCode,
  AlertCircle,
  MessageCircle
} from 'lucide-react';
import { GkdMobilityLogo } from './GkdMobilityLogo';

export type BackupScope = 'all' | 'day' | 'week' | 'month' | 'custom';
export type BackupFormat = 'excel' | 'json';

export interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  logs: any[];
  carProfile: any;
  fixedExpensesByMonth: Record<string, any[]>;
}

const WEEK_DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function BackupModal({
  isOpen,
  onClose,
  onBack,
  logs,
  carProfile,
  fixedExpensesByMonth
}: BackupModalProps) {
  const [scope, setScope] = useState<BackupScope>('all');
  const [format, setFormat] = useState<BackupFormat>('excel');
  const [selectedDay, setSelectedDay] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [customStart, setCustomStart] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [customEnd, setCustomEnd] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const getWeekRange = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().slice(0, 10),
      end: sunday.toISOString().slice(0, 10)
    };
  };

  const getRangeLabel = () => {
    if (scope === 'all') return `Todo o histórico (${logs.length} dias cadastrados)`;
    if (scope === 'day') {
      const parts = selectedDay.split('-');
      return `Apenas o dia ${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    if (scope === 'week') {
      const { start, end } = getWeekRange(selectedDay);
      const s = start.split('-').reverse().join('/');
      const e = end.split('-').reverse().join('/');
      return `Semana de ${s} até ${e}`;
    }
    if (scope === 'month') {
      const [y, m] = selectedMonth.split('-');
      return `Mês completo de ${m}/${y}`;
    }
    if (scope === 'custom') {
      const s = customStart.split('-').reverse().join('/');
      const e = customEnd.split('-').reverse().join('/');
      return `Período personalizado de ${s} até ${e}`;
    }
    return '';
  };

  const filteredLogs = useMemo(() => {
    if (!logs || logs.length === 0) return [];
    switch (scope) {
      case 'all':
        return [...logs].sort((a, b) => a.date.localeCompare(b.date));
      case 'day':
        return logs.filter(l => l.date === selectedDay);
      case 'week': {
        const { start, end } = getWeekRange(selectedDay);
        return logs.filter(l => l.date >= start && l.date <= end).sort((a, b) => a.date.localeCompare(b.date));
      }
      case 'month':
        return logs.filter(l => l.date.startsWith(selectedMonth)).sort((a, b) => a.date.localeCompare(b.date));
      case 'custom':
        if (!customStart || !customEnd) return [];
        return logs.filter(l => l.date >= customStart && l.date <= customEnd).sort((a, b) => a.date.localeCompare(b.date));
      default:
        return logs;
    }
  }, [logs, scope, selectedDay, selectedMonth, customStart, customEnd]);

  if (!isOpen) return null;

  const generateJsonData = () => {
    const backupPayload = {
      app: "Controle Diário",
      versaoBackup: "3.0",
      dataExportacao: new Date().toISOString(),
      escopoExportacao: {
        tipo: scope,
        diaSelecionado: scope === 'day' ? selectedDay : undefined,
        mesSelecionado: scope === 'month' ? selectedMonth : undefined,
        semanaSelecionada: scope === 'week' ? getWeekRange(selectedDay) : undefined,
        periodoPersonalizado: scope === 'custom' ? { de: customStart, ate: customEnd } : undefined
      },
      dadosDoVeiculo: {
        modelo: carProfile?.modelName || "",
        placa: carProfile?.licensePlate || "",
        tipoVeiculo: carProfile?.vehicleType || "eletrico",
        anoFabricacao: carProfile?.manufactureYear || "",
        cor: carProfile?.color || "",
        tipoPropriedade: carProfile?.ownershipType || "alugado",
        kmAtualOdometro: carProfile?.currentKm || 0,
        capacidadeBateriaOuTanque: carProfile?.batteryCapacityKwh || 0,
        autonomiaEstimadaKm: carProfile?.estimatedAutonomyKm || 0,
        valorPagoPelaEnergiaOuCombustivel: carProfile?.kwhCostRate || 0,
        valorAluguelSemanal: carProfile?.rentalOrWeeklyRate || 0,
        despesaMensalCarroEstimada: carProfile?.monthlyCarExpense || 0,
        escalaTrabalho: carProfile?.workScheduleType || "mon_to_sat_sundays_off",
        diasTrabalhoPersonalizados: carProfile?.customWorkDays || {},
        seguradora: carProfile?.insurerName || "",
        apoliceSeguro: carProfile?.insurancePolicyNumber || "",
        proximaManutencaoKm: carProfile?.nextMaintenanceKm || "",
        observacoesNotas: carProfile?.notes || ""
      },
      despesasFixasPorMes: fixedExpensesByMonth || {},
      lancamentosDiarios: filteredLogs.map(log => ({
        id: log.id,
        data: log.date,
        diaSemana: WEEK_DAYS[new Date(log.date + 'T12:00:00').getDay()],
        ehFolga: Boolean(log.isDayOff),
        kmRodado: log.kmRodado || 0,
        bateriaRestantePct: log.sobrouBateria || 0,
        valorKwhUtilizadoNoDia: log.valorKwh || carProfile?.kwhCostRate || 0,
        capacidadeBateriaKwh: log.capacidadeBateria || carProfile?.batteryCapacityKwh || 0,
        custoEnergiaTotal: log.custoEnergia || 0,
        diariaCarro: log.diariaCarro || 0,
        despesasCarro: {
          lavaJato: log.carExpenses?.wash || 0,
          pedagio: log.carExpenses?.toll || 0,
          estacionamento: log.carExpenses?.parking || 0,
          recargaExterna: log.carExpenses?.publicCharging || 0,
          manutencao: log.carExpenses?.maintenance || 0,
          outros: log.carExpenses?.other || 0,
          totalDespesasCarro: (log.carExpenses?.wash || 0) + (log.carExpenses?.toll || 0) + (log.carExpenses?.parking || 0) + (log.carExpenses?.publicCharging || 0) + (log.carExpenses?.maintenance || 0) + (log.carExpenses?.other || 0)
        },
        despesasAlimentacao: {
          almoco: log.foodExpenses?.lunch || 0,
          jantar: log.foodExpenses?.dinner || 0,
          lanches: log.foodExpenses?.snacks || 0,
          cafe: log.foodExpenses?.coffee || 0,
          totalDespesasAlimentacao: (log.foodExpenses?.lunch || 0) + (log.foodExpenses?.dinner || 0) + (log.foodExpenses?.snacks || 0) + (log.foodExpenses?.coffee || 0)
        },
        ganhos99: {
          corridas: log.app99?.rides || 0,
          faturamento: log.app99?.earnings || 0,
          bonus: log.app99?.bonus || 0,
          total: (log.app99?.earnings || 0) + (log.app99?.bonus || 0)
        },
        ganhosUber: {
          corridas: log.appUber?.rides || 0,
          faturamento: log.appUber?.earnings || 0,
          bonus: log.appUber?.bonus || 0,
          total: (log.appUber?.earnings || 0) + (log.appUber?.bonus || 0)
        },
        ganhosParticular: {
          corridas: log.appParticular?.rides || 0,
          faturamento: log.appParticular?.earnings || 0
        },
        recompensasExtra: log.recompensasExtra || 0,
        outrasFontes: log.outrasFontes || 0,
        faturamentoBrutoDia: ((log.appUber?.earnings || 0) + (log.appUber?.bonus || 0) + (log.app99?.earnings || 0) + (log.app99?.bonus || 0) + (log.appParticular?.earnings || 0) + (log.recompensasExtra || 0) + (log.outrasFontes || 0)),
        totalCustosDia: ((log.custoEnergia || 0) + (log.diariaCarro || 0) + ((log.carExpenses?.wash || 0) + (log.carExpenses?.toll || 0) + (log.carExpenses?.parking || 0) + (log.carExpenses?.publicCharging || 0) + (log.carExpenses?.maintenance || 0) + (log.carExpenses?.other || 0)) + ((log.foodExpenses?.lunch || 0) + (log.foodExpenses?.dinner || 0) + (log.foodExpenses?.snacks || 0) + (log.foodExpenses?.coffee || 0))),
        resultadoLiquidoDia: ((log.appUber?.earnings || 0) + (log.appUber?.bonus || 0) + (log.app99?.earnings || 0) + (log.app99?.bonus || 0) + (log.appParticular?.earnings || 0) + (log.recompensasExtra || 0) + (log.outrasFontes || 0)) - ((log.custoEnergia || 0) + (log.diariaCarro || 0) + ((log.carExpenses?.wash || 0) + (log.carExpenses?.toll || 0) + (log.carExpenses?.parking || 0) + (log.carExpenses?.publicCharging || 0) + (log.carExpenses?.maintenance || 0) + (log.carExpenses?.other || 0)) + ((log.foodExpenses?.lunch || 0) + (log.foodExpenses?.dinner || 0) + (log.foodExpenses?.snacks || 0) + (log.foodExpenses?.coffee || 0)))
      }))
    };
    return JSON.stringify(backupPayload, null, 2);
  };

  const generateCsvData = () => {
    const isEletrico = carProfile?.vehicleType === 'eletrico';
    const carProfileData = [
      ["CONTROLE DIÁRIO - BACKUP COMPLETO DO SISTEMA", "", "", ""],
      ["Data de Geração", new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR'), "", ""],
      ["Período Selecionado", getRangeLabel(), "", ""],
      ["", "", "", ""],
      ["DADOS DO VEÍCULO E ENERGIA", "", "", ""],
      ["Modelo do Veículo", carProfile?.modelName || "-"],
      ["Placa", carProfile?.licensePlate || "-"],
      ["Tipo de Propulsão", isEletrico ? '100% Elétrico (EV)' : 'Combustão / Híbrido'],
      ["KM Atual (ODO)", carProfile?.currentKm || 0],
      ["Valor da Energia / Combustível", `R$ ${(carProfile?.kwhCostRate || 0).toFixed(2)} por ${isEletrico ? 'kWh' : 'Litro'}`],
      ["", "", "", ""]
    ];

    const headers = [
      "Data", "Dia da Semana", "Status", "KM Rodados", "Bateria Restante (%)",
      isEletrico ? "Valor p/ kWh (R$)" : "Valor Litro (R$)",
      isEletrico ? "Custo Energia (R$)" : "Custo Combustível (R$)",
      "Diária do Carro (R$)", "Total Despesas Carro (R$)", "Total Despesas Alimentação (R$)",
      "Qtd Corridas 99", "Total 99 (R$)", "Qtd Corridas Uber", "Total Uber (R$)",
      "Qtd Corridas Particular", "Total Particular (R$)", "Recompensas Extras (R$)",
      "Outras Fontes (R$)", "Faturamento Bruto Total (R$)", "Total Geral de Despesas (R$)",
      "Resultado Líquido do Dia (R$)"
    ];

    const rows = filteredLogs.map(log => {
      const uTotal = (log.appUber?.earnings || 0) + (log.appUber?.bonus || 0);
      const nTotal = (log.app99?.earnings || 0) + (log.app99?.bonus || 0);
      const pTotal = log.appParticular?.earnings || 0;
      const pRides = log.appParticular?.rides || 0;
      const recomp = log.recompensasExtra || 0;
      const outras = log.outrasFontes || 0;
      const gross = uTotal + nTotal + pTotal + recomp + outras;

      const totalCarExpenses = (log.carExpenses?.wash || 0) + (log.carExpenses?.toll || 0) + (log.carExpenses?.parking || 0) + (log.carExpenses?.publicCharging || 0) + (log.carExpenses?.maintenance || 0) + (log.carExpenses?.other || 0);
      const totalFoodExpenses = (log.foodExpenses?.lunch || 0) + (log.foodExpenses?.dinner || 0) + (log.foodExpenses?.snacks || 0) + (log.foodExpenses?.coffee || 0);
      const energyCost = log.custoEnergia || 0;
      const dailyRate = log.diariaCarro || 0;
      const totalDayExpenses = energyCost + dailyRate + totalCarExpenses + totalFoodExpenses;
      const net = gross - totalDayExpenses;

      const isOff = Boolean(log.isDayOff);
      const workedOnOffDay = isOff && (gross > 0 || (log.kmRodado || 0) > 0);
      const statusText = workedOnOffDay ? "Folga Trabalhada" : isOff ? "Folga" : "Trabalhado";
      const dayOfWeek = WEEK_DAYS[new Date(log.date + 'T12:00:00').getDay()];

      return [
        log.date.split('-').reverse().join('/'),
        dayOfWeek,
        statusText,
        log.kmRodado || 0,
        log.sobrouBateria || 0,
        (log.valorKwh || carProfile?.kwhCostRate || 0).toFixed(2),
        energyCost.toFixed(2),
        dailyRate.toFixed(2),
        totalCarExpenses.toFixed(2),
        totalFoodExpenses.toFixed(2),
        log.app99?.rides || 0,
        nTotal.toFixed(2),
        log.appUber?.rides || 0,
        uTotal.toFixed(2),
        pTotal > 0 ? pRides : 0,
        pTotal.toFixed(2),
        recomp.toFixed(2),
        outras.toFixed(2),
        gross.toFixed(2),
        totalDayExpenses.toFixed(2),
        net.toFixed(2)
      ];
    });

    return "\uFEFF" + [
      ...carProfileData.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";")),
      headers.join(";"),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    ].join("\n");
  };

  const getPreparedContent = () => {
    if (format === 'json') {
      return { content: generateJsonData(), type: 'application/json', extension: 'json' };
    }
    return { content: generateCsvData(), type: 'text/csv;charset=utf-8;', extension: 'csv' };
  };

  const getExportFileName = (extension: string) => {
    const dataHoje = new Date().toISOString().slice(0, 10);
    let sufixoPeriodo = 'Geral';
    if (scope === 'all') sufixoPeriodo = 'Geral_Completo';
    else if (scope === 'day') sufixoPeriodo = `Dia_${selectedDay}`;
    else if (scope === 'week') {
      const { start, end } = getWeekRange(selectedDay);
      sufixoPeriodo = `Semana_${start}_a_${end}`;
    } else if (scope === 'month') sufixoPeriodo = `Mes_${selectedMonth}`;
    else if (scope === 'custom') sufixoPeriodo = `Periodo_${customStart}_a_${customEnd}`;
    return `Controle_Diario_Backup_${sufixoPeriodo}_${dataHoje}.${extension}`;
  };
  // Download compatível com APK Android e navegadores
  const handleDownload = () => {
    if (filteredLogs.length === 0) {
      alert("Nenhum lançamento encontrado para o período selecionado.");
      return;
    }
    const { content, type, extension } = getPreparedContent();
    const fileName = getExportFileName(extension);

    // 1. Envia via formulário POST HTTP (O Android intercepta e salva nativamente em Downloads)
    try {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/export-backup';
      form.target = '_blank';
      form.style.display = 'none';

      const inputContent = document.createElement('input');
      inputContent.type = 'hidden';
      inputContent.name = 'content';
      inputContent.value = content;
      form.appendChild(inputContent);

      const inputFileName = document.createElement('input');
      inputFileName.type = 'hidden';
      inputFileName.name = 'fileName';
      inputFileName.value = fileName;
      form.appendChild(inputFileName);

      const inputMime = document.createElement('input');
      inputMime.type = 'hidden';
      inputMime.name = 'mimeType';
      inputMime.value = type;
      form.appendChild(inputMime);

      document.body.appendChild(form);
      form.submit();
      
      setTimeout(() => {
        try { document.body.removeChild(form); } catch (_) {}
      }, 1000);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
      return;
    } catch (_) {}

    // Fallback: Blob URL
    try {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (_) {
      handleCopyText();
    }
  };

  // Copiar para área de transferência
  const handleCopyText = async () => {
    if (filteredLogs.length === 0) return;
    const { content } = getPreparedContent();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = content;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {}
  };

  // Enviar resumo direto no WhatsApp
  const handleOpenWhatsApp = () => {
    if (filteredLogs.length === 0) {
      alert("Nenhum lançamento no período selecionado.");
      return;
    }
    let totalBruto = 0, totalDesp = 0, totalUber = 0, total99 = 0, totalKm = 0;
    filteredLogs.forEach(l => {
      const u = (l.appUber?.earnings || 0) + (l.appUber?.bonus || 0);
      const n = (l.app99?.earnings || 0) + (l.app99?.bonus || 0);
      const p = l.appParticular?.earnings || 0;
      const out = (l.recompensasExtra || 0) + (l.outrasFontes || 0);
      const bruto = u + n + p + out;

      const cCar = (l.carExpenses?.wash || 0) + (l.carExpenses?.toll || 0) + (l.carExpenses?.parking || 0) + (l.carExpenses?.publicCharging || 0) + (l.carExpenses?.maintenance || 0) + (l.carExpenses?.other || 0);
      const cFood = (l.foodExpenses?.lunch || 0) + (l.foodExpenses?.dinner || 0) + (l.foodExpenses?.snacks || 0) + (l.foodExpenses?.coffee || 0);
      const desp = (l.custoEnergia || 0) + (l.diariaCarro || 0) + cCar + cFood;

      totalBruto += bruto;
      totalDesp += desp;
      totalUber += u;
      total99 += n;
      totalKm += (l.kmRodado || 0);
    });

    const msg = 
`📊 *CONTROLE DIÁRIO - BACKUP*
🗓️ *Período:* ${getRangeLabel()} (${filteredLogs.length} dias)
🚗 *Carro:* ${carProfile?.modelName || 'Veículo'} (${carProfile?.licensePlate || '-'})

💰 *Faturamento Bruto:* R$ ${totalBruto.toFixed(2)}
🖤 *Uber:* R$ ${totalUber.toFixed(2)}
💛 *99:* R$ ${total99.toFixed(2)}
📉 *Despesas Totais:* R$ ${totalDesp.toFixed(2)}
✅ *Resultado Líquido:* R$ ${(totalBruto - totalDesp).toFixed(2)}
📍 *KM Rodados:* ${totalKm.toFixed(1)} km`;

    const encoded = encodeURIComponent(msg);
    const waUrl = `whatsapp://send?text=${encoded}`;
    try {
      const a = document.createElement('a');
      a.href = waUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (_) {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
  };

  // Compartilhamento nativo
  const handleShare = () => {
    if (filteredLogs.length === 0) return;
    const { content, type, extension } = getPreparedContent();
    const fileName = getExportFileName(extension);

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const file = new File([content], fileName, { type });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({
            files: [file],
            title: 'Backup Controle Diário',
            text: `Backup (${filteredLogs.length} lançamentos).`
          }).catch((err: any) => {
            if (err && err.name !== 'AbortError') handleDownload();
          });
          return;
        }
      } catch (_) {}

      try {
        navigator.share({
          title: 'Backup Controle Diário',
          text: content
        }).catch((err: any) => {
          if (err && err.name !== 'AbortError') handleDownload();
        });
        return;
      } catch (_) {}
    }
    handleDownload();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-zinc-900 border border-zinc-700/80 rounded-xl flex items-center justify-center shadow-sm">
              <GkdMobilityLogo className="w-8 h-8 rounded-lg" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100">Backup Completo do Sistema</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-black font-extrabold shadow-sm">
                  100% dos Dados
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Dias, Despesas, Dados do Carro e Valor da Energia</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onBack && (
              <button 
                type="button"
                onClick={onBack}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                title="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-4">

          {/* Formato do Arquivo */}
          <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-2">
            <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block">
              Formato do Arquivo
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('excel')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  format === 'excel'
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg ring-2 ring-emerald-400'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${format === 'excel' ? 'bg-black/25 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-xs font-bold block ${format === 'excel' ? 'text-white' : 'text-zinc-200'}`}>Planilha Excel (.csv)</span>
                  <span className={`text-[10px] ${format === 'excel' ? 'text-emerald-100' : 'text-zinc-500'}`}>Abrir no Excel, Drive e Sheets</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  format === 'json'
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg ring-2 ring-emerald-400'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${format === 'json' ? 'bg-black/25 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-xs font-bold block ${format === 'json' ? 'text-white' : 'text-zinc-200'}`}>Estrutura Integral (.json)</span>
                  <span className={`text-[10px] ${format === 'json' ? 'text-emerald-100' : 'text-zinc-500'}`}>Backup 100% idêntico do app</span>
                </div>
              </button>
            </div>
          </div>
          
          {/* Seletor de Escopo de Backup */}
          <div>
            <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-2">
              Escolha o Período dos Lançamentos
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                  scope === 'all'
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg ring-2 ring-emerald-400'
                    : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Layers className={`w-4 h-4 ${scope === 'all' ? 'text-white' : 'text-zinc-400'}`} />
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${scope === 'all' ? 'bg-black/30 text-white' : 'bg-zinc-800/80 text-zinc-300'}`}>Total</span>
                </div>
                <span className={`text-xs font-bold leading-tight ${scope === 'all' ? 'text-white' : 'text-zinc-200'}`}>Tudo (Total Geral)</span>
                <span className={`text-[10px] leading-tight ${scope === 'all' ? 'text-emerald-100' : 'text-zinc-500'}`}>Todo o histórico acumulado</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('day')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                  scope === 'day'
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg ring-2 ring-emerald-400'
                    : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Calendar className={`w-4 h-4 ${scope === 'day' ? 'text-white' : 'text-zinc-400'}`} />
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${scope === 'day' ? 'bg-black/30 text-white' : 'bg-zinc-800/80 text-zinc-300'}`}>Dia</span>
                </div>
                <span className={`text-xs font-bold leading-tight ${scope === 'day' ? 'text-white' : 'text-zinc-200'}`}>Por Dia</span>
                <span className={`text-[10px] leading-tight ${scope === 'day' ? 'text-emerald-100' : 'text-zinc-500'}`}>Lançamento de 1 data</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('week')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                  scope === 'week'
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg ring-2 ring-emerald-400'
                    : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <CalendarDays className={`w-4 h-4 ${scope === 'week' ? 'text-white' : 'text-zinc-400'}`} />
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${scope === 'week' ? 'bg-black/30 text-white' : 'bg-zinc-800/80 text-zinc-300'}`}>Semana</span>
                </div>
                <span className={`text-xs font-bold leading-tight ${scope === 'week' ? 'text-white' : 'text-zinc-200'}`}>Por Semana</span>
                <span className={`text-[10px] leading-tight ${scope === 'week' ? 'text-emerald-100' : 'text-zinc-500'}`}>Segunda a Domingo</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('month')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                  scope === 'month'
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg ring-2 ring-emerald-400'
                    : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <CalendarRange className={`w-4 h-4 ${scope === 'month' ? 'text-white' : 'text-zinc-400'}`} />
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${scope === 'month' ? 'bg-black/30 text-white' : 'bg-zinc-800/80 text-zinc-300'}`}>Mês</span>
                </div>
                <span className={`text-xs font-bold leading-tight ${scope === 'month' ? 'text-white' : 'text-zinc-200'}`}>Por Mês</span>
                <span className={`text-[10px] leading-tight ${scope === 'month' ? 'text-emerald-100' : 'text-zinc-500'}`}>Mês completo</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('custom')}
                className={`col-span-2 sm:col-span-2 p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                  scope === 'custom'
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg ring-2 ring-emerald-400'
                    : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <FileSpreadsheet className={`w-4 h-4 ${scope === 'custom' ? 'text-white' : 'text-zinc-400'}`} />
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${scope === 'custom' ? 'bg-black/30 text-white' : 'bg-zinc-800/80 text-zinc-300'}`}>Livre</span>
                </div>
                <span className={`text-xs font-bold leading-tight ${scope === 'custom' ? 'text-white' : 'text-zinc-200'}`}>Intervalo Personalizado</span>
                <span className={`text-[10px] leading-tight ${scope === 'custom' ? 'text-emerald-100' : 'text-zinc-500'}`}>Escolha qualquer data inicial e final</span>
              </button>
            </div>
          </div>

          {/* Parâmetros do Escopo */}
          {scope === 'day' && (
            <div className="p-3.5 bg-zinc-900/40 rounded-xl border border-zinc-800/80 space-y-2 animate-fade-in">
              <label className="text-[11px] font-bold text-zinc-300 block">Selecione o Dia:</label>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          )}

          {scope === 'week' && (
            <div className="p-3.5 bg-zinc-900/40 rounded-xl border border-zinc-800/80 space-y-2 animate-fade-in">
              <label className="text-[11px] font-bold text-zinc-300 block">Selecione qualquer dia da semana desejada:</label>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <p className="text-[11px] text-emerald-400 font-mono font-bold">{getRangeLabel()}</p>
            </div>
          )}

          {scope === 'month' && (
            <div className="p-3.5 bg-zinc-900/40 rounded-xl border border-zinc-800/80 space-y-2 animate-fade-in">
              <label className="text-[11px] font-bold text-zinc-300 block">Selecione o Mês e Ano:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          )}

          {scope === 'custom' && (
            <div className="p-3.5 bg-zinc-900/40 rounded-xl border border-zinc-800/80 grid grid-cols-2 gap-3 animate-fade-in">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">Data Inicial</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">Data Final</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Resumo do Backup */}
          <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-zinc-200 block">{getRangeLabel()}</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-zinc-400">
                  {filteredLogs.length > 0 ? `${filteredLogs.length} dia(s) com dados • Veículo e Despesas Inclusos` : 'Nenhum lançamento no período'}
                </span>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 rounded font-bold">
                  {getExportFileName(format === 'excel' ? 'csv' : 'json')}
                </span>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-emerald-600 font-mono text-xs text-white font-extrabold shrink-0 ml-2 shadow-sm">
              {filteredLogs.length} reg.
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              
              {/* 1. Enviar no WhatsApp Direto */}
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                disabled={filteredLogs.length === 0}
                className="p-3 bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/40 active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-white shrink-0" />
                <span className="text-sm font-bold">Enviar no WhatsApp</span>
              </button>

              {/* 2. Baixar Arquivo Real na Pasta Downloads */}
              <button
                type="button"
                onClick={handleDownload}
                disabled={filteredLogs.length === 0}
                className="p-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                {downloadSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Download className="w-4 h-4 text-emerald-300" />}
                <span>{downloadSuccess ? 'Download Iniciado!' : `Salvar .${format === 'excel' ? 'csv' : 'json'} no Celular`}</span>
                <span className="text-[9px] font-normal text-emerald-200">Salva na pasta Downloads</span>
              </button>
            </div>

            {/* Ações Secundárias */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyText}
                disabled={filteredLogs.length === 0}
                className="py-2.5 px-3 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                <span>{copied ? 'Copiado!' : 'Copiar Dados'}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                disabled={filteredLogs.length === 0}
                className="py-2.5 px-3 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Outros Apps</span>
              </button>
            </div>
          </div>

          <div className="p-2.5 bg-zinc-900/30 border border-zinc-800/60 rounded-xl">
            <p className="text-[11px] text-zinc-400 leading-relaxed flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                Toque em <strong>Enviar no WhatsApp</strong> para abrir o WhatsApp na hora, ou em <strong>Salvar no Celular</strong> para baixar o arquivo.
              </span>
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
  }
