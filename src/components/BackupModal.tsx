import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
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
  MessageCircle,
  Receipt,
  Upload,
  ArrowRight,
  Database,
  CheckCircle2,
  Loader2,
  Car,
  TrendingUp,
  FileText
} from 'lucide-react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { GkdMobilityLogo } from './GkdMobilityLogo';
import { getApiUrl, isMobileOrNativeApp } from '../lib/api';
import { DEFAULT_DAILY_LOGS, DEFAULT_FIXED_EXPENSES_BY_MONTH, DEFAULT_CAR_PROFILE } from '../defaultBackupData';

export type BackupScope = 'all' | 'day' | 'week' | 'month' | 'custom';
export type BackupFormat = 'json' | 'excel';
export type MainModalTab = 'backup' | 'import';

export interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  onOpenImport?: () => void;
  onImportData?: (logs: any[], fixedExpenses?: any[], carProfile?: any) => void;
  logs: any[];
  carProfile: any;
  fixedExpensesByMonth: Record<string, any[]>;
  initialTab?: MainModalTab;
}

const WEEK_DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function BackupModal({
  isOpen,
  onClose,
  onBack,
  onOpenImport,
  onImportData,
  logs,
  carProfile,
  fixedExpensesByMonth,
  initialTab = 'backup'
}: BackupModalProps) {
  // Aba principal: Fazer Backup vs Importar Dados
  const [activeMainTab, setActiveMainTab] = useState<MainModalTab>(initialTab);

  // Estados de Backup / Exportação (JSON como 1ª opção e padrão)
  const [scope, setScope] = useState<BackupScope>('all');
  const [format, setFormat] = useState<BackupFormat>('json');
  const [selectedDay, setSelectedDay] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [customStart, setCustomStart] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [customEnd, setCustomEnd] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados de Importação
  const [importTab, setImportTab] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState('');
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [parsedImportData, setParsedImportData] = useState<{
    dailyLogs: any[];
    fixedExpenses: any[];
    carProfile?: any;
    totalEarnings: number;
    fileName?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

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

  // Recuperação resiliente das despesas fixas (props ou localStorage)
  const effectiveFixedExpensesByMonth = useMemo(() => {
    let source = fixedExpensesByMonth;
    if (!source || Object.keys(source).length === 0) {
      const keysToCheck = [
        'driver_fixed_expenses_v6_by_month',
        'driver_fixed_expenses_v5_by_month',
        'driver_fixed_expenses_v4_by_month',
        'driver_fixed_expenses_by_month'
      ];
      for (const k of keysToCheck) {
        try {
          const saved = localStorage.getItem(k);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) {
              source = parsed;
              break;
            }
          }
        } catch (_) {}
      }
    }
    return source || {};
  }, [fixedExpensesByMonth]);

  // Mapeia as despesas fixas relevantes para o escopo selecionado
  const relevantFixedExpenses = useMemo(() => {
    const entries = Object.entries(effectiveFixedExpensesByMonth);
    if (entries.length === 0) return [];

    let targetMonths: string[] = [];

    if (scope === 'all') {
      targetMonths = Object.keys(effectiveFixedExpensesByMonth);
    } else if (scope === 'month') {
      targetMonths = [selectedMonth];
    } else if (scope === 'day') {
      targetMonths = [selectedDay.slice(0, 7)];
    } else if (scope === 'week') {
      const { start, end } = getWeekRange(selectedDay);
      const m1 = start.slice(0, 7);
      const m2 = end.slice(0, 7);
      targetMonths = Array.from(new Set([m1, m2]));
    } else if (scope === 'custom') {
      if (customStart && customEnd) {
        const m1 = customStart.slice(0, 7);
        const m2 = customEnd.slice(0, 7);
        targetMonths = Object.keys(effectiveFixedExpensesByMonth).filter(m => m >= m1 && m <= m2);
      }
    }

    const collected: any[] = [];
    const seenIds = new Set<string>();

    targetMonths.forEach(m => {
      const list = effectiveFixedExpensesByMonth[m] || [];
      list.forEach((item: any) => {
        const uniqueKey = `${m}-${item.id || item.name}`;
        if (!seenIds.has(uniqueKey)) {
          seenIds.add(uniqueKey);
          collected.push({ ...item, monthKey: m });
        }
      });
    });

    return collected;
  }, [effectiveFixedExpensesByMonth, scope, selectedDay, selectedMonth, customStart, customEnd]);

  const totalFixedVal = useMemo(() => {
    return relevantFixedExpenses.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  }, [relevantFixedExpenses]);

  // Nome dinâmico para o arquivo exportado
  const getExportFileName = (ext: string) => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;
    
    return `Backup_Controle_Diario_${formattedDate}.${ext}`;
  };

  // Gerador de CSV (compatível com Excel PT-BR / UTF-8 com BOM)
  const generateCSV = (): string => {
    const BOM = '\uFEFF';
    const sep = ';';

    const headers = [
      'Data',
      'Status / Folga',
      'KM Rodado',
      'Sobrou Bateria (%)',
      'Custo Energia / Recarga (R$)',
      'Diária Carro (R$)',
      'Lava Jato (R$)',
      'Pedágio (R$)',
      'Estacionamento (R$)',
      'Recarga Pública (R$)',
      'Manutenção Carro (R$)',
      'Outras Desp Carro (R$)',
      'Total Despesas Carro (R$)',
      'Almoço (R$)',
      'Jantar (R$)',
      'Lanches (R$)',
      'Café (R$)',
      'Total Alimentação (R$)',
      'Uber Corridas',
      'Uber Bruto (R$)',
      'Uber Bônus (R$)',
      'Uber Total (R$)',
      '99 Corridas',
      '99 Bruto (R$)',
      '99 Bônus (R$)',
      '99 Total (R$)',
      'Particular Corridas',
      'Particular Faturamento (R$)',
      'Recompensas Extras (R$)',
      'Outras Fontes (R$)',
      'Faturamento Bruto Total (R$)',
      'Total Despesas Variáveis (R$)',
      'Lucro Líquido Diário (R$)',
      'Valor kWh (R$)',
      'Capacidade Bateria (kWh)'
    ];

    let rows: string[] = [];
    rows.push(headers.join(sep));

    filteredLogs.forEach(l => {
      const isOff = l.isDayOff ? 'Folga' : 'Trabalhado';
      const cCar = (l.carExpenses?.wash || 0) + (l.carExpenses?.toll || 0) + (l.carExpenses?.parking || 0) + (l.carExpenses?.publicCharging || 0) + (l.carExpenses?.maintenance || 0) + (l.carExpenses?.other || 0);
      const cFood = (l.foodExpenses?.lunch || 0) + (l.foodExpenses?.dinner || 0) + (l.foodExpenses?.snacks || 0) + (l.foodExpenses?.coffee || 0);
      const uTot = (l.appUber?.earnings || 0) + (l.appUber?.bonus || 0);
      const nTot = (l.app99?.earnings || 0) + (l.app99?.bonus || 0);
      const pTot = (l.appParticular?.earnings || 0);
      const extraTot = (l.recompensasExtra || 0) + (l.outrasFontes || 0);
      const fatBruto = uTot + nTot + pTot + extraTot;
      const despTot = (l.custoEnergia || 0) + (l.diariaCarro || 0) + cCar + cFood;
      const lucroLiq = fatBruto - despTot;

      const formatNum = (v: number | undefined | null) => (v !== undefined && v !== null ? Number(v).toFixed(2).replace('.', ',') : '0,00');

      const cols = [
        l.date,
        isOff,
        Number(l.kmRodado || 0).toFixed(1).replace('.', ','),
        l.sobrouBateria !== null && l.sobrouBateria !== undefined ? String(l.sobrouBateria) : '',
        formatNum(l.custoEnergia),
        formatNum(l.diariaCarro),
        formatNum(l.carExpenses?.wash),
        formatNum(l.carExpenses?.toll),
        formatNum(l.carExpenses?.parking),
        formatNum(l.carExpenses?.publicCharging),
        formatNum(l.carExpenses?.maintenance),
        formatNum(l.carExpenses?.other),
        formatNum(cCar),
        formatNum(l.foodExpenses?.lunch),
        formatNum(l.foodExpenses?.dinner),
        formatNum(l.foodExpenses?.snacks),
        formatNum(l.foodExpenses?.coffee),
        formatNum(cFood),
        String(l.appUber?.rides || 0),
        formatNum(l.appUber?.earnings),
        formatNum(l.appUber?.bonus),
        formatNum(uTot),
        String(l.app99?.rides || 0),
        formatNum(l.app99?.earnings),
        formatNum(l.app99?.bonus),
        formatNum(nTot),
        String(l.appParticular?.rides || 0),
        formatNum(l.appParticular?.earnings),
        formatNum(l.recompensasExtra),
        formatNum(l.outrasFontes),
        formatNum(fatBruto),
        formatNum(despTot),
        formatNum(lucroLiq),
        formatNum(l.valorKwh),
        formatNum(l.capacidadeBateria)
      ];

      rows.push(cols.map(c => `"${c}"`).join(sep));
    });

    if (relevantFixedExpenses.length > 0) {
      rows.push('');
      rows.push('--- DESPESAS FIXAS MENSAIS CADASTRADAS ---');
      rows.push(['Mês', 'Nome da Despesa', 'Valor (R$)', 'Parcelas'].join(sep));
      relevantFixedExpenses.forEach(exp => {
        rows.push([
          `"${exp.monthKey || 'Geral'}"`,
          `"${exp.name}"`,
          `"${Number(exp.value).toFixed(2).replace('.', ',')}"`,
          `"${exp.installments || '-'}"`
        ].join(sep));
      });
    }

    if (carProfile && carProfile.modelName) {
      rows.push('');
      rows.push('--- DADOS DO VEÍCULO ---');
      rows.push(['Modelo', 'Placa', 'Ano', 'Cor', 'Tipo', 'Capacidade Bateria (kWh)', 'Autonomia (km)', 'Custo kWh (R$)'].join(sep));
      rows.push([
        `"${carProfile.modelName || '-'}"`,
        `"${carProfile.licensePlate || '-'}"`,
        `"${carProfile.manufactureYear || '-'}"`,
        `"${carProfile.color || '-'}"`,
        `"${carProfile.vehicleType || '-'}"`,
        `"${Number(carProfile.batteryCapacityKwh || 0).toFixed(2).replace('.', ',')}"`,
        `"${Number(carProfile.estimatedAutonomyKm || 0).toFixed(1).replace('.', ',')}"`,
        `"${Number(carProfile.kwhCostRate || 0).toFixed(2).replace('.', ',')}"`
      ].join(sep));
    }

    return BOM + rows.join('\r\n');
  };

  // Gerador de JSON (Backup Integral do Sistema)
  const generateJSON = (): string => {
    const payload = {
      versaoBackup: '2.0',
      dataExportacao: new Date().toISOString(),
      escopo: scope,
      periodoRotulo: getRangeLabel(),
      perfilVeiculo: carProfile,
      despesasFixasPorMes: effectiveFixedExpensesByMonth,
      despesasFixasEscopo: relevantFixedExpenses,
      lancamentosDiarios: filteredLogs,
      resumo: {
        totalDias: filteredLogs.length,
        totalDespesasFixas: relevantFixedExpenses.length,
        valorTotalDespesasFixas: totalFixedVal
      }
    };
    return JSON.stringify(payload, null, 2);
  };

  const getPreparedContent = () => {
    if (format === 'excel') {
      return {
        content: generateCSV(),
        type: 'text/csv;charset=utf-8;',
        extension: 'csv'
      };
    } else {
      return {
        content: generateJSON(),
        type: 'application/json;charset=utf-8;',
        extension: 'json'
      };
    }
  };

  const hasData = filteredLogs.length > 0 || relevantFixedExpenses.length > 0;

  // Baixar / Gravar no Celular ou Navegador
  const handleDownload = async () => {
    console.log('handleDownload: Iniciando');
    if (!hasData) {
      alert("Nenhum dado encontrado no período selecionado.");
      return;
    }

    const { content, type, extension } = getPreparedContent();
    const fileName = getExportFileName(extension);
    const mime = extension === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;';

    // 1. Tentar Capacitor Native (Salvar Direto no Dispositivo) - Ideal para APK Android
    const isCapacitorNative = Boolean((window as any)?.Capacitor?.isNativePlatform?.());
    if (isCapacitorNative && typeof Filesystem !== 'undefined') {
      try {
        console.log('Tentando salvamento direto via Capacitor Filesystem...');
        
        // Grava o arquivo direto na pasta de Documentos do celular
        await Filesystem.writeFile({
          path: fileName,
          data: content,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });

        alert(`Arquivo salvo com sucesso na pasta de Documentos!\nNome: ${fileName}`);

        setDownloadSuccess(true);
        if (typeof setSuccessMessage === 'function') {
          setSuccessMessage(`Salvo em Documentos: ${fileName}`);
        }
        return;
      } catch (nativeErr: any) {
        console.warn('Falha ao salvar direto no Filesystem, tentando alternativas:', nativeErr);
      }
    }

    // 2. Tentar Web Share API (Fallback)
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      try {
        const file = new File([content], fileName, { type: mime });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Backup', text: 'Backup' });
          setDownloadSuccess(true);
          return;
        }
      } catch (e) { console.warn('WebShare falhou', e); }
    }

    // 3. Tentar Download Tradicional (Browser/Computador)
    try {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      if (typeof setSuccessMessage === 'function') {
        setSuccessMessage('Download iniciado!');
      }
      return;
    } catch (e) {
      console.warn('Download via link falhou', e);
      alert('Não foi possível realizar o download automático.');
    }
  };

  // Copiar para área de transferência
  const handleCopyText = async () => {
    if (!hasData) return;
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
      setSuccessMessage('Conteúdo copiado para a área de transferência!');
      setTimeout(() => {
        setCopied(false);
        setSuccessMessage(null);
      }, 3000);
    } catch (_) {}
  };

  // Enviar resumo direto no WhatsApp
  const handleOpenWhatsApp = () => {
    if (!hasData) {
      alert("Nenhum lançamento ou despesa fixa no período selecionado.");
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
📌 *Despesas Fixas:* R$ ${totalFixedVal.toFixed(2)} (${relevantFixedExpenses.length} contas)
📉 *Despesas Variáveis:* R$ ${totalDesp.toFixed(2)}
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

  // ==========================================
  // PARSER DE IMPORTAÇÃO DIRETO E RESILIENTE
  // ==========================================
  const parseImportFile = async (file: File) => {
    setIsProcessingImport(true);
    setImportError(null);
    setParsedImportData(null);

    try {
      const fileName = file.name.toLowerCase();

      // 1. Arquivo JSON de Backup
      if (fileName.endsWith('.json')) {
        const text = await file.text();
        const json = JSON.parse(text);
        processJSONImport(json, file.name);
        setIsProcessingImport(false);
        return;
      }

      // 2. Arquivo Excel (.xlsx, .xls) ou CSV (.csv)
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      processWorkbookImport(workbook, file.name);
      setIsProcessingImport(false);
    } catch (err: any) {
      console.error(err);
      setImportError(`Erro ao ler arquivo: ${err.message || 'Formato incompatível'}`);
      setIsProcessingImport(false);
    }
  };

  const processPastedData = () => {
    if (!pastedText.trim()) {
      setImportError("Cole o texto ou JSON antes de processar.");
      return;
    }
    setIsProcessingImport(true);
    setImportError(null);

    try {
      let trimmed = pastedText.trim();
      
      // Remover markdown codeblocks se foi copiado com ```json ... ```
      if (trimmed.startsWith('```')) {
        trimmed = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      }

      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const json = JSON.parse(trimmed);
          processJSONImport(json, 'Texto Colado (JSON)');
          setIsProcessingImport(false);
          // Rolar até o botão de confirmação
          setTimeout(() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: 'smooth' });
            }
          }, 150);
          return;
        } catch (jsonErr: any) {
          console.warn("Falha direta JSON.parse, tentando sanitizar:", jsonErr);
        }
      }

      // Tentativa de ler planilha/tabela colada via XLSX
      try {
        const workbook = XLSX.read(trimmed, { type: 'string', raw: true });
        processWorkbookImport(workbook, 'Tabela Colada');
        setIsProcessingImport(false);
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: 'smooth' });
          }
        }, 150);
        return;
      } catch (xlsxErr: any) {
        console.warn("Falha XLSX read:", xlsxErr);
      }

      // Se falhou tudo
      setImportError("Não foi possível reconhecer o conteúdo colado. Verifique se copiou o JSON completo ou use a opção 'Arquivo' para carregar o .json.");
      setIsProcessingImport(false);
    } catch (err: any) {
      setImportError(`Não foi possível interpretar o texto: ${err.message || 'Verifique o formato'}`);
      setIsProcessingImport(false);
    }
  };

  const processJSONImport = (json: any, fileName: string) => {
    let rawLogs: any[] = [];
    if (Array.isArray(json)) {
      rawLogs = json;
    } else if (Array.isArray(json.lancamentosDiarios)) {
      rawLogs = json.lancamentosDiarios;
    } else if (Array.isArray(json.dailyLogs)) {
      rawLogs = json.dailyLogs;
    } else if (Array.isArray(json.logs)) {
      rawLogs = json.logs;
    } else if (Array.isArray(json.data)) {
      rawLogs = json.data;
    } else if (json.data && Array.isArray(json.data.dailyLogs)) {
      rawLogs = json.data.dailyLogs;
    } else if (json.data && Array.isArray(json.data.lancamentosDiarios)) {
      rawLogs = json.data.lancamentosDiarios;
    }

    if (rawLogs.length === 0) {
      throw new Error("Nenhum lançamento diário encontrado no JSON. Verifique a estrutura do arquivo.");
    }

    let totalEarnings = 0;
    const dailyLogs = rawLogs.map((item: any) => {
      const date = item.date || item.data || item.id;
      const isDayOff = Boolean(
        item.isDayOff !== undefined ? item.isDayOff :
        item.ehFolga !== undefined ? item.ehFolga :
        (item.status && String(item.status).toLowerCase().includes('folga') && !String(item.status).toLowerCase().includes('trabalhad'))
      );

      const parsedKm = Number(item.kmRodado || item.km || 0);
      const parsedBat = Number(item.sobrouBateria !== undefined ? item.sobrouBateria : (item.bateriaRestantePct !== undefined ? item.bateriaRestantePct : 0));
      const parsedValKwh = Number(item.valorKwh || item.valorKwhUtilizadoNoDia || 0);
      const parsedCapBat = Number(item.capacidadeBateria || item.capacidadeBateriaKwh || 0);
      const parsedCustoEnergia = Number(item.custoEnergia || item.custoEnergiaTotal || 0);
      const parsedDiaria = Number(item.diariaCarro || 0);

      const carExpenses = {
        wash: Number(item.carExpenses?.wash || item.despesasCarro?.wash || item.despesasCarro?.lavaJato || 0),
        toll: Number(item.carExpenses?.toll || item.despesasCarro?.toll || item.despesasCarro?.pedagio || 0),
        parking: Number(item.carExpenses?.parking || item.despesasCarro?.parking || item.despesasCarro?.estacionamento || 0),
        publicCharging: Number(item.carExpenses?.publicCharging || item.despesasCarro?.publicCharging || item.despesasCarro?.recargaExterna || 0),
        maintenance: Number(item.carExpenses?.maintenance || item.despesasCarro?.maintenance || item.despesasCarro?.manutencao || 0),
        other: Number(item.carExpenses?.other || item.despesasCarro?.other || item.despesasCarro?.outros || 0),
      };

      const foodExpenses = {
        lunch: Number(item.foodExpenses?.lunch || item.despesasAlimentacao?.lunch || item.despesasAlimentacao?.almoco || 0),
        dinner: Number(item.foodExpenses?.dinner || item.despesasAlimentacao?.dinner || item.despesasAlimentacao?.jantar || 0),
        snacks: Number(item.foodExpenses?.snacks || item.despesasAlimentacao?.snacks || item.despesasAlimentacao?.lanches || 0),
        coffee: Number(item.foodExpenses?.coffee || item.despesasAlimentacao?.coffee || item.despesasAlimentacao?.cafe || 0),
      };

      const app99 = {
        rides: Number(item.app99?.rides !== undefined ? item.app99.rides : (item.ganhos99?.corridas || 0)),
        earnings: Number(item.app99?.earnings !== undefined ? item.app99.earnings : (item.ganhos99?.faturamento || 0)),
        bonus: Number(item.app99?.bonus !== undefined ? item.app99.bonus : (item.ganhos99?.bonus || 0)),
      };

      const appUber = {
        rides: Number(item.appUber?.rides !== undefined ? item.appUber.rides : (item.ganhosUber?.corridas || 0)),
        earnings: Number(item.appUber?.earnings !== undefined ? item.appUber.earnings : (item.ganhosUber?.faturamento || 0)),
        bonus: Number(item.appUber?.bonus !== undefined ? item.appUber.bonus : (item.ganhosUber?.bonus || 0)),
      };

      const appParticular = {
        rides: Number(item.appParticular?.rides !== undefined ? item.appParticular.rides : (item.ganhosParticular?.corridas || 0)),
        earnings: Number(item.appParticular?.earnings !== undefined ? item.appParticular.earnings : (item.ganhosParticular?.faturamento || 0)),
      };

      const recomp = Number(item.recompensasExtra || 0);
      const outras = Number(item.outrasFontes || item.anjo || 0);
      const diaBruto = (app99.earnings + app99.bonus) + (appUber.earnings + appUber.bonus) + appParticular.earnings + recomp + outras;
      totalEarnings += diaBruto;

      return {
        id: date,
        date,
        isDayOff,
        kmRodado: parsedKm,
        sobrouBateria: parsedBat,
        valorKwh: parsedValKwh,
        capacidadeBateria: parsedCapBat,
        custoEnergia: parsedCustoEnergia,
        diariaCarro: parsedDiaria,
        carExpenses,
        foodExpenses,
        app99,
        appUber,
        appParticular,
        recompensasExtra: recomp,
        outrasFontes: outras,
        exibirNoGeral: item.exibirNoGeral !== undefined ? item.exibirNoGeral : true
      };
    }).filter(l => Boolean(l.date && /^\d{4}-\d{2}-\d{2}$/.test(l.date)));

    const fixedExpenses: any[] = [];
    if (json.despesasFixasEscopo && Array.isArray(json.despesasFixasEscopo)) {
      fixedExpenses.push(...json.despesasFixasEscopo);
    } else if (json.despesasFixasPorMes && typeof json.despesasFixasPorMes === 'object') {
      Object.entries(json.despesasFixasPorMes).forEach(([m, arr]: [string, any]) => {
        if (Array.isArray(arr)) {
          arr.forEach(item => fixedExpenses.push({ ...item, monthKey: m }));
        }
      });
    }

    setParsedImportData({
      dailyLogs,
      fixedExpenses,
      carProfile: json.perfilVeiculo || undefined,
      totalEarnings,
      fileName
    });
  };

  const processWorkbookImport = (workbook: XLSX.WorkBook, fileName: string) => {
    let allRows: any[] = [];
    let detectedFixed: any[] = [];

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (rawData && rawData.length > 0) {
        allRows.push(...rawData);
      }
    });

    if (allRows.length === 0) {
      throw new Error("A planilha está vazia ou não contém linhas de dados legíveis.");
    }

    let totalEarnings = 0;
    const dailyLogsMap = new Map<string, any>();

    const normalizeNumber = (val: any): number => {
      if (val === undefined || val === null || val === '') return 0;
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      let s = String(val).replace(/R\$|\s/g, '').trim();
      if (s.includes(',') && s.includes('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else if (s.includes(',')) {
        s = s.replace(',', '.');
      }
      const parsed = parseFloat(s);
      return isNaN(parsed) ? 0 : parsed;
    };

    const parseRowDate = (val: any): string | null => {
      if (!val) return null;
      if (val instanceof Date) {
        return val.toISOString().slice(0, 10);
      }
      const str = String(val).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
      const matchBr = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
      if (matchBr) {
        const d = matchBr[1].padStart(2, '0');
        const m = matchBr[2].padStart(2, '0');
        let y = matchBr[3];
        if (y.length === 2) y = '20' + y;
        return `${y}-${m}-${d}`;
      }
      return null;
    };

    allRows.forEach((row: any) => {
      let foundDate: string | null = null;
      for (const [key, val] of Object.entries(row)) {
        const lKey = key.toLowerCase();
        if (lKey.includes('data') || lKey === 'date' || lKey === 'dia') {
          foundDate = parseRowDate(val);
          if (foundDate) break;
        }
      }

      if (!foundDate) {
        for (const val of Object.values(row)) {
          foundDate = parseRowDate(val);
          if (foundDate) break;
        }
      }

      if (!foundDate) return;

      let km = 0, bat = 0, uFat = 0, uRides = 0, uBon = 0, nFat = 0, nRides = 0, nBon = 0, partFat = 0, partRides = 0;
      let wash = 0, toll = 0, park = 0, charge = 0, maint = 0, otherCar = 0;
      let lunch = 0, dinner = 0, snacks = 0, coffee = 0;
      let custoEnergia = 0, diariaCarro = 0, recomp = 0, outras = 0;
      let isOff = false;

      for (const [key, val] of Object.entries(row)) {
        const k = key.toLowerCase();
        const num = normalizeNumber(val);

        if (k.includes('folga') || k.includes('status')) {
          const sVal = String(val).toLowerCase();
          if (sVal.includes('folga') && !sVal.includes('trabalhad')) isOff = true;
        }

        if (k.includes('km') || k.includes('quilometr')) km = num;
        else if (k.includes('bateria') || k.includes('sobrou') || k.includes('soc')) bat = num;
        else if (k.includes('energia') || k.includes('recarga total') || k.includes('custo eletric')) custoEnergia = num;
        else if (k.includes('diaria') || k.includes('locaç') || k.includes('aluguel')) diariaCarro = num;

        // Uber
        else if (k.includes('uber') && (k.includes('bruto') || k.includes('faturam') || k.includes('ganho') || k.includes('valor') || k.includes('total'))) uFat = num;
        else if (k.includes('uber') && (k.includes('corrida') || k.includes('viagen') || k.includes('qtd'))) uRides = num;
        else if (k.includes('uber') && k.includes('bônus')) uBon = num;

        // 99
        else if (k.includes('99') && (k.includes('bruto') || k.includes('faturam') || k.includes('ganho') || k.includes('valor') || k.includes('total'))) nFat = num;
        else if (k.includes('99') && (k.includes('corrida') || k.includes('viagen') || k.includes('solicita') || k.includes('qtd'))) nRides = num;
        else if (k.includes('99') && k.includes('bônus')) nBon = num;

        // Particular
        else if (k.includes('particular') || k.includes('privado')) partFat = num;

        // Despesas Carro
        else if (k.includes('lava') || k.includes('lavagem')) wash = num;
        else if (k.includes('pedagio') || k.includes('pedágio')) toll = num;
        else if (k.includes('estacion')) park = num;
        else if (k.includes('recarga pub') || k.includes('eletroposto')) charge = num;
        else if (k.includes('manuten')) maint = num;

        // Alimentação
        else if (k.includes('almoço') || k.includes('almoco')) lunch = num;
        else if (k.includes('jantar')) dinner = num;
        else if (k.includes('lanche')) snacks = num;
        else if (k.includes('café') || k.includes('cafe')) coffee = num;
      }

      const diaBruto = (uFat + uBon) + (nFat + nBon) + partFat + recomp + outras;
      totalEarnings += diaBruto;

      dailyLogsMap.set(foundDate, {
        id: foundDate,
        date: foundDate,
        isDayOff: isOff,
        kmRodado: km,
        sobrouBateria: bat,
        valorKwh: carProfile?.kwhCostRate || 1.05,
        capacidadeBateria: carProfile?.batteryCapacityKwh || 53.6,
        custoEnergia,
        diariaCarro,
        carExpenses: { wash, toll, parking: park, publicCharging: charge, maintenance: maint, other: otherCar },
        foodExpenses: { lunch, dinner, snacks, coffee },
        app99: { rides: nRides, earnings: nFat, bonus: nBon },
        appUber: { rides: uRides, earnings: uFat, bonus: uBon },
        appParticular: { rides: partRides, earnings: partFat },
        recompensasExtra: recomp,
        outrasFontes: outras,
        exibirNoGeral: true
      });
    });

    const dailyLogs = Array.from(dailyLogsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    if (dailyLogs.length === 0) {
      throw new Error("Nenhuma data ou lançamento diário reconhecido na planilha.");
    }

    setParsedImportData({
      dailyLogs,
      fixedExpenses: detectedFixed,
      carProfile: undefined,
      totalEarnings,
      fileName
    });
  };

  const handleApplyImport = () => {
    if (!parsedImportData || parsedImportData.dailyLogs.length === 0) return;

    if (onImportData) {
      onImportData(
        parsedImportData.dailyLogs,
        parsedImportData.fixedExpenses,
        parsedImportData.carProfile
      );
    }

    setSuccessMessage(`Importação concluída! ${parsedImportData.dailyLogs.length} dias atualizados com sucesso.`);
    setTimeout(() => {
      setParsedImportData(null);
      setSuccessMessage(null);
      onClose();
    }, 2000);
  };

  const handleLoadDefaultCompleteBackup = () => {
    setIsProcessingImport(true);
    setImportError(null);
    try {
      const dailyLogs = DEFAULT_DAILY_LOGS;
      const fixedExpenses = Object.values(DEFAULT_FIXED_EXPENSES_BY_MONTH).flat();
      const carProfile = DEFAULT_CAR_PROFILE;
      const totalEarnings = dailyLogs.reduce((acc, l) => {
        const u = (l.appUber?.earnings || 0) + (l.appUber?.bonus || 0);
        const n = (l.app99?.earnings || 0) + (l.app99?.bonus || 0);
        const p = (l.appParticular?.earnings || 0);
        const r = (l.recompensasExtra || 0) + (l.outrasFontes || 0);
        return acc + u + n + p + r;
      }, 0);

      setParsedImportData({
        dailyLogs,
        fixedExpenses,
        carProfile,
        totalEarnings,
        fileName: 'Backup Integrado GKD (365 Dias - 2026).json'
      });
      setTimeout(() => {
        if (confirmButtonRef.current) {
          confirmButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } catch (e: any) {
      setImportError(e?.message || 'Erro ao carregar backup integrado');
    } finally {
      setIsProcessingImport(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-scale-up flex flex-col max-h-[96vh] h-[92vh] sm:h-auto">
        
        {/* Header Principal */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-zinc-900 border border-zinc-700/80 rounded-xl flex items-center justify-center shadow-sm">
              <GkdMobilityLogo className="w-8 h-8 rounded-lg" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100">Central de Backup & Importação</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-black font-extrabold shadow-sm">
                  100% dos Dados
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Exportação completa, restauração e planilhas integradas</p>
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

        {/* Seletor de Aba: Backup (Exportar) vs Importar Dados */}
        <div className="px-4 pt-3 pb-1 bg-zinc-950 border-b border-zinc-800/80 shrink-0">
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveMainTab('backup')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeMainTab === 'backup'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Fazer Backup (Exportar)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('import')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeMainTab === 'import'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Importar & Restaurar</span>
            </button>
          </div>
        </div>

        {/* Conteúdo com Scroll */}
        <div ref={scrollContainerRef} className="p-4 overflow-y-auto space-y-4 flex-1">

          {/* ========================================= */}
          {/* ABA 1: FAZER BACKUP / EXPORTAR            */}
          {/* ========================================= */}
          {activeMainTab === 'backup' && (
            <>
              {/* Formato do Arquivo */}
              <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-2">
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block">
                  Formato do Arquivo
                </label>
                <div className="grid grid-cols-2 gap-2">
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

              {/* Card Visual de Despesas Fixas Inclusas */}
              <div className="p-3 bg-zinc-900/60 border border-purple-500/30 rounded-xl space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-200 block">Despesas Fixas Inclusas no Arquivo</span>
                      <span className="text-[10px] text-zinc-400 block">
                        {relevantFixedExpenses.length > 0 
                          ? `${relevantFixedExpenses.length} conta(s) fixa(s) identificada(s)` 
                          : 'Nenhuma despesa fixa salva'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-purple-300 font-mono block">
                      R$ {totalFixedVal.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-emerald-400 font-bold flex items-center justify-end gap-1">
                      <Check className="w-3 h-3 inline" /> Salvo no backup
                    </span>
                  </div>
                </div>

                {relevantFixedExpenses.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {relevantFixedExpenses.slice(0, 10).map((exp, idx) => (
                      <span key={exp.id || idx} className="text-[10px] bg-purple-950/60 border border-purple-800/50 text-purple-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <span>{exp.name}:</span>
                        <strong className="font-mono text-purple-100">R$ {Number(exp.value).toFixed(2)}</strong>
                        {exp.installments && <span className="text-[9px] text-zinc-400">({exp.installments})</span>}
                      </span>
                    ))}
                    {relevantFixedExpenses.length > 10 && (
                      <span className="text-[10px] text-zinc-400 self-center">
                        +{relevantFixedExpenses.length - 10} outras...
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Resumo do Backup */}
              <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-zinc-200 block">{getRangeLabel()}</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-zinc-400">
                      {filteredLogs.length} dia(s) • {relevantFixedExpenses.length} despesa(s) fixa(s) • Dados do Carro
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 rounded font-bold">
                      {getExportFileName(format === 'excel' ? 'csv' : 'json')}
                    </span>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-emerald-600 font-mono text-xs text-white font-extrabold shrink-0 ml-2 shadow-sm">
                  {filteredLogs.length} dias
                </div>
              </div>

              {/* Botões de Ação de Backup */}
              <div className="space-y-2.5 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  
                  {/* 1. Salvar Arquivo de Backup */}
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!hasData}
                    className="p-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer shadow-lg shadow-emerald-950/50"
                  >
                    {downloadSuccess ? <Check className="w-5 h-5 text-white" /> : <Download className="w-5 h-5 text-white" />}
                    <div className="text-left">
                      <span className="text-sm font-bold block">{downloadSuccess ? 'Salvo com Sucesso!' : `Salvar .${format === 'excel' ? 'csv' : 'json'} no Celular`}</span>
                      <span className="text-[10px] font-normal text-emerald-100">Downloads, Documentos ou Drive</span>
                    </div>
                  </button>

                  {/* 2. Enviar no WhatsApp Direto */}
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    disabled={!hasData}
                    className="p-3.5 bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/40 active:scale-95 cursor-pointer"
                  >
                    <MessageCircle className="w-5 h-5 fill-white shrink-0" />
                    <div className="text-left">
                      <span className="text-sm font-bold block">Enviar no WhatsApp</span>
                      <span className="text-[10px] font-normal text-white/90">Resumo completo formatado</span>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ========================================= */}
          {/* ABA 2: IMPORTAR & RESTAURAR DADOS         */}
          {/* ========================================= */}
          {activeMainTab === 'import' && (
            <div className="space-y-3.5 animate-fade-in">

              {/* Opção Rápida: Backup Completo Integrado */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-950/60 to-zinc-900/80 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <strong className="text-xs font-bold text-emerald-200">Backup Integrado Salvo no App</strong>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Histórico completo de 365 dias (Jan a Dez/2026), BYD D1 e parcelas fixas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLoadDefaultCompleteBackup}
                  disabled={isProcessingImport}
                  className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Restaurar Agora</span>
                </button>
              </div>
              
              {/* Seletor de Arquivo vs Colar Texto */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportTab('file')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                    importTab === 'file'
                      ? 'bg-zinc-800 text-emerald-300 border border-emerald-500/40'
                      : 'bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Arquivo (.xlsx / .csv / .json)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImportTab('paste')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                    importTab === 'paste'
                      ? 'bg-zinc-800 text-emerald-300 border border-emerald-500/40'
                      : 'bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Colar Texto / JSON</span>
                </button>
              </div>

              {/* Upload de Arquivo */}
              {importTab === 'file' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-700 hover:border-emerald-500 bg-zinc-900/40 hover:bg-zinc-900/70 rounded-2xl p-6 text-center cursor-pointer transition-all group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) parseImportFile(file);
                    }}
                  />
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    {isProcessingImport ? (
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                  </div>
                  <p className="text-xs font-bold text-zinc-200 mb-1">
                    Toque para selecionar a Planilha ou Arquivo de Backup
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Formatos suportados: <strong className="text-emerald-300">.xlsx</strong>, <strong className="text-emerald-300">.csv</strong> ou <strong className="text-emerald-300">.json</strong>
                  </p>
                </div>
              )}

              {/* Colar Texto / JSON */}
              {importTab === 'paste' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Cole seu JSON de backup ou tabela completa:</span>
                    {typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const clip = await navigator.clipboard.readText();
                            if (clip) {
                              setPastedText(clip);
                              setImportError(null);
                            }
                          } catch (_) {}
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Colar da Área de Transferência</span>
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={6}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Cole aqui o conteúdo de um backup (.json), texto ou tabela copiada do Excel (suporta arquivos grandes sem travar)..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono resize-y max-h-60"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {pastedText ? `${(pastedText.length / 1024).toFixed(1)} KB digitados` : 'Sem limite de tamanho'}
                    </span>
                    {pastedText && (
                      <button
                        type="button"
                        onClick={() => { setPastedText(''); setImportError(null); }}
                        className="text-[11px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={processPastedData}
                    disabled={isProcessingImport || !pastedText.trim()}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    {isProcessingImport ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Processar Texto Colado</span>
                  </button>
                </div>
              )}

              {/* Erro de Importação */}
              {importError && (
                <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl flex items-center gap-2.5 text-xs text-red-200 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Prévia dos Dados Identificados */}
              {parsedImportData && (
                <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-200">
                        Dados Reconhecidos com Sucesso!
                      </span>
                    </div>
                    {parsedImportData.fileName && (
                      <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                        {parsedImportData.fileName}
                      </span>
                    )}
                  </div>

                  {/* Estatísticas Rápidas */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 bg-zinc-900/80 rounded-xl border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Lançamentos / Dias</span>
                      <strong className="text-sm font-bold text-zinc-100 font-mono">
                        {parsedImportData.dailyLogs.length} dias
                      </strong>
                    </div>

                    <div className="p-2.5 bg-zinc-900/80 rounded-xl border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Faturamento Total</span>
                      <strong className="text-sm font-bold text-emerald-400 font-mono">
                        R$ {parsedImportData.totalEarnings.toFixed(2)}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-zinc-900/80 rounded-xl border border-zinc-800 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-zinc-400 block">Despesas Fixas</span>
                      <strong className="text-sm font-bold text-purple-300 font-mono">
                        {parsedImportData.fixedExpenses.length} conta(s)
                      </strong>
                    </div>
                  </div>

                  {/* Veículo Identificado */}
                  {parsedImportData.carProfile && (
                    <div className="p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-emerald-400" />
                        <span className="text-zinc-300 font-medium">
                          {parsedImportData.carProfile.modelName || 'Veículo'} ({parsedImportData.carProfile.licensePlate || '-'})
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold">Perfil Atualizado</span>
                    </div>
                  )}

                  {/* Botão de Confirmação e Restauração */}
                  <button
                    ref={confirmButtonRef}
                    type="button"
                    onClick={handleApplyImport}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 cursor-pointer active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirmar e Restaurar {parsedImportData.dailyLogs.length} Lançamentos</span>
                  </button>
                </div>
              )}

              {/* Atalho para Mapeador Avançado de Colunas */}
              {onOpenImport && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenImport();
                    }}
                    className="w-full p-2.5 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 rounded-xl flex items-center justify-between text-zinc-300 text-xs transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>Abrir Assistente Avançado de Mapeamento de Planilhas</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
              )}

            </div>
          )}

          {/* Feedback Toast / Status */}
          {successMessage && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl flex items-center gap-2.5 text-xs text-emerald-200 font-semibold animate-fade-in shadow-lg">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-zinc-500 pl-1">
            GKD Controle Diário • Sistema de Backup Seguro
          </span>
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
