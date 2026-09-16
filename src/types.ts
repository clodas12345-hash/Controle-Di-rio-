export interface CarExpenseDetail {
  wash: number;
  toll: number;
  maintenance: number;
  parking: number;
  publicCharging?: number;
  other: number;
}

export interface FoodExpenseDetail {
  lunch: number;
  dinner: number;
  snacks: number;
  coffee: number;
}

export interface AppEarning {
  rides: number;
  earnings: number;
  bonus: number;
}

export interface DailyLog {
  id: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  isDayOff: boolean;
  
  // Rodagem & Bateria
  sobrouBateria: number | null; // %
  valorKwh: number; // R$/kWh
  capacidadeBateria: number; // kWh
  kmRodado: number;
  custoEnergia: number; // R$
  diariaCarro: number; // R$
  
  // Accordion details
  carExpenses: CarExpenseDetail;
  foodExpenses: FoodExpenseDetail;
  
  // App Earnings
  app99: AppEarning;
  appUber: AppEarning;
  appParticular: {
    rides: number;
    earnings: number;
  };
  
  recompensasExtra: number;
  outrasFontes: number;
  anjo?: number;
  
  exibirNoGeral: boolean;
}

export interface FixedExpense {
  id: string;
  name: string;
  value: number;
  installments?: string;
  startDate?: string; // Format YYYY-MM
}

export interface CarProfile {
  vehicleType: 'eletrico' | 'combustao';
  modelName: string;
  licensePlate: string;
  manufactureYear: string;
  color: string;
  ownershipType: 'alugado' | 'proprio' | 'financiado';
  currentKm: number;
  batteryCapacityKwh: number;
  estimatedAutonomyKm: number;
  kwhCostRate: number;
  rentalOrWeeklyRate: number;
  monthlyCarExpense: number;
  workScheduleType: 'mon_to_sat_sundays_off' | 'mon_to_fri_weekends_off' | 'all_days_work' | 'custom';
  customWorkDays?: { [monthKey: string]: number[] };
  insurerName?: string;
  insurancePolicyNumber?: string;
  nextMaintenanceKm?: string;
  notes?: string;
}
