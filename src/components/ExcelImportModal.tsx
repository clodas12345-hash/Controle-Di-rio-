import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Table,
  Calendar,
  DollarSign,
  TrendingUp,
  Search,
  Database,
  ArrowRight,
  ArrowLeft,
  Receipt,
  Car
} from 'lucide-react';
import { GkdMobilityLogo } from './GkdMobilityLogo';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  onImportData: (logs: any[], fixedExpenses?: any[], carProfile?: any) => void;
  carProfile?: any;
}

interface ParsedResult {
  sheetName: string;
  data: any[];
  fixedExpenses?: any[];
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onBack,
  onImportData,
  carProfile: initialCarProfile
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ParsedResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{ 
    datesFound: number; 
    totalEarnings: number; 
    fixedExpensesFound: number;
    carModelFound?: string;
  } | null>(null);
  const [mappingInfo, setMappingInfo] = useState<{[key: string]: any}>({});
  const [directBackupData, setDirectBackupData] = useState<{
    dailyLogs: any[];
    fixedExpenses: any[];
    carProfile?: any;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Extração direta de arquivos JSON de backup completo (100% de integridade)
  const extractBackupDataDirectly = (json: any): { dailyLogs: any[]; fixedExpenses: any[]; carProfile?: any } => {
    let rawLogs: any[] = [];
    if (Array.isArray(json)) {
      rawLogs = json;
    } else if (Array.isArray(json.lancamentosDiarios)) {
      rawLogs = json.lancamentosDiarios;
    } else if (Array.isArray(json.logs)) {
      rawLogs = json.logs;
    }

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
        anjo: outras,
        exibirNoGeral: true
      };
    }).filter((l: any) => Boolean(l.date));

    // Despesas fixas
    const fixedExpenses: any[] = [];
    if (Array.isArray(json.despesasFixasLista)) {
      json.despesasFixasLista.forEach((f: any) => {
        const name = f.name || f.nome || '';
        const val = f.value !== undefined ? f.value : f.valor;
        if (name && val !== undefined) {
          fixedExpenses.push({
            id: f.id || `f-${Math.random()}`,
            name: String(name).trim(),
            value: Number(val),
            monthKey: f.monthKey || f.mes || undefined,
            installments: f.installments || f.parcelas || undefined
          });
        }
      });
    } else if (json.despesasFixasPorMes && typeof json.despesasFixasPorMes === 'object') {
      Object.entries(json.despesasFixasPorMes).forEach(([mKey, list]: [string, any]) => {
        if (Array.isArray(list)) {
          list.forEach((f: any) => {
            const name = f.name || f.nome || '';
            const val = f.value !== undefined ? f.value : f.valor;
            if (name && val !== undefined) {
              fixedExpenses.push({
                id: f.id || `f-${Math.random()}`,
                name: String(name).trim(),
                value: Number(val),
                monthKey: mKey,
                installments: f.installments || f.parcelas || undefined
              });
            }
          });
        }
      });
    }

    // Perfil do Carro
    let carProfile: any = undefined;
    const cp = json.dadosDoVeiculo || json.carProfile;
    if (cp && typeof cp === 'object') {
      carProfile = {
        vehicleType: cp.vehicleType || (cp.tipoVeiculo === 'combustao' ? 'combustao' : 'eletrico'),
        modelName: cp.modelName || cp.modelo || '',
        licensePlate: cp.licensePlate || cp.placa || '',
        manufactureYear: cp.manufactureYear || cp.anoFabricacao || '',
        color: cp.color || cp.cor || '',
        ownershipType: cp.ownershipType || cp.tipoPropriedade || 'alugado',
        currentKm: Number(cp.currentKm !== undefined ? cp.currentKm : (cp.kmAtualOdometro || 0)),
        batteryCapacityKwh: Number(cp.batteryCapacityKwh !== undefined ? cp.batteryCapacityKwh : (cp.capacidadeBateriaOuTanque || 0)),
        estimatedAutonomyKm: Number(cp.estimatedAutonomyKm !== undefined ? cp.estimatedAutonomyKm : (cp.autonomiaEstimadaKm || 0)),
        kwhCostRate: Number(cp.kwhCostRate !== undefined ? cp.kwhCostRate : (cp.valorPagoPelaEnergiaOuCombustivel || 0)),
        rentalOrWeeklyRate: Number(cp.rentalOrWeeklyRate !== undefined ? cp.rentalOrWeeklyRate : (cp.valorAluguelSemanal || 0)),
        monthlyCarExpense: Number(cp.monthlyCarExpense !== undefined ? cp.monthlyCarExpense : (cp.despesaMensalCarroEstimada || 0)),
        workScheduleType: cp.workScheduleType || cp.escalaTrabalho || 'mon_to_sat_sundays_off',
        customWorkDays: cp.customWorkDays || cp.diasTrabalhoPersonalizados || {},
        insurerName: cp.insurerName || cp.seguradora || '',
        insurancePolicyNumber: cp.insurancePolicyNumber || cp.apoliceSeguro || '',
        nextMaintenanceKm: cp.nextMaintenanceKm || cp.proximaManutencaoKm || '',
        notes: cp.notes || cp.observacoesNotas || ''
      };
    }

    return { dailyLogs, fixedExpenses, carProfile };
  };

  const parseBackupJsonToRows = (json: any): any[][] => {
    const rows: any[][] = [];

    // Se o JSON contém despesas fixas
    const fixedList = json.despesasFixasLista || 
      (json.despesasFixasPorMes && typeof json.despesasFixasPorMes === 'object'
        ? Object.entries(json.despesasFixasPorMes).flatMap(([mKey, list]: [string, any]) => 
            (Array.isArray(list) ? list : []).map(f => ({ ...f, monthKey: mKey }))
          )
        : []);

    if (Array.isArray(fixedList) && fixedList.length > 0) {
      rows.push(["DESPESAS FIXAS DO MÊS / CONTAS FIXAS", "", "", ""]);
      rows.push(["Despesa Fixa", "Valor (R$)", "Mês / Competência", "Parcelas"]);
      fixedList.forEach((f: any) => {
        const name = f.nome || f.name || '';
        const val = f.valor !== undefined ? f.valor : f.value;
        const month = f.mes || f.monthKey || '';
        const inst = f.parcelas || f.installments || '';
        if (name && val !== undefined) {
          rows.push([name, val, month, inst]);
        }
      });
      rows.push(["Total Despesas Fixas", "", "", ""]);
      rows.push(["", "", "", ""]);
    }

    // Se o JSON contém lançamentos diários
    const dailyList = json.lancamentosDiarios || (Array.isArray(json) ? json : []);
    if (Array.isArray(dailyList) && dailyList.length > 0) {
      rows.push([
        "Data", "Dia da Semana", "Status", "KM Rodado", "Bateria Restante (%)",
        "Valor kWh", "Custo Energia", "Diária Carro", "Despesas Carro", "Alimentação",
        "Qtd Corridas 99", "Total 99", "Qtd Corridas Uber", "Total Uber",
        "Qtd Corridas Particular", "Total Particular", "Recompensas", "Outros",
        "Faturamento Bruto", "Total Despesas", "Líquido"
      ]);

      dailyList.forEach((l: any) => {
        const date = l.data || l.date;
        if (!date) return;
        const km = l.kmRodado || 0;
        const bat = l.bateriaRestantePct !== undefined ? l.bateriaRestantePct : (l.sobrouBateria || 0);
        const valKwh = l.valorKwh || 0;
        const custoEnergia = l.custoEnergia || 0;
        const diaria = l.diariaCarro || 0;
        const despCarro = (l.despesasCarro?.total !== undefined ? l.despesasCarro.total : (
          (l.carExpenses?.wash || 0) + (l.carExpenses?.toll || 0) + (l.carExpenses?.parking || 0) + (l.carExpenses?.publicCharging || 0) + (l.carExpenses?.maintenance || 0) + (l.carExpenses?.other || 0)
        ));
        const despAlim = (l.despesasAlimentacao?.total !== undefined ? l.despesasAlimentacao.total : (
          (l.foodExpenses?.lunch || 0) + (l.foodExpenses?.dinner || 0) + (l.foodExpenses?.snacks || 0) + (l.foodExpenses?.coffee || 0)
        ));
        const rides99 = l.ganhos99?.corridas !== undefined ? l.ganhos99.corridas : (l.app99?.rides || 0);
        const total99 = (l.ganhos99?.faturamento || l.app99?.earnings || 0) + (l.ganhos99?.bonus || l.app99?.bonus || 0);
        const ridesUber = l.ganhosUber?.corridas !== undefined ? l.ganhosUber.corridas : (l.appUber?.rides || 0);
        const totalUber = (l.ganhosUber?.faturamento || l.appUber?.earnings || 0) + (l.ganhosUber?.bonus || l.appUber?.bonus || 0);
        const ridesPart = l.ganhosParticular?.corridas !== undefined ? l.ganhosParticular.corridas : (l.appParticular?.rides || 0);
        const totalPart = l.ganhosParticular?.faturamento || l.appParticular?.earnings || 0;
        const recomp = l.recompensasExtra || 0;
        const outras = l.outrasFontes || 0;
        const bruto = l.resumoDia?.faturamentoBruto || (total99 + totalUber + totalPart + recomp + outras);
        const despTot = l.resumoDia?.totalDespesas || (custoEnergia + diaria + despCarro + despAlim);
        const liquido = l.resumoDia?.resultadoLiquido || (bruto - despTot);
        const status = l.status || (l.isDayOff ? "Folga" : "Trabalhado");

        rows.push([
          date, "", status, km, bat,
          valKwh, custoEnergia, diaria, despCarro, despAlim,
          rides99, total99, ridesUber, totalUber,
          ridesPart, totalPart, recomp, outras,
          bruto, despTot, liquido
        ]);
      });
    }

    return rows;
  };

  const parseExcels = async (files: FileList) => {
    setIsProcessing(true);
    setError(null);
    setResults([]);
    setImportSummary(null);

    try {
      const allFileResults: ParsedResult[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.name.toLowerCase().endsWith('.json')) {
          try {
            const text = await file.text();
            const json = JSON.parse(text);
            const direct = extractBackupDataDirectly(json);
            if (direct.dailyLogs.length > 0 || direct.fixedExpenses.length > 0) {
              setDirectBackupData(direct);
            }
            const rows = parseBackupJsonToRows(json);
            if (rows.length > 0) {
              allFileResults.push({
                sheetName: file.name,
                data: rows
              });
              continue;
            }
          } catch (jsonErr) {
            console.error("Erro ao ler JSON de backup:", jsonErr);
          }
        }

        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { cellDates: true });

        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          // Use raw: true to get Date objects if cellDates: true is used
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: null });
          if (jsonData.length > 0) {
            allFileResults.push({ 
              sheetName: files.length > 1 ? `${file.name} - ${sheetName}` : sheetName, 
              data: jsonData 
            });
          }
        });
      }

      setResults(allFileResults);
      processData(allFileResults);
    } catch (err) {
      console.error(err);
      setError('Erro ao ler os arquivos Excel ou JSON. Verifique se os arquivos não estão corrompidos.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasteData = () => {
    if (!pastedText.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    setResults([]);
    setImportSummary(null);
    
    try {
      const rawText = pastedText.trim();

      // Suporte direto para colar JSON de backup
      if (rawText.startsWith('{') || rawText.startsWith('[')) {
        try {
          const parsedJson = JSON.parse(rawText);
          const direct = extractBackupDataDirectly(parsedJson);
          if (direct.dailyLogs.length > 0 || direct.fixedExpenses.length > 0) {
            setDirectBackupData(direct);
          }
          const jsonRows = parseBackupJsonToRows(parsedJson);
          if (jsonRows.length > 0) {
            const pasteResults: ParsedResult[] = [{
              sheetName: 'Backup JSON Colado',
              data: jsonRows
            }];
            processData(pasteResults, direct);
            setIsProcessing(false);
            return;
          }
        } catch (_) {}
      }

      // Split by lines, then by tabs (standard for Excel/Sheets copy-paste)
      // If it doesn't look like TSV, try CSV (semicolon or comma)
      const lines = pastedText.split(/\r?\n/).filter(line => line.trim() !== '');
      
      // Detection of separator
      let separator = '\t';
      const firstLine = lines[0] || '';
      if (!firstLine.includes('\t')) {
        if (firstLine.includes(';')) separator = ';';
        else if (firstLine.includes(',')) separator = ',';
      }

      const data = lines.map(line => {
        return line.split(separator).map(cell => {
          const trimmed = cell.trim();
          // Try to clean up quotes
          return trimmed.replace(/^["']|["']$/g, '');
        });
      });
      
      const pasteResults: ParsedResult[] = [{
        sheetName: 'Dados Colados',
        data: data
      }];
      
      setDirectBackupData(null);
      processData(pasteResults);
    } catch (err) {
      console.error(err);
      setError('Erro ao processar os dados colados. Verifique se o formato está correto.');
    } finally {
      setIsProcessing(false);
    }
  };

  const processData = (allResults: ParsedResult[], explicitDirect?: any) => {
    const currentDirect = explicitDirect || directBackupData;
    if (currentDirect && (currentDirect.dailyLogs.length > 0 || currentDirect.fixedExpenses.length > 0)) {
      let totalEarnings = 0;
      currentDirect.dailyLogs.forEach((log: any) => {
        totalEarnings += ((log.appUber?.earnings || 0) + (log.app99?.earnings || 0) + (log.appParticular?.earnings || 0) + (log.recompensasExtra || 0) + (log.outrasFontes || 0));
      });
      setResults(allResults);
      setImportSummary({ 
        datesFound: currentDirect.dailyLogs.length, 
        totalEarnings, 
        fixedExpensesFound: currentDirect.fixedExpenses.length,
        carModelFound: currentDirect.carProfile?.modelName
      });
      return;
    }

    const { dailyLogs, fixedExpenses, carProfile, mappingInfo } = parseAllSheets(allResults);
    
    let totalEarnings = 0;
    dailyLogs.forEach(log => {
      totalEarnings += ((log.appUber?.earnings || 0) + (log.app99?.earnings || 0) + (log.appParticular?.earnings || 0) + (log.recompensasExtra || 0) + (log.outrasFontes || 0));
    });

    setResults(allResults);
    setMappingInfo(mappingInfo);
    setImportSummary({ 
      datesFound: dailyLogs.length, 
      totalEarnings, 
      fixedExpensesFound: fixedExpenses.length,
      carModelFound: carProfile?.modelName
    });
  };

  const parseAllSheets = (allResults: ParsedResult[]) => {
    const dailyLogsMap: { [date: string]: any } = {};
    const allFixedExpenses: any[] = [];
    const mappingInfo: {[key: string]: any} = {};
    let detectedCarProfile: any = undefined;

    allResults.forEach(sheet => {
      let headerIdx = -1;
      let headerRow: any[] = [];
      
      for (let i = 0; i < Math.min(sheet.data.length, 25); i++) {
        const row = sheet.data[i];
        if (!row || !Array.isArray(row)) continue;
        
        const rowStr = row.join(' ').toLowerCase();
        const isFixedHeader = (rowStr.includes('despesas do mês') || rowStr.includes('despesas do mes') || 
                              rowStr.includes('gastos fixos') || rowStr.includes('custos fixos') ||
                              rowStr.includes('resumo de despesas') || rowStr.includes('contas do mês') ||
                              rowStr.includes('contas do mes') || rowStr.includes('contas fixas') ||
                              rowStr.includes('despesas fixas') || rowStr.includes('custo mensal') ||
                              rowStr.includes('despesas mensais') || rowStr.includes('custos mensais') ||
                              rowStr.includes('fixas do mês') || rowStr.includes('fixas do mes'));
        
        if (isFixedHeader) continue;

        const keywords = row.filter(cell => /data|date|dia|uber|99|total|ganho|km|período|valor|receita|mês|mes|gasto|despesa|custo|saída|saida/i.test(String(cell)));
        const hasDateKeyword = row.some(cell => /^(data|date|dia|vencimento)$/i.test(String(cell)));
        
        // Stricter check: at least 3 keywords, or DATA/DATE + 1 other keyword
        if (keywords.length >= 3 || (hasDateKeyword && keywords.length >= 2)) {
          headerIdx = i;
          headerRow = row;
          break;
        }
      }

      if (headerIdx === -1 && sheet.data.length > 0) {
        headerRow = sheet.data[0];
        headerIdx = 0;
      }
      
      let dateIdx = headerRow.findIndex(h => /^(data|date)$/i.test(String(h)));
      if (dateIdx === -1) dateIdx = headerRow.findIndex(h => /data|date|dia|período|periodo|vencimento|tempo/i.test(String(h)));
      
      const ridesKeywordRegex = /viagem|corrida|chamada|solicitação|rides|viagens|corridas|solicitacoes|qtd|quant|quantidade|nº|numero|número|calls/i;

      const ridesUberIdx = headerRow.findIndex(h => ridesKeywordRegex.test(String(h)) && /uber|app1/i.test(String(h)));
      const rides99Idx = headerRow.findIndex(h => ridesKeywordRegex.test(String(h)) && /99|poup|pop|app2/i.test(String(h)));
      const ridesParticularIdx = headerRow.findIndex(h => 
        ridesKeywordRegex.test(String(h)) && /particular|direto|privado|private|client|part\/in drive|indrive/i.test(String(h))
      );
      const genericRidesIdx = headerRow.findIndex(h => 
        (ridesKeywordRegex.test(String(h)) || /qtd cor/i.test(String(h))) && 
        !/uber|99|pop|poup|particular|direto|privado|part\/in drive|indrive/i.test(String(h))
      );

      const uberIdx = headerRow.findIndex(h => /uber|app1/i.test(String(h)) && !ridesKeywordRegex.test(String(h)) && !/bônus|bonus|incentivo/i.test(String(h)));
      const app99Idx = headerRow.findIndex(h => /99|poup|pop|app2/i.test(String(h)) && !ridesKeywordRegex.test(String(h)) && !/bônus|bonus|incentivo/i.test(String(h)));
      const particularIdx = headerRow.findIndex(h => /particular|direto|privado|private|client|part\/in drive|indrive/i.test(String(h)) && !ridesKeywordRegex.test(String(h)));
      
      const totalIdx = headerRow.findIndex(h => 
        /total|ganho|fatur|valor|receita|líquido|liquido|bruto|faturamento|rendimento/i.test(String(h)) && 
        !/despesa|gasto|custo|expense|outros|uber|99|pop|poup|particular|direto|part\/in drive|indrive/i.test(String(h))
      );
      
      const kmIdx = headerRow.findIndex(h => /km|rodado|dist|quilom|odo|percorrido|distância|distancia|kilom/i.test(String(h)));
      
      const bonusUberIdx = headerRow.findIndex(h => (/bônus|bonus|incentivo|extra/i.test(String(h))) && /uber/i.test(String(h)));
      const bonus99Idx = headerRow.findIndex(h => (/bônus|bonus|incentivo|extra/i.test(String(h))) && /99|poup|pop/i.test(String(h)));
      
      const recompensasIdx = headerRow.findIndex(h => /recompensa|gorjeta|gratificação|gratificacao|tip/i.test(String(h)) && !/uber|99|poup|pop/i.test(String(h)));
      const outrasFontesIdx = headerRow.findIndex(h => /anjo|outras fontes|outros ganhos|outra fonte|anj|extra/i.test(String(h)));

      const washIdx = headerRow.findIndex(h => /lavagem|limpeza|wash|banho|lavado|ducha/i.test(String(h)));
      const tollIdx = headerRow.findIndex(h => /pedagio|pedágio|toll|ped|sem parar|conectcar|veloe|tags|tag/i.test(String(h)));
      const parkingIdx = headerRow.findIndex(h => /estacionamento|parking|estac|garagem|vaga/i.test(String(h)));
      const maintenanceIdx = headerRow.findIndex(h => /manutenção|manutencao|mecanico|mecânico|maintenance|manut|oficina|peças|pecas|pneu|revisão|revisao|óleo|oleo|filtro/i.test(String(h)));
      const publicChargingIdx = headerRow.findIndex(h => /carregamento|eletroposto|energia|recarga|eletrico|público|publico|combustível|combustivel|gasolina|etanol|diesel|posto|abastecimento|gas/i.test(String(h)));
      const otherExpIdx = headerRow.findIndex(h => /desp carro|desp\. carro|despesas carro|despesa carro|outras despesas|outros gastos|extra|despesas|despesa|gastos|gasto|custos|custo|diversos|saída|saida|outros|aluguel|locação|locacao|seguro|ipva|taxa|licenciamento|multa/i.test(String(h)));

      const lunchIdx = headerRow.findIndex(h => /almoço|almoco|lunch|refeição|refeicao/i.test(String(h)));
      const dinnerIdx = headerRow.findIndex(h => /jantar|janta|dinner/i.test(String(h)));
      const snackIdx = headerRow.findIndex(h => /lanche|snack|salgado/i.test(String(h)));
      const coffeeIdx = headerRow.findIndex(h => /café|cafe|coffee/i.test(String(h)));
      const foodTotalIdx = headerRow.findIndex(h => /alimentação|comida|food|alimentacao/i.test(String(h)));

      const statusIdx = headerRow.findIndex(h => /status|situa[cç][aã]o|folga|presen[cç]a/i.test(String(h)));
      const sobrouBatIdx = headerRow.findIndex(h => /bateria|soc|carga|sobrou/i.test(String(h)));
      const valorKwhIdx = headerRow.findIndex(h => /valor.*kwh|pre[cç]o.*kwh|tarifa/i.test(String(h)));
      const capBateriaIdx = headerRow.findIndex(h => /capacidade.*bateria|capacidade.*kwh/i.test(String(h)));
      const custoEnergiaIdx = headerRow.findIndex(h => /custo.*energia|custo.*combust|gasto.*energia/i.test(String(h)));
      const diariaCarroIdx = headerRow.findIndex(h => /di[aá]ria.*carro|diaria.*carro|loca[cç][aã]o.*di[aá]ria/i.test(String(h)));

      const parseMonthYear = (str: string) => {
        const months = ['janeiro', 'fevereiro', 'março', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const monthsAbbrev = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const lower = str.toLowerCase();
        let monthIdx = months.findIndex(m => lower.includes(m));
        if (monthIdx === -1) monthIdx = monthsAbbrev.findIndex(m => lower.includes(m));
        if (monthIdx === -1) {
          const numericMatch = str.match(/(0[1-9]|1[0-2])[\/\-]\d{2,4}/) || str.match(/\d{2,4}[\/\-](0[1-9]|1[0-2])/);
          if (numericMatch) {
            const part = numericMatch[1] || numericMatch[2];
            monthIdx = parseInt(part) - 1;
          }
        }
        const yearMatch = str.match(/\d{4}/) || str.match(/\d{2}/);
        if (monthIdx !== -1 && yearMatch) {
          let year = parseInt(yearMatch[0]);
          if (year < 100) year += 2000;
          return { month: monthIdx + 1, year };
        }
        return null;
      };

      const sheetContext = parseMonthYear(sheet.sheetName);

      mappingInfo[sheet.sheetName] = {
        date: dateIdx !== -1 ? headerRow[dateIdx] : 'Não encontrada',
        uber: uberIdx !== -1 ? headerRow[uberIdx] : 'Não encontrada',
        app99: app99Idx !== -1 ? headerRow[app99Idx] : 'Não encontrada',
        particular: particularIdx !== -1 ? headerRow[particularIdx] : 'Não encontrada',
        total: totalIdx !== -1 ? headerRow[totalIdx] : 'Não encontrada',
        km: kmIdx !== -1 ? headerRow[kmIdx] : 'Não encontrada',
        recompensas: recompensasIdx !== -1 ? headerRow[recompensasIdx] : 'Não detectado',
        outrasFontes: outrasFontesIdx !== -1 ? headerRow[outrasFontesIdx] : 'Não detectado',
        ridesFound: (ridesUberIdx !== -1 || rides99Idx !== -1 || ridesParticularIdx !== -1 || genericRidesIdx !== -1) ? 'Detectadas' : 'Não detectadas',
        expenses: (washIdx !== -1 || tollIdx !== -1 || parkingIdx !== -1 || maintenanceIdx !== -1 || otherExpIdx !== -1) ? 'Detectadas' : 'Não encontradas',
        charging: publicChargingIdx !== -1 ? 'Detectado' : 'Não detectado',
        food: (lunchIdx !== -1 || dinnerIdx !== -1 || snackIdx !== -1 || coffeeIdx !== -1 || foodTotalIdx !== -1) ? 'Detectadas' : 'Não encontradas',
        fixedFound: 0
      };

      let inFixedExpensesBlock = false;
      let sheetFixedCount = 0;
      for (let i = 0; i < sheet.data.length; i++) {
        const row = sheet.data[i] as any[];
        if (!row || row.length === 0 || row.every(c => c === null || c === undefined || String(c).trim() === '')) {
          inFixedExpensesBlock = false;
          continue;
        }

        // Check for Vehicle Profile block in backup CSV/Excel
        const rowStr = row.join(' ').toLowerCase();
        const isVehicleHeader = rowStr.includes('perfil e configuração do veículo') || 
                                rowStr.includes('perfil e configuracao do veiculo') || 
                                rowStr.includes('dados do veículo') || 
                                rowStr.includes('dados do veiculo');
        if (isVehicleHeader) {
          if (!detectedCarProfile) {
            detectedCarProfile = {
              vehicleType: 'eletrico',
              modelName: '',
              licensePlate: '',
              manufactureYear: '',
              color: '',
              ownershipType: 'alugado',
              currentKm: 0,
              batteryCapacityKwh: 0,
              estimatedAutonomyKm: 0,
              kwhCostRate: 0,
              rentalOrWeeklyRate: 0,
              monthlyCarExpense: 0,
              workScheduleType: 'mon_to_sat_sundays_off',
              customWorkDays: {},
              insurerName: '',
              insurancePolicyNumber: '',
              nextMaintenanceKm: '',
              notes: ''
            };
          }
          continue;
        }

        if (detectedCarProfile) {
          const firstCell = String(row[0] || '').toLowerCase().trim();
          const secondCell = row[1];
          if (firstCell.includes('modelo')) detectedCarProfile.modelName = String(secondCell || '').trim();
          else if (firstCell.includes('placa')) detectedCarProfile.licensePlate = String(secondCell || '').trim();
          else if (firstCell.includes('tipo de veículo') || firstCell.includes('tipo de veiculo')) {
            detectedCarProfile.vehicleType = String(secondCell || '').toLowerCase().includes('combust') ? 'combustao' : 'eletrico';
          }
          else if (firstCell.includes('odômetro') || firstCell.includes('odometro')) detectedCarProfile.currentKm = Math.round(parseCurrency(secondCell));
          else if (firstCell.includes('capacidade')) detectedCarProfile.batteryCapacityKwh = parseCurrency(secondCell);
          else if (firstCell.includes('autonomia')) detectedCarProfile.estimatedAutonomyKm = Math.round(parseCurrency(secondCell));
          else if (firstCell.includes('tarifa')) detectedCarProfile.kwhCostRate = parseCurrency(secondCell);
          else if (firstCell.includes('aluguel')) detectedCarProfile.rentalOrWeeklyRate = parseCurrency(secondCell);
          else if (firstCell.includes('despesa mensal')) detectedCarProfile.monthlyCarExpense = parseCurrency(secondCell);
          else if (firstCell.includes('escala')) detectedCarProfile.workScheduleType = String(secondCell || '').trim();
        }

        // Check for Fixed Expenses Header first, even if it's the headerIdx row
        const isTotalRow = rowStr.includes('total mês') || rowStr.includes('total mes') || rowStr.includes('valor total') || rowStr.includes('total geral');
        
        // Helper to check for food keywords
        const isFoodLabel = (str: string) => {
          const lower = str.toLowerCase();
          return /alimentação|alimentacao|almoço|almoco|jantar|lanche|café|cafe|comida|restaurante|ifood|uber eats|rappi|refeição|refeicao/i.test(lower);
        };

        const isFixedHeader = (rowStr.includes('despesas do mês') || rowStr.includes('despesas do mes') || 
                              rowStr.includes('gastos fixos') || rowStr.includes('custos fixos') ||
                              rowStr.includes('resumo de despesas') || rowStr.includes('contas do mês') ||
                              rowStr.includes('contas do mes') || rowStr.includes('contas fixas') ||
                              rowStr.includes('despesas fixas') || rowStr.includes('custo mensal') ||
                              rowStr.includes('despesas mensais') || rowStr.includes('custos mensais') ||
                              rowStr.includes('fixas do mês') || rowStr.includes('fixas do mes')) && !isTotalRow;
        
        if (isFixedHeader) {
          inFixedExpensesBlock = true;
          // Check if data is on the same row (horizontal list)
          row.forEach((cell, cellIdx) => {
            const val = row[cellIdx + 1];
            if (cell === null || cell === undefined) return;
            
            const cellStr = String(cell).toLowerCase().trim();
            if (['null', 'undefined', 'nan', ''].includes(cellStr)) return;

            const isLabelTotal = cellStr.includes('total') || cellStr.includes('soma');
            const isFood = isFoodLabel(cellStr);
            const isNumberOnly = /^\d+([.,]\d+)?$/.test(cellStr);

            if (val && !isNaN(parseCurrency(val)) && parseCurrency(val) > 0 && !isLabelTotal && !isFood && !isNumberOnly) {
              const label = String(cell).trim();
              sheetFixedCount++;
              allFixedExpenses.push({ 
                id: `imp-f-${Math.random()}`, 
                name: label, 
                value: parseCurrency(val) 
              });
            }
          });
          if (i === headerIdx) continue;
        }

        if (isTotalRow) {
          inFixedExpensesBlock = false;
          if (i === headerIdx) continue;
        }

        // Safety: if row has many numbers, it's likely a data row, not a fixed expense block
        const numbersInRow = row.filter(c => {
          if (typeof c === 'number') return true;
          if (typeof c === 'string' && /^\d+([.,]\d+)?$/.test(c.trim())) return true;
          return false;
        }).length;
        if (numbersInRow >= 3) {
          inFixedExpensesBlock = false;
        }

        if (i === headerIdx) continue;

        let dateStr = '';
        if (dateIdx !== -1 && row[dateIdx] !== null && row[dateIdx] !== undefined) {
          dateStr = normalizeDate(row[dateIdx]);
          if (!dateStr && sheetContext) {
            const val = parseInt(String(row[dateIdx]), 10);
            if (!isNaN(val) && val >= 1 && val <= 31) {
              dateStr = `${sheetContext.year}-${String(sheetContext.month).padStart(2, '0')}-${String(val).padStart(2, '0')}`;
            }
          }
        }
        
        if (!dateStr) {
          const foundDate = row.find(cell => {
            if (cell instanceof Date) return true;
            if (typeof cell === 'number' && cell > 40000 && cell < 60000) return true;
            const s = String(cell);
            return /^\d{1,2}\/\d{1,2}\/\d{2,4}$|^\d{4}-\d{2}-\d{2}$|^\d{1,2}-\d{1,2}-\d{2,4}$/.test(s);
          });
          if (foundDate) dateStr = normalizeDate(foundDate);
        }

        if (dateStr) {
          inFixedExpensesBlock = false;
          if (!dailyLogsMap[dateStr]) {
            dailyLogsMap[dateStr] = {
              id: dateStr, date: dateStr, isDayOff: false,
              appUber: { earnings: 0, rides: 0, bonus: 0 },
              app99: { earnings: 0, rides: 0, bonus: 0 },
              appParticular: { earnings: 0, rides: 0 },
              recompensasExtra: 0,
              outrasFontes: 0,
              anjo: 0,
              kmRodado: 0,
              carExpenses: { wash: 0, toll: 0, maintenance: 0, parking: 0, publicCharging: 0, other: 0 },
              foodExpenses: { lunch: 0, dinner: 0, snacks: 0, coffee: 0 },
              exibirNoGeral: true
            };
          }

          const log = dailyLogsMap[dateStr];

          // Reconhecimento de status folga
          if (statusIdx !== -1 && row[statusIdx] !== null && row[statusIdx] !== undefined) {
            const sStr = String(row[statusIdx]).toLowerCase();
            if (sStr.includes('folga') && !sStr.includes('trabalhad')) {
              log.isDayOff = true;
            }
          }

          // Reconhecimento de bateria, energia, tarifa e diária
          if (sobrouBatIdx !== -1 && row[sobrouBatIdx] !== null) {
            const bVal = parseCurrency(row[sobrouBatIdx]);
            if (bVal > 0) log.sobrouBateria = bVal;
          }
          if (valorKwhIdx !== -1 && row[valorKwhIdx] !== null) {
            const kVal = parseCurrency(row[valorKwhIdx]);
            if (kVal > 0) log.valorKwh = kVal;
          }
          if (capBateriaIdx !== -1 && row[capBateriaIdx] !== null) {
            const cVal = parseCurrency(row[capBateriaIdx]);
            if (cVal > 0) log.capacidadeBateria = cVal;
          }
          if (custoEnergiaIdx !== -1 && row[custoEnergiaIdx] !== null) {
            const eVal = parseCurrency(row[custoEnergiaIdx]);
            if (eVal > 0) log.custoEnergia = eVal;
          }
          if (diariaCarroIdx !== -1 && row[diariaCarroIdx] !== null) {
            const dVal = parseCurrency(row[diariaCarroIdx]);
            if (dVal > 0) log.diariaCarro = dVal;
          }

          let rowHasSpecificEarnings = false;
          if (uberIdx !== -1 && row[uberIdx] !== null) {
            const val = parseCurrency(row[uberIdx]);
            log.appUber.earnings += val;
            if (val > 0) rowHasSpecificEarnings = true;
          }
          if (app99Idx !== -1 && row[app99Idx] !== null) {
            const val = parseCurrency(row[app99Idx]);
            log.app99.earnings += val;
            if (val > 0) rowHasSpecificEarnings = true;
          }
          if (particularIdx !== -1 && row[particularIdx] !== null) {
            const val = parseCurrency(row[particularIdx]);
            log.appParticular.earnings += val;
            if (val > 0) rowHasSpecificEarnings = true;
          }
          
          if (totalIdx !== -1 && row[totalIdx] !== null && !rowHasSpecificEarnings) {
            log.appUber.earnings += parseCurrency(row[totalIdx]);
          }

          if (bonusUberIdx !== -1 && row[bonusUberIdx] !== null) log.appUber.bonus += parseCurrency(row[bonusUberIdx]);
          if (bonus99Idx !== -1 && row[bonus99Idx] !== null) log.app99.bonus += parseCurrency(row[bonus99Idx]);

          const parseRides = (val: any): number => {
            if (val === null || val === undefined || val === '') return 0;
            if (typeof val === 'number') return Math.floor(val);
            // Handle float-like strings like "3.0" or "3,0"
            const cleaned = String(val).replace(',', '.');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : Math.floor(parsed);
          };

          if (ridesUberIdx !== -1 && row[ridesUberIdx] !== null) log.appUber.rides += parseRides(row[ridesUberIdx]);
          if (rides99Idx !== -1 && row[rides99Idx] !== null) log.app99.rides += parseRides(row[rides99Idx]);
          if (ridesParticularIdx !== -1 && row[ridesParticularIdx] !== null) log.appParticular.rides += parseRides(row[ridesParticularIdx]);
          
          if (genericRidesIdx !== -1 && row[genericRidesIdx] !== null && log.appUber.rides === 0 && log.app99.rides === 0) {
            const genericR = parseRides(row[genericRidesIdx]);
            if (genericR > 0) {
              const uE = log.appUber.earnings;
              const nE = log.app99.earnings;
              const pE = log.appParticular.earnings;
              const totE = uE + nE + pE;
              if (totE > 0) {
                if (uE > 0 && nE === 0 && pE === 0) {
                  log.appUber.rides = genericR;
                } else if (nE > 0 && uE === 0 && pE === 0) {
                  log.app99.rides = genericR;
                } else if (pE > 0 && uE === 0 && nE === 0) {
                  log.appParticular.rides = genericR;
                } else {
                  const uShare = Math.round((uE / totE) * genericR);
                  log.appUber.rides = uE > 0 ? Math.max(1, uShare) : 0;
                  const remainingR = genericR - log.appUber.rides;
                  if (nE > 0 && pE > 0) {
                    log.app99.rides = Math.max(1, Math.round((nE / (nE + pE)) * remainingR));
                    log.appParticular.rides = Math.max(0, remainingR - log.app99.rides);
                  } else if (nE > 0) {
                    log.app99.rides = Math.max(1, remainingR);
                  } else if (pE > 0) {
                    log.appParticular.rides = Math.max(1, remainingR);
                  }
                }
              } else {
                log.appUber.rides = genericR;
              }
            }
          }

          // Se não há ganhos particulares (R$ 0,00), NUNCA deve haver corrida particular registrada
          if (log.appParticular.earnings <= 0 && log.appParticular.rides > 0) {
            const phantomR = log.appParticular.rides;
            log.appParticular.rides = 0;
            if (log.appUber.rides === 0 && log.app99.rides === 0) {
              if (log.appUber.earnings > 0 && log.app99.earnings === 0) {
                log.appUber.rides = phantomR;
              } else if (log.app99.earnings > 0 && log.appUber.earnings === 0) {
                log.app99.rides = phantomR;
              } else if (log.appUber.earnings > 0 && log.app99.earnings > 0) {
                const totalE = log.appUber.earnings + log.app99.earnings;
                log.appUber.rides = Math.max(1, Math.round((log.appUber.earnings / totalE) * phantomR));
                log.app99.rides = Math.max(1, phantomR - log.appUber.rides);
              }
            }
          }

          // If earnings were imported but rides remained 0 (e.g. column missing or not informed)
          if (log.appUber.earnings > 0 && log.appUber.rides === 0) {
            log.appUber.rides = Math.max(1, Math.round(log.appUber.earnings / 23));
          }
          if (log.app99.earnings > 0 && log.app99.rides === 0) {
            log.app99.rides = Math.max(1, Math.round(log.app99.earnings / 22));
          }
          if (log.appParticular.earnings > 0 && log.appParticular.rides === 0) {
            log.appParticular.rides = Math.max(1, Math.round(log.appParticular.earnings / 35));
          }

          if (recompensasIdx !== -1 && row[recompensasIdx] !== null) log.recompensasExtra += parseCurrency(row[recompensasIdx]);
          if (outrasFontesIdx !== -1 && row[outrasFontesIdx] !== null) {
            const anjoVal = parseCurrency(row[outrasFontesIdx]);
            log.outrasFontes += anjoVal;
            log.anjo = (log.anjo || 0) + anjoVal;
          }

          if (kmIdx !== -1 && row[kmIdx] !== null) {
            const kmVal = Math.round(parseCurrency(row[kmIdx]));
            log.kmRodado = Math.max(log.kmRodado, kmVal);
          }

          if (washIdx !== -1 && row[washIdx] !== null) log.carExpenses.wash += parseCurrency(row[washIdx]);
          if (tollIdx !== -1 && row[tollIdx] !== null) log.carExpenses.toll += parseCurrency(row[tollIdx]);
          if (parkingIdx !== -1 && row[parkingIdx] !== null) log.carExpenses.parking += parseCurrency(row[parkingIdx]);
          if (maintenanceIdx !== -1 && row[maintenanceIdx] !== null) log.carExpenses.maintenance += parseCurrency(row[maintenanceIdx]);
          if (publicChargingIdx !== -1 && row[publicChargingIdx] !== null) log.carExpenses.publicCharging += parseCurrency(row[publicChargingIdx]);
          if (otherExpIdx !== -1 && row[otherExpIdx] !== null) log.carExpenses.other += parseCurrency(row[otherExpIdx]);

          if (lunchIdx !== -1 && row[lunchIdx] !== null) log.foodExpenses.lunch += parseCurrency(row[lunchIdx]);
          if (dinnerIdx !== -1 && row[dinnerIdx] !== null) log.foodExpenses.dinner += parseCurrency(row[dinnerIdx]);
          if (snackIdx !== -1 && row[snackIdx] !== null) log.foodExpenses.snacks += parseCurrency(row[snackIdx]);
          if (coffeeIdx !== -1 && row[coffeeIdx] !== null) log.foodExpenses.coffee += parseCurrency(row[coffeeIdx]);
          if (foodTotalIdx !== -1 && row[foodTotalIdx] !== null && log.foodExpenses.lunch === 0) {
            log.foodExpenses.lunch = parseCurrency(row[foodTotalIdx]);
          }
        } else if (inFixedExpensesBlock) {
          const label = row.find(c => c !== null && c !== undefined && String(c).trim() !== '');
          if (label) {
            const labelStr = String(label).toLowerCase().trim();
            if (['null', 'undefined', 'nan', ''].includes(labelStr)) return;

            const isLabelTotal = labelStr.includes('total') || labelStr.includes('soma');
            const isFood = isFoodLabel(labelStr);
            const isNumberOnly = /^\d+([.,]\d+)?$/.test(labelStr);
            
            const labelIdx = row.indexOf(label);
            const val = row[labelIdx + 1];
            if (val && !isNaN(parseCurrency(val)) && parseCurrency(val) > 0 && !isLabelTotal && !isFood && !isNumberOnly) {
              sheetFixedCount++;

              let expenseMonthKey: string | undefined = undefined;
              const monthCell = row[labelIdx + 2];
              if (monthCell) {
                const mStr = String(monthCell).trim();
                const slashMatch = mStr.match(/^(\d{1,2})\/(\d{4})$/);
                if (slashMatch) {
                  expenseMonthKey = `${slashMatch[2]}-${slashMatch[1].padStart(2, '0')}`;
                } else if (/^\d{4}-\d{2}$/.test(mStr)) {
                  expenseMonthKey = mStr;
                }
              }

              const installmentsCell = row[labelIdx + 3];
              const installments = installmentsCell && String(installmentsCell).trim() !== '-' 
                ? String(installmentsCell).trim() 
                : undefined;

              allFixedExpenses.push({
                id: `imp-f-${Math.random()}`,
                name: String(label).trim(),
                value: parseCurrency(val),
                monthKey: expenseMonthKey,
                installments
              } as any);
            } else if (isLabelTotal) {
              inFixedExpensesBlock = false;
            }
          }
        }
      }
      mappingInfo[sheet.sheetName].fixedFound = sheetFixedCount;
    });

    return { 
      dailyLogs: Object.values(dailyLogsMap), 
      fixedExpenses: allFixedExpenses,
      carProfile: detectedCarProfile,
      mappingInfo 
    };
  };

  const normalizeDate = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return '';
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (typeof val === 'number') {
      if (val >= 1 && val <= 31) return '';
      try {
        const date = XLSX.SSF.parse_date_code(val);
        const y = date.y;
        const m = String(date.m).padStart(2, '0');
        const d = String(date.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      } catch (e) {
        return '';
      }
    }
    const str = String(val).trim();
    if (!str) return '';

    const months = ['janeiro', 'fevereiro', 'março', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const monthsAbbrev = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

    // Handle formats like "01/Set" or "1-set"
    const partialMatch = str.match(/^(\d{1,2})[\/\-\s]([a-zA-Zçáéíóú]+)$/i);
    if (partialMatch) {
      const d = partialMatch[1].padStart(2, '0');
      const mStr = partialMatch[2].toLowerCase();
      let mIdx = months.findIndex(m => mStr.includes(m));
      if (mIdx === -1) mIdx = monthsAbbrev.findIndex(m => mStr.includes(m));
      if (mIdx !== -1) {
        const y = new Date().getFullYear();
        return `${y}-${String(mIdx + 1).padStart(2, '0')}-${d}`;
      }
    }

    const dmy = str.match(/(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{2,4})/);
    if (dmy) {
      let y = dmy[3];
      if (y.length === 2) {
        const yearNum = parseInt(y, 10);
        y = (yearNum > 80 ? '19' : '20') + y;
      }
      const m = dmy[2].padStart(2, '0');
      const d = dmy[1].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const ymd = str.match(/(\d{4})[\/\-\s](\d{2})[\/\-\s](\d{2})/);
    if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
    return '';
  };

  const parseCurrency = (val: any): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    const str = String(val).trim();
    if (!str) return 0;
    const hasComma = str.includes(',');
    const hasDot = str.includes('.');
    if (hasComma && (!hasDot || str.indexOf(',') > str.lastIndexOf('.'))) {
      const clean = str.replace(/[R$\s.]/g, '').replace(',', '.');
      return parseFloat(clean) || 0;
    } else {
      const clean = str.replace(/[R$\s,]/g, '');
      return parseFloat(clean) || 0;
    }
  };

  const handleApply = () => {
    setPastedText('');
    if (directBackupData) {
      onImportData(directBackupData.dailyLogs, directBackupData.fixedExpenses, directBackupData.carProfile);
      setDirectBackupData(null);
      setResults([]);
      setImportSummary(null);
      setMappingInfo({});
      if (fileInputRef.current) fileInputRef.current.value = '';
      onClose();
      return;
    }

    const { dailyLogs, fixedExpenses, carProfile } = parseAllSheets(results);
    onImportData(dailyLogs, fixedExpenses, carProfile);
    setResults([]);
    setImportSummary(null);
    setMappingInfo({});
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0f1115] border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1 bg-white border border-zinc-700/80 rounded-xl shadow-sm shrink-0">
              <GkdMobilityLogo size="xs" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Importar dados</h2>
              <p className="text-[10px] text-zinc-400">Detecção automática de planilhas, arquivos Excel/CSV, backups JSON ou textos</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onBack && (
              <button onClick={onBack} className="p-2 text-zinc-400 hover:text-white rounded-lg transition-colors" title="Voltar">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg transition-colors" title="Fechar">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {!results.length && !isProcessing ? (
            <div className="space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) parseExcels(files);
                }}
                className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-8 text-center transition-all cursor-pointer bg-zinc-900/20 group"
              >
                <div className="bg-emerald-500/5 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/10 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7 text-emerald-500/80" />
                </div>
                <h3 className="text-sm font-bold text-zinc-200 mb-1">Arraste seu arquivo ou clique para selecionar</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Detecção automática de planilhas Excel (.xlsx, .xls), CSV e backups (.json).
                </p>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  multiple
                  accept=".xlsx, .xls, .csv, .json" 
                  className="hidden" 
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) parseExcels(files);
                  }}
                />
              </div>

              {/* Collapsible or direct paste option for text */}
              <div className="space-y-3 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400">Ou cole os dados do Excel / Planilha aqui:</span>
                  <span className="text-[10px] text-zinc-500">Detecção Automática</span>
                </div>
                <div className="relative">
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Cole aqui os dados copiados (Ctrl+V) de sua planilha ou backup..."
                    className="w-full h-32 bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all placeholder:text-zinc-600 resize-none custom-scrollbar"
                  />
                  {pastedText && (
                    <button 
                      onClick={() => setPastedText('')}
                      className="absolute top-2.5 right-2.5 p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {pastedText.trim() && (
                  <button
                    onClick={handlePasteData}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/10"
                  >
                    <TrendingUp size={16} />
                    Processar e Analisar Dados Colados
                  </button>
                )}
              </div>
            </div>
          ) : isProcessing ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-bold text-zinc-200">Processando Planilha...</p>
                <p className="text-[10px] text-zinc-500">Mapeando abas e analisando colunas de dados</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              {importSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
                    <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Datas</span>
                      <span className="text-base font-black text-zinc-100">{importSummary.datesFound} dias</span>
                    </div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
                    <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Faturamento</span>
                      <span className="text-base font-black text-zinc-100">R$ {importSummary.totalEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
                    <div className="bg-purple-500/10 p-2 rounded-lg text-purple-400">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Fixas</span>
                      <span className="text-base font-black text-zinc-100">{importSummary.fixedExpensesFound} itens</span>
                    </div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
                    <div className="bg-amber-500/10 p-2 rounded-lg text-amber-400">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Veículo</span>
                      <span className="text-xs font-black text-zinc-100 truncate block max-w-[100px]">
                        {importSummary.carModelFound || 'Detectado'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs Found */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Table className="w-3 h-3" /> Abas Detectadas ({results.length})
                </h3>
                
                <div className="space-y-3">
                  {results.map((res, idx) => (
                    <div key={idx} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                      <div className="px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-xs font-bold text-zinc-200">{res.sheetName}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500">{res.data.length - 1} linhas</span>
                      </div>
                      
                      {mappingInfo[res.sheetName] && (
                        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                            <span className="text-[8px] text-zinc-500 uppercase block mb-1">Coluna Data</span>
                            <span className={`text-[10px] truncate block ${mappingInfo[res.sheetName].date === 'Não encontrada' ? 'text-rose-400' : 'text-zinc-300'}`}>
                              {mappingInfo[res.sheetName].date}
                            </span>
                          </div>
                          <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                            <span className="text-[8px] text-zinc-500 uppercase block mb-1">Coluna Uber</span>
                            <span className={`text-[10px] truncate block ${mappingInfo[res.sheetName].uber === 'Não encontrada' ? 'text-zinc-500' : 'text-zinc-300'}`}>
                              {mappingInfo[res.sheetName].uber}
                            </span>
                          </div>
                          <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                            <span className="text-[8px] text-zinc-500 uppercase block mb-1">Coluna 99</span>
                            <span className={`text-[10px] truncate block ${mappingInfo[res.sheetName].app99 === 'Não encontrada' ? 'text-zinc-500' : 'text-zinc-300'}`}>
                              {mappingInfo[res.sheetName].app99}
                            </span>
                          </div>
                          <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                            <span className="text-[8px] text-zinc-500 uppercase block mb-1">Ganhos Part.</span>
                            <span className={`text-[10px] truncate block ${mappingInfo[res.sheetName].particular === 'Não encontrada' ? 'text-zinc-500' : 'text-zinc-300'}`}>
                              {mappingInfo[res.sheetName].particular}
                            </span>
                          </div>
                          <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                            <span className="text-[8px] text-zinc-500 uppercase block mb-1">Recompensas</span>
                            <span className={`text-[10px] truncate block ${mappingInfo[res.sheetName].recompensas === 'Não detectado' ? 'text-zinc-500' : 'text-emerald-400 font-bold'}`}>
                              {mappingInfo[res.sheetName].recompensas}
                            </span>
                          </div>
                          <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                            <span className="text-[8px] text-zinc-500 uppercase block mb-1">Anjo/Outros</span>
                            <span className={`text-[10px] truncate block ${mappingInfo[res.sheetName].outrasFontes === 'Não detectado' ? 'text-zinc-500' : 'text-emerald-400 font-bold'}`}>
                              {mappingInfo[res.sheetName].outrasFontes}
                            </span>
                          </div>
                          <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                            <span className="text-[8px] text-zinc-500 uppercase block mb-1">Viagens</span>
                            <span className={`text-[10px] truncate block ${mappingInfo[res.sheetName].ridesFound === 'Não detectadas' ? 'text-zinc-500' : 'text-emerald-400 font-bold'}`}>
                              {mappingInfo[res.sheetName].ridesFound}
                            </span>
                          </div>
                          <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                            <span className="text-[8px] text-zinc-500 uppercase block mb-1">Coluna Total</span>
                            <span className={`text-[10px] truncate block ${mappingInfo[res.sheetName].total === 'Não encontrada' ? 'text-zinc-500' : 'text-zinc-300'}`}>
                              {mappingInfo[res.sheetName].total}
                            </span>
                          </div>
                          <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                            <span className="text-[8px] text-zinc-500 uppercase block mb-1">Coluna KM</span>
                            <span className={`text-[10px] truncate block ${mappingInfo[res.sheetName].km === 'Não encontrada' ? 'text-zinc-500' : 'text-zinc-300'}`}>
                              {mappingInfo[res.sheetName].km}
                            </span>
                          </div>
                          <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                            <span className="text-[8px] text-zinc-500 uppercase block mb-1">Despesas Carro</span>
                            <span className={`text-[10px] truncate block ${mappingInfo[res.sheetName].expenses === 'Não encontradas' ? 'text-zinc-500' : 'text-emerald-400 font-bold'}`}>
                              {mappingInfo[res.sheetName].expenses}
                            </span>
                          </div>
                          <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                            <span className="text-[8px] text-zinc-500 uppercase block mb-1">Recarga/Energia</span>
                            <span className={`text-[10px] truncate block ${mappingInfo[res.sheetName].charging === 'Não detectado' ? 'text-zinc-500' : 'text-emerald-400 font-bold'}`}>
                              {mappingInfo[res.sheetName].charging}
                            </span>
                          </div>
                          <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                            <span className="text-[8px] text-zinc-500 uppercase block mb-1">Alimentação</span>
                            <span className={`text-[10px] truncate block ${mappingInfo[res.sheetName].food === 'Não encontradas' ? 'text-zinc-500' : 'text-emerald-400 font-bold'}`}>
                              {mappingInfo[res.sheetName].food}
                            </span>
                          </div>
                          <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                            <span className="text-[8px] text-zinc-500 uppercase block mb-1">Contas Fixas</span>
                            <span className={`text-[10px] truncate block ${mappingInfo[res.sheetName].fixedFound === 0 ? 'text-zinc-500' : 'text-purple-400 font-bold'}`}>
                              {mappingInfo[res.sheetName].fixedFound > 0 ? `${mappingInfo[res.sheetName].fixedFound} detectadas` : 'Não encontradas'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-200">Revisão de Importação</p>
                  <p className="text-[10px] text-amber-500/80 mt-0.5">
                    Se houver registros nas mesmas datas, os dados da planilha serão mesclados ou substituirão os existentes. 
                    Recomendamos conferir o histórico após a aplicação.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <p className="text-xs text-rose-300 font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button 
            disabled={!results.length || isProcessing}
            onClick={handleApply}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
          >
            <ArrowRight className="w-4 h-4" />
            Aplicar Importação
          </button>
        </div>
      </div>
    </div>
  );
};
