import { CarProfile, FixedExpense, DailyLog } from './types';

export const DEFAULT_CAR_PROFILE: CarProfile = {
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

export const DEFAULT_FIXED_EXPENSES_BY_MONTH: Record<string, FixedExpense[]> = {};

export function parseRawLancamentosToDailyLogs(rawList: any[]): DailyLog[] {
  return [];
}

export const RAW_LANCAMENTOS: any[] = [];
export const DEFAULT_DAILY_LOGS: DailyLog[] = [];
