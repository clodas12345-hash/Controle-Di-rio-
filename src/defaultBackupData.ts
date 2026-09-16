import { CarProfile, FixedExpense, DailyLog } from './types';
import allDailyLogsJson from './data/allDailyLogs.json';
import { FULL_USER_CAR_PROFILE, FULL_FIXED_EXPENSES_BY_MONTH } from './data/allDailyLogsData';

export const DEFAULT_CAR_PROFILE: CarProfile = FULL_USER_CAR_PROFILE;

export const DEFAULT_FIXED_EXPENSES_BY_MONTH: Record<string, FixedExpense[]> = FULL_FIXED_EXPENSES_BY_MONTH;

export function parseRawLancamentosToDailyLogs(rawList: any[]): DailyLog[] {
  return (rawList || []).map((d) => ({
    id: d.data || d.id,
    date: d.data || d.id,
    isDayOff: Boolean(d.ehFolga),
    sobrouBateria: d.bateriaRestantePct !== undefined && d.bateriaRestantePct !== null ? Number(d.bateriaRestantePct) : null,
    valorKwh: Number(d.valorKwhUtilizadoNoDia || 1.04),
    capacidadeBateria: Number(d.capacidadeBateriaKwh || 53.6),
    kmRodado: Number(d.kmRodado || 0),
    custoEnergia: Number(d.custoEnergiaTotal || 0),
    diariaCarro: Number(d.diariaCarro || 0),
    carExpenses: {
      wash: Number(d.despesasCarro?.lavaJato || 0),
      toll: Number(d.despesasCarro?.pedagio || 0),
      maintenance: Number(d.despesasCarro?.manutencao || 0),
      parking: Number(d.despesasCarro?.estacionamento || 0),
      publicCharging: Number(d.despesasCarro?.recargaExterna || 0),
      other: Number(d.despesasCarro?.outros || 0),
    },
    foodExpenses: {
      lunch: Number(d.despesasAlimentacao?.almoco || 0),
      dinner: Number(d.despesasAlimentacao?.jantar || 0),
      snacks: Number(d.despesasAlimentacao?.lanches || 0),
      coffee: Number(d.despesasAlimentacao?.cafe || 0),
    },
    app99: {
      rides: Number(d.ganhos99?.corridas || 0),
      earnings: Number(d.ganhos99?.faturamento || 0),
      bonus: Number(d.ganhos99?.bonus || 0),
    },
    appUber: {
      rides: Number(d.ganhosUber?.corridas || 0),
      earnings: Number(d.ganhosUber?.faturamento || 0),
      bonus: Number(d.ganhosUber?.bonus || 0),
    },
    appParticular: {
      rides: Number(d.ganhosParticular?.corridas || 0),
      earnings: Number(d.ganhosParticular?.faturamento || 0),
    },
    recompensasExtra: Number(d.recompensasExtra || 0),
    outrasFontes: Number(d.outrasFontes || 0),
    exibirNoGeral: true,
  }));
}

export const RAW_LANCAMENTOS = allDailyLogsJson;
export const DEFAULT_DAILY_LOGS: DailyLog[] = parseRawLancamentosToDailyLogs(RAW_LANCAMENTOS);
