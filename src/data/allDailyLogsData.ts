import { DailyLog, CarProfile, FixedExpense } from '../types';

export const FULL_USER_CAR_PROFILE: CarProfile = {
  vehicleType: 'eletrico',
  modelName: 'BYD D1',
  licensePlate: 'FRG6D91',
  manufactureYear: '2022',
  color: 'Branco',
  ownershipType: 'alugado',
  currentKm: 170516,
  batteryCapacityKwh: 53.6,
  estimatedAutonomyKm: 350,
  kwhCostRate: 1.04,
  rentalOrWeeklyRate: 0,
  monthlyCarExpense: 7071.05,
  workScheduleType: 'mon_to_sat_sundays_off',
  customWorkDays: {
    '2026-09': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26, 28, 29, 30]
  },
  insurerName: '',
  insurancePolicyNumber: '',
  nextMaintenanceKm: '180000',
  notes: ''
};

export const FULL_FIXED_EXPENSES_BY_MONTH: Record<string, FixedExpense[]> = {
  "2026-01": [
    { id: "auto-2026-01-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "16/60", startDate: "2024-10" },
    { id: "auto-2026-01-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2026-01-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2026-01-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2026-01-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2026-01-imp-f-0.2135051319943968", name: "Preventiva", value: 700 }
  ],
  "2026-02": [
    { id: "auto-2026-02-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "17/60", startDate: "2024-10" },
    { id: "auto-2026-02-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2026-02-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2026-02-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2026-02-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2026-02-imp-f-0.2135051319943968", name: "Preventiva", value: 700 }
  ],
  "2026-03": [
    { id: "auto-2026-03-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "18/60", startDate: "2024-10" },
    { id: "auto-2026-03-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2026-03-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2026-03-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2026-03-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2026-03-imp-f-0.2645431645660098", name: "Pneu", value: 126, installments: "01/10" },
    { id: "auto-2026-03-imp-f-0.2135051319943968", name: "Preventiva", value: 700 },
    { id: "auto-2026-03-imp-f-0.10555836919586781", name: "Film", value: 50, installments: "01/12" }
  ],
  "2026-04": [
    { id: "auto-2026-04-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "19/60", startDate: "2024-10" },
    { id: "auto-2026-04-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2026-04-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2026-04-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2026-04-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2026-04-imp-f-0.2645431645660098", name: "Pneu", value: 126, installments: "02/10" },
    { id: "auto-2026-04-imp-f-0.2135051319943968", name: "Preventiva", value: 700 },
    { id: "auto-2026-04-imp-f-0.10555836919586781", name: "Film", value: 50, installments: "02/12" }
  ],
  "2026-05": [
    { id: "auto-2026-05-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "20/60", startDate: "2024-10" },
    { id: "auto-2026-05-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2026-05-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2026-05-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2026-05-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2026-05-imp-f-0.2645431645660098", name: "Pneu", value: 126, installments: "03/10" },
    { id: "auto-2026-05-imp-f-0.2135051319943968", name: "Preventiva", value: 700 },
    { id: "auto-2026-05-imp-f-0.10555836919586781", name: "Film", value: 50, installments: "03/12" }
  ],
  "2026-06": [
    { id: "auto-2026-06-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "21/60", startDate: "2024-10" },
    { id: "auto-2026-06-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2026-06-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2026-06-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2026-06-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2026-06-imp-f-0.2645431645660098", name: "Pneu", value: 126, installments: "04/10" },
    { id: "auto-2026-06-imp-f-0.2135051319943968", name: "Preventiva", value: 700 },
    { id: "auto-2026-06-imp-f-0.10555836919586781", name: "Film", value: 50, installments: "04/12" }
  ],
  "2026-07": [
    { id: "auto-2026-07-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "22/60", startDate: "2024-10" },
    { id: "auto-2026-07-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2026-07-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2026-07-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2026-07-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2026-07-imp-f-0.2645431645660098", name: "Pneu", value: 126, installments: "05/10" },
    { id: "auto-2026-07-imp-f-0.2135051319943968", name: "Preventiva", value: 700 },
    { id: "auto-2026-07-imp-f-0.10555836919586781", name: "Film", value: 50, installments: "05/12" },
    { id: "auto-2026-07-imp-f-0.7444608347623323", name: "Funilaria", value: 350, installments: "01/04" }
  ],
  "2026-08": [
    { id: "auto-2026-08-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "23/60", startDate: "2024-10" },
    { id: "auto-2026-08-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2026-08-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2026-08-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2026-08-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2026-08-imp-f-0.2645431645660098", name: "Pneu", value: 126, installments: "06/10" },
    { id: "auto-2026-08-imp-f-0.2135051319943968", name: "Preventiva", value: 700 },
    { id: "auto-2026-08-imp-f-0.10555836919586781", name: "Film", value: 50, installments: "06/12" },
    { id: "auto-2026-08-imp-f-0.7444608347623323", name: "Funilaria", value: 350, installments: "02/04" }
  ],
  "2026-09": [
    { id: "imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "24/60", startDate: "2024-10" },
    { id: "imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "imp-f-0.2645431645660098", name: "Pneu", value: 126, installments: "07/10" },
    { id: "imp-f-0.2135051319943968", name: "Preventiva", value: 700 },
    { id: "imp-f-0.10555836919586781", name: "Film", value: 50, installments: "07/12" },
    { id: "imp-f-0.7444608347623323", name: "Funilaria", value: 350, installments: "03/04" },
    { id: "1789088958700", name: "Balanceamento ", value: 50, installments: "01/02" }
  ],
  "2026-10": [
    { id: "auto-2026-10-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "25/60", startDate: "2024-10" },
    { id: "auto-2026-10-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2026-10-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2026-10-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2026-10-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2026-10-imp-f-0.2645431645660098", name: "Pneu", value: 126, installments: "08/10" },
    { id: "auto-2026-10-imp-f-0.2135051319943968", name: "Preventiva", value: 700 },
    { id: "auto-2026-10-imp-f-0.10555836919586781", name: "Film", value: 50, installments: "08/12" },
    { id: "auto-2026-10-imp-f-0.7444608347623323", name: "Funilaria", value: 350, installments: "04/04" },
    { id: "auto-2026-10-1789088958700", name: "Balanceamento ", value: 50, installments: "02/02" }
  ],
  "2026-11": [
    { id: "auto-2026-11-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "26/60", startDate: "2024-10" },
    { id: "auto-2026-11-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2026-11-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2026-11-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2026-11-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2026-11-imp-f-0.2645431645660098", name: "Pneu", value: 126, installments: "09/10" },
    { id: "auto-2026-11-imp-f-0.2135051319943968", name: "Preventiva", value: 700 },
    { id: "auto-2026-11-imp-f-0.10555836919586781", name: "Film", value: 50, installments: "09/12" }
  ],
  "2026-12": [
    { id: "auto-2026-12-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "27/60", startDate: "2024-10" },
    { id: "auto-2026-12-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2026-12-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2026-12-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2026-12-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2026-12-imp-f-0.2645431645660098", name: "Pneu", value: 126, installments: "10/10" },
    { id: "auto-2026-12-imp-f-0.2135051319943968", name: "Preventiva", value: 700 },
    { id: "auto-2026-12-imp-f-0.10555836919586781", name: "Film", value: 50, installments: "10/12" }
  ],
  "2027-01": [
    { id: "auto-2027-01-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "28/60", startDate: "2024-10" },
    { id: "auto-2027-01-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2027-01-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2027-01-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2027-01-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2027-01-imp-f-0.2135051319943968", name: "Preventiva", value: 700 },
    { id: "auto-2027-01-imp-f-0.10555836919586781", name: "Film", value: 50, installments: "11/12" }
  ],
  "2027-02": [
    { id: "auto-2027-02-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "29/60", startDate: "2024-10" },
    { id: "auto-2027-02-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2027-02-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2027-02-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2027-02-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2027-02-imp-f-0.2135051319943968", name: "Preventiva", value: 700 },
    { id: "auto-2027-02-imp-f-0.10555836919586781", name: "Film", value: 50, installments: "12/12" }
  ],
  "2027-03": [
    { id: "auto-2027-03-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "30/60", startDate: "2024-10" },
    { id: "auto-2027-03-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2027-03-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2027-03-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2027-03-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2027-03-imp-f-0.2135051319943968", name: "Preventiva", value: 700 }
  ],
  "2027-04": [
    { id: "auto-2027-04-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "31/60", startDate: "2024-10" },
    { id: "auto-2027-04-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2027-04-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2027-04-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2027-04-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2027-04-imp-f-0.2135051319943968", name: "Preventiva", value: 700 }
  ],
  "2027-05": [
    { id: "auto-2027-05-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "32/60", startDate: "2024-10" },
    { id: "auto-2027-05-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2027-05-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2027-05-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2027-05-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2027-05-imp-f-0.2135051319943968", name: "Preventiva", value: 700 }
  ],
  "2027-06": [
    { id: "auto-2027-06-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "33/60", startDate: "2024-10" },
    { id: "auto-2027-06-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2027-06-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2027-06-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2027-06-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2027-06-imp-f-0.2135051319943968", name: "Preventiva", value: 700 }
  ],
  "2027-07": [
    { id: "auto-2027-07-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "34/60", startDate: "2024-10" },
    { id: "auto-2027-07-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2027-07-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2027-07-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2027-07-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2027-07-imp-f-0.2135051319943968", name: "Preventiva", value: 700 }
  ],
  "2027-08": [
    { id: "auto-2027-08-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "35/60", startDate: "2024-10" },
    { id: "auto-2027-08-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2027-08-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2027-08-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2027-08-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2027-08-imp-f-0.2135051319943968", name: "Preventiva", value: 700 }
  ],
  "2027-09": [
    { id: "auto-2027-09-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "36/60", startDate: "2024-10" },
    { id: "auto-2027-09-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2027-09-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2027-09-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2027-09-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2027-09-imp-f-0.2135051319943968", name: "Preventiva", value: 700 }
  ],
  "2027-10": [
    { id: "auto-2027-10-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "37/60", startDate: "2024-10" },
    { id: "auto-2027-10-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2027-10-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2027-10-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2027-10-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2027-10-imp-f-0.2135051319943968", name: "Preventiva", value: 700 }
  ],
  "2027-11": [
    { id: "auto-2027-11-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "38/60", startDate: "2024-10" },
    { id: "auto-2027-11-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2027-11-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2027-11-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2027-11-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2027-11-imp-f-0.2135051319943968", name: "Preventiva", value: 700 }
  ],
  "2027-12": [
    { id: "auto-2027-12-imp-f-0.4153111028361277", name: "Financiamento", value: 4000, installments: "39/60", startDate: "2024-10" },
    { id: "auto-2027-12-imp-f-0.34899782942131263", name: "Seguro", value: 698 },
    { id: "auto-2027-12-imp-f-0.9583940647933875", name: "MEI", value: 87.05 },
    { id: "auto-2027-12-imp-f-0.5932587943283271", name: "IPVA", value: 750 },
    { id: "auto-2027-12-imp-f-0.7648082788831503", name: "Garagem", value: 260 },
    { id: "auto-2027-12-imp-f-0.2135051319943968", name: "Preventiva", value: 700 }
  ]
};
