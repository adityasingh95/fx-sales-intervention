// T+N business-day calculation for spot FX settlement (T+2 for spot).
// Skips Saturday + Sunday. If the input date itself falls on a weekend,
// the first business day forward is treated as the starting point.

const isWeekend = (d: Date): boolean => {
  const day = d.getDay();
  return day === 0 || day === 6;
};

const nextBusinessDay = (d: Date): Date => {
  const result = new Date(d);
  do {
    result.setDate(result.getDate() + 1);
  } while (isWeekend(result));
  return result;
};

export const addBusinessDays = (date: Date, days: number): Date => {
  let result = new Date(date);
  // Normalize: if the input is a weekend, roll forward to Monday first.
  while (isWeekend(result)) {
    result = nextBusinessDay(result);
  }
  for (let i = 0; i < days; i += 1) {
    result = nextBusinessDay(result);
  }
  return result;
};

const SETTLEMENT_FMT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export const formatSettlementDate = (date: Date): string => SETTLEMENT_FMT.format(date);
