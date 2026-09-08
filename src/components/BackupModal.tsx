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
  Car,
  DollarSign,
  Zap,
  RotateCcw
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

  // Helper: compute start & end of week for a given day (Monday to Sunday)
  const getWeekRange = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const day = d.getDay(); // 0 is Sunday
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

  // Filter logs according to selected scope
  const filteredLogs = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    switch (scope) {
      case 'all':
        return [...logs].sort((a, b) => a.date.localeCompare(b.date));

      case 'day':
        return logs.filter(l => l.date === selectedDay);

      case 'week': {
        const { start, end } = getWeekRange(selectedDay);
        return logs
          .filter(l => l.date >= start && l.date <= end)
          .sort((a, b) => a.date.localeCompare(b.date));
      }

      case 'month':
        return logs
          .filter(l => l.date.startsWith(selectedMonth))
          .sort((a, b) => a.date.localeCompare(b.date));

      case 'custom':
        if (!customStart || !customEnd) return [];
        return logs
          .filter(l => l.date >= customStart && l.date <= customEnd)
          .sort((a, b) => a.date.localeCompare(b.date));

      default:
        return logs;
    }
  }, [logs, scope, selectedDay, selectedMonth, customStart, customEnd]);

  if (!isOpen) return null;

  // Build JSON Backup Object containing 100% of the app state
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
      // 1. DADOS COMPLETOS DO VEÍCULO E ENERGIA
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
        valorPagoPelaEnergiaOuCombustivel: carProfile?.kwhCostRate || 0, // VALOR QUE PAGA PELA ENERGIA (R$/kWh)
        valorAluguelSemanal: carProfile?.rentalOrWeeklyRate || 0,
        despesaMensalCarroEstimada: carProfile?.monthlyCarExpense || 0,
        escalaTrabalho: carProfile?.workScheduleType || "mon_to_sat_sundays_off",
        diasTrabalhoPersonalizados: carProfile?.customWorkDays || {},
        seguradora: carProfile?.insurerName || "",
        apoliceSeguro: carProfile?.insurancePolicyNumber || "",
        proximaManutencaoKm: carProfile?.nextMaintenanceKm || "",
        observacoesNotas: carProfile?.notes || ""
      },
      // 2. DESPESAS FIXAS COMPLETAS
      despesasFixasPorMes: fixedExpensesByMonth || {},
      // 3. TODOS OS DIAS E LANÇAMENTOS DO PERÍODO
      lancamentosDiarios: filteredLogs.map(log => ({
        id: log.id,
        data: log.date,
        diaSemana: WEEK_DAYS[new Date(log.date + 'T12:00:00').getDay()],
        ehFolga: Boolean(log.isDayOff),
        kmRodado: log.kmRodado || 0,
        // ENERGIA E BATERIA DO DIA
        bateriaRestantePct: log.sobrouBateria || 0,
        valorKwhUtilizadoNoDia: log.valorKwh || carProfile?.kwhCostRate || 0,
        capacidadeBateriaKwh: log.capacidadeBateria || carProfile?.batteryCapacityKwh || 0,
        custoEnergiaTotal: log.custoEnergia || 0,
        // CUSTOS FIXOS DO DIA
        diariaCarro: log.diariaCarro || 0,
        // DESPESAS COM CARRO
        despesasCarro: {
          lavaJato: log.carExpenses?.wash || 0,
          pedagio: log.carExpenses?.toll || 0,
          estacionamento: log.carExpenses?.parking || 0,
          recargaExterna: log.carExpenses?.publicCharging || 0,
          manutencao: log.carExpenses?.maintenance || 0,
          outros: log.carExpenses?.other || 0,
          totalDespesasCarro: (log.carExpenses?.wash || 0) + (log.carExpenses?.toll || 0) + (log.carExpenses?.parking || 0) + (log.carExpenses?.publicCharging || 0) + (log.carExpenses?.maintenance || 0) + (log.carExpenses?.other || 0)
        },
        // DESPESAS COM ALIMENTAÇÃO
        despesasAlimentacao: {
          almoco: log.foodExpenses?.lunch || 0,
          jantar: log.foodExpenses?.dinner || 0,
          lanches: log.foodExpenses?.snacks || 0,
          cafe: log.foodExpenses?.coffee || 0,
          totalDespesasAlimentacao: (log.foodExpenses?.lunch || 0) + (log.foodExpenses?.dinner || 0) + (log.foodExpenses?.snacks || 0) + (log.foodExpenses?.coffee || 0)
        },
        // GANHOS DE APLICATIVOS E FONTES
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
        recebidosAnjo: log.anjo || 0,
        // TOTAIS CONSOLIDADOS DO DIA
        faturamentoBrutoDia: ((log.appUber?.earnings || 0) + (log.appUber?.bonus || 0) + (log.app99?.earnings || 0) + (log.app99?.bonus || 0) + (log.appParticular?.earnings || 0) + (log.recompensasExtra || 0) + (log.outrasFontes || 0)),
        totalCustosDia: ((log.custoEnergia || 0) + (log.diariaCarro || 0) + ((log.carExpenses?.wash || 0) + (log.carExpenses?.toll || 0) + (log.carExpenses?.parking || 0) + (log.carExpenses?.publicCharging || 0) + (log.carExpenses?.maintenance || 0) + (log.carExpenses?.other || 0)) + ((log.foodExpenses?.lunch || 0) + (log.foodExpenses?.dinner || 0) + (log.foodExpenses?.snacks || 0) + (log.foodExpenses?.coffee || 0))),
        resultadoLiquidoDia: ((log.appUber?.earnings || 0) + (log.appUber?.bonus || 0) + (log.app99?.earnings || 0) + (log.app99?.bonus || 0) + (log.appParticular?.earnings || 0) + (log.recompensasExtra || 0) + (log.outrasFontes || 0)) - ((log.custoEnergia || 0) + (log.diariaCarro || 0) + ((log.carExpenses?.wash || 0) + (log.carExpenses?.toll || 0) + (log.carExpenses?.parking || 0) + (log.carExpenses?.publicCharging || 0) + (log.carExpenses?.maintenance || 0) + (log.carExpenses?.other || 0)) + ((log.foodExpenses?.lunch || 0) + (log.foodExpenses?.dinner || 0) + (log.foodExpenses?.snacks || 0) + (log.foodExpenses?.coffee || 0)))
      }))
    };

    return JSON.stringify(backupPayload, null, 2);
  };

  // Build CSV representation with 100% of vehicle, energy, fixed expense and daily columns
  const generateCsvData = () => {
    const isEletrico = carProfile?.vehicleType === 'eletrico';

    // 1. CABEÇALHO COMPLETO DO VEÍCULO E ENERGIA
    const carProfileData = [
      ["CONTROLE DIÁRIO - BACKUP COMPLETO DO SISTEMA", "", "", ""],
      ["Data de Geração", new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR'), "", ""],
      ["Período Selecionado", getRangeLabel(), "", ""],
      ["", "", "", ""],
      ["DADOS COMPLETOS DO VEÍCULO E CONFIGURAÇÕES DE ENERGIA", "", "", ""],
      ["Modelo do Veículo", carProfile?.modelName || "-"],
      ["Placa", carProfile?.licensePlate || "-"],
      ["Tipo de Propulsão", isEletrico ? '100% Elétrico (EV)' : 'Combustão / Híbrido'],
      ["Ano de Fabricação", carProfile?.manufactureYear || "-"],
      ["Cor", carProfile?.color || "-"],
      ["Propriedade do Veículo", carProfile?.ownershipType === 'proprio' ? 'Próprio' : carProfile?.ownershipType === 'financiado' ? 'Financiado' : 'Alugado'],
      ["KM Atual do Odômetro (ODO)", carProfile?.currentKm || 0],
      ["Capacidade da Bateria / Tanque", `${carProfile?.batteryCapacityKwh || 0} ${isEletrico ? 'kWh' : 'Litros'}`],
      ["Autonomia Estimada (100%)", `${carProfile?.estimatedAutonomyKm || 0} km`],
      ["VALOR QUE PAGA PELA ENERGIA / COMBUSTÍVEL", `R$ ${(carProfile?.kwhCostRate || 0).toFixed(2)} por ${isEletrico ? 'kWh' : 'Litro'}`],
      ["Custo Semanal de Aluguel", `R$ ${(carProfile?.rentalOrWeeklyRate || 0).toFixed(2)}`],
      ["Gasto Mensal do Carro (Referência)", `R$ ${(carProfile?.monthlyCarExpense || 0).toFixed(2)}`],
      ["Próxima Manutenção Preventiva", carProfile?.nextMaintenanceKm || "-"],
      ["Seguradora", carProfile?.insurerName || "-"],
      ["Número da Apólice", carProfile?.insurancePolicyNumber || "-"],
      ["Escala de Trabalho Cadastrada", carProfile?.workScheduleType === 'custom_calendar' ? 'Calendário Personalizado' : 'Segunda a Sábado (Domingo Folga)'],
      ["Observações e Notas", carProfile?.notes || "-"],
      ["", "", "", ""]
    ];

    // 2. DESPESAS FIXAS REGISTRADAS
    const fixedExpensesData: string[][] = [];
    const monthsInLogs = new Set(filteredLogs.map(l => l.date.substring(0, 7)));
    const relevantFixedExpenses = Object.entries(fixedExpensesByMonth || {})
      .filter(([mKey]) => scope === 'all' || monthsInLogs.has(mKey))
      .sort((a, b) => a[0].localeCompare(b[0]));

    if (relevantFixedExpenses.length > 0) {
      fixedExpensesData.push(["DESPESAS FIXAS MENSAIS CADASTRADAS NO APLICATIVO", "", "", ""]);
      fixedExpensesData.push(["Mês / Ano", "Nome da Despesa", "Valor (R$)", "Parcelas"]);
      relevantFixedExpenses.forEach(([mKey, expenses]) => {
        const [y, m] = mKey.split('-');
        (expenses as any[]).forEach(exp => {
          fixedExpensesData.push([`${m}/${y}`, exp.name, (Number(exp.value) || 0).toFixed(2), exp.installments || "-"]);
        });
      });
      fixedExpensesData.push(["", "", "", ""]);
    }

    // 3. CABEÇALHO DA TABELA DE DIAS COM TODAS AS COLUNAS POSSÍVEIS
    const headers = [
      "Data",
      "Dia da Semana",
      "Status",
      "KM Rodados",
      "Bateria Restante (%)",
      isEletrico ? "Valor Pago p/ kWh (R$)" : "Valor do Litro (R$)",
      isEletrico ? "Custo Bateria / Energia (R$)" : "Custo Combustível (R$)",
      "Diária do Carro (R$)",
      "Lava-jato (R$)",
      "Pedágio (R$)",
      "Estacionamento (R$)",
      "Recarga Externa (R$)",
      "Manutenção Carro (R$)",
      "Outros Carro (R$)",
      "Total Despesas Carro (R$)",
      "Almoço (R$)",
      "Jantar (R$)",
      "Lanches (R$)",
      "Café (R$)",
      "Total Despesas Alimentação (R$)",
      "Qtd Corridas 99",
      "Ganhos 99 (R$)",
      "Bônus 99 (R$)",
      "Total 99 (R$)",
      "Qtd Corridas Uber",
      "Ganhos Uber (R$)",
      "Bônus Uber (R$)",
      "Total Uber (R$)",
      "Qtd Corridas Particular",
      "Ganhos Particular (R$)",
      "Recompensas Extras (R$)",
      "Outras Fontes (R$)",
      "Recebidos Anjo (R$)",
      "Faturamento Bruto Total (R$)",
      "Total Geral de Despesas (R$)",
      "Resultado Líquido do Dia (R$)"
    ];

    // 4. LINHAS DETALHADAS DE CADA DIA
    const rows = filteredLogs.map(log => {
      const uEarnings = log.appUber?.earnings || 0;
      const uBonus = log.appUber?.bonus || 0;
      const uTotal = uEarnings + uBonus;

      const nEarnings = log.app99?.earnings || 0;
      const nBonus = log.app99?.bonus || 0;
      const nTotal = nEarnings + nBonus;

      const pTotal = log.appParticular?.earnings || 0;
      const pRides = log.appParticular?.rides || 0;
      const recomp = log.recompensasExtra || 0;
      const outras = log.outrasFontes || 0;
      const anjo = log.anjo || 0;
      const gross = uTotal + nTotal + pTotal + recomp + outras;

      const carWash = log.carExpenses?.wash || 0;
      const carToll = log.carExpenses?.toll || 0;
      const carPark = log.carExpenses?.parking || 0;
      const carCharge = log.carExpenses?.publicCharging || 0;
      const carMaint = log.carExpenses?.maintenance || 0;
      const carOther = log.carExpenses?.other || 0;
      const totalCarExpenses = carWash + carToll + carPark + carCharge + carMaint + carOther;

      const fLunch = log.foodExpenses?.lunch || 0;
      const fDinner = log.foodExpenses?.dinner || 0;
      const fSnacks = log.foodExpenses?.snacks || 0;
      const fCoffee = log.foodExpenses?.coffee || 0;
      const totalFoodExpenses = fLunch + fDinner + fSnacks + fCoffee;

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
        carWash.toFixed(2),
        carToll.toFixed(2),
        carPark.toFixed(2),
        carCharge.toFixed(2),
        carMaint.toFixed(2),
        carOther.toFixed(2),
        totalCarExpenses.toFixed(2),
        fLunch.toFixed(2),
        fDinner.toFixed(2),
        fSnacks.toFixed(2),
        fCoffee.toFixed(2),
        totalFoodExpenses.toFixed(2),
        log.app99?.rides || 0,
        nEarnings.toFixed(2),
        nBonus.toFixed(2),
        nTotal.toFixed(2),
        log.appUber?.rides || 0,
        uEarnings.toFixed(2),
        uBonus.toFixed(2),
        uTotal.toFixed(2),
        pTotal > 0 ? pRides : 0,
        pTotal.toFixed(2),
        recomp.toFixed(2),
        outras.toFixed(2),
        anjo.toFixed(2),
        gross.toFixed(2),
        totalDayExpenses.toFixed(2),
        net.toFixed(2)
      ];
    });

    const csvContent = "\uFEFF" + [
      ...carProfileData.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";")),
      ...fixedExpensesData.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";")),
      headers.join(";"),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    ].join("\n");

    return csvContent;
  };

  // Get File Data according to current format
  const getPreparedContent = () => {
    if (format === 'json') {
      return {
        content: generateJsonData(),
        type: 'application/json',
        extension: 'json'
      };
    }
    return {
      content: generateCsvData(),
      type: 'text/csv;charset=utf-8;',
      extension: 'csv'
    };
  };

  // Gera o nome do arquivo 100% em português com Controle Diário
  const getExportFileName = (extension: string) => {
    const dataHoje = new Date().toISOString().slice(0, 10);
    let sufixoPeriodo = 'Geral';

    if (scope === 'all') {
      sufixoPeriodo = 'Geral_Completo';
    } else if (scope === 'day') {
      sufixoPeriodo = `Dia_${selectedDay}`;
    } else if (scope === 'week') {
      const { start, end } = getWeekRange(selectedDay);
      sufixoPeriodo = `Semana_${start}_a_${end}`;
    } else if (scope === 'month') {
      sufixoPeriodo = `Mes_${selectedMonth}`;
    } else if (scope === 'custom') {
      sufixoPeriodo = `Periodo_${customStart}_a_${customEnd}`;
    }

    return `Controle_Diario_Backup_${sufixoPeriodo}_${dataHoje}.${extension}`;
  };

  // 1. Download via direct Blob / Native File Download
  const handleDownload = () => {
    if (filteredLogs.length === 0) {
      alert("Nenhum lançamento encontrado para o período selecionado.");
      return;
    }

    const { content, type, extension } = getPreparedContent();
    const fileName = getExportFileName(extension);

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
    } catch (err) {
      console.error('Erro ao baixar arquivo:', err);
      alert('Não foi possível iniciar o download automático. Utilize o botão "Compartilhar" ou "Copiar".');
    }
  };

  // 2. Copy text to clipboard
  const handleCopyText = async () => {
    if (filteredLogs.length === 0) {
      alert("Nenhum lançamento encontrado para o período selecionado.");
      return;
    }

    const { content } = getPreparedContent();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Erro ao copiar:', err);
      alert("Não foi possível copiar para a área de transferência.");
    }
  };

  // 3. Native Android / Web Share API
  const handleShare = () => {
    if (filteredLogs.length === 0) {
      alert("Nenhum lançamento encontrado para o período selecionado.");
      return;
    }

    const { content, type, extension } = getPreparedContent();
    const fileName = getExportFileName(extension);

    // Se o ambiente não suportar navigator.share (ex: iframe sandboxed), executa download direto sem erro
    if (typeof navigator === 'undefined' || !navigator.share) {
      handleDownload();
      return;
    }

    // Chamada estritamente síncrona sem await intermediário para manter a ativação do gesto do usuário
    try {
      const file = new File([content], fileName, { type });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: 'Backup Controle Diário',
          text: `Backup completo do Controle Diário (${filteredLogs.length} lançamentos).`
        }).catch((err: any) => {
          if (err && err.name !== 'AbortError') {
            handleDownload();
          }
        });
        return;
      }
    } catch (_) {}

    try {
      navigator.share({
        title: 'Backup Controle Diário',
        text: content
      }).catch((err: any) => {
        if (err && err.name !== 'AbortError') {
          handleDownload();
        }
      });
    } catch (_) {
      handleDownload();
    }
  };

  // Info label for current range
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
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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

          {/* Formato de Exportação: Excel (.csv) ou Completo (.json) */}
          <div className="p-3 bg-zinc-900/30 border border-zinc-800/60 rounded-xl space-y-2">
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
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
              Escolha o Período dos Lançamentos
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              
              {/* Opção: Tudo */}
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

              {/* Opção: Por Dia */}
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

              {/* Opção: Por Semana */}
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

              {/* Opção: Por Mês */}
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

              {/* Opção: Personalizado */}
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

          {/* Configuração dos Parâmetros do Escopo Selecionado */}
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
              <p className="text-[11px] text-emerald-400/90 font-mono">
                {getRangeLabel()}
              </p>
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

          {/* Resumo do Backup Selecionado */}
          <div className="p-3 bg-zinc-900/30 border border-zinc-800/60 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-zinc-300 block">{getRangeLabel()}</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-zinc-500">
                  {filteredLogs.length > 0 
                    ? `${filteredLogs.length} dia(s) com dados • Veículo e Despesas Inclusos`
                    : 'Nenhum lançamento no período'}
                </span>
                <span className="text-[9px] font-mono text-zinc-400 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                  {getExportFileName(format === 'excel' ? 'csv' : 'json')}
                </span>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 font-mono text-xs text-emerald-400 font-bold shrink-0 ml-2">
              {filteredLogs.length} reg.
            </div>
          </div>

          {/* Botões de Ação para Celular e APK */}
          <div className="space-y-2 pt-1">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Como deseja salvar ou enviar o backup?
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              
              {/* 1. Compartilhar Direto (WhatsApp / Drive / Arquivos do Android) */}
              <button
                type="button"
                onClick={handleShare}
                disabled={filteredLogs.length === 0}
                className="p-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartilhar</span>
                <span className="text-[9px] font-normal text-emerald-100 opacity-80">WhatsApp / Google Drive</span>
              </button>

              {/* 2. Copiar Texto / Dados */}
              <button
                type="button"
                onClick={handleCopyText}
                disabled={filteredLogs.length === 0}
                className="p-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-200 border border-zinc-700 text-xs font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado!' : `Copiar ${format.toUpperCase()}`}</span>
                <span className="text-[9px] font-normal text-zinc-400">Área de Transferência</span>
              </button>

              {/* 3. Baixar Arquivo */}
              <button
                type="button"
                onClick={handleDownload}
                disabled={filteredLogs.length === 0}
                className="p-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-200 border border-zinc-700 text-xs font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                {downloadSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4 text-emerald-400" />}
                <span>{downloadSuccess ? 'Baixado!' : `Baixar .${format === 'excel' ? 'csv' : 'json'}`}</span>
                <span className="text-[9px] font-normal text-zinc-400">Download Direto</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-zinc-900/20 border border-zinc-800/40 rounded-xl space-y-1">
            <p className="text-[11px] text-zinc-400 leading-relaxed flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Praticidade no Celular:</strong> O botão <strong>Compartilhar</strong> permite enviar o arquivo diretamente para você mesmo no <strong>WhatsApp</strong>, guardar na sua pasta do <strong>Google Drive</strong> ou abrir com um toque no <strong>Excel</strong> do Android.
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
