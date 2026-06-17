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

// Forward value-date calculation (v3, FXSW-054). The forward value date is the
// spot date (T+2) shifted by the tenor period and rolled forward to the next
// business day. A real holiday calendar could slot in at the rollForward seam.
import { instrumentOf, type Deal, type Tenor } from '@/types/deal';

const rollForward = (d: Date): Date => {
  let result = new Date(d);
  while (isWeekend(result)) {
    result = nextBusinessDay(result);
  }
  return result;
};

const TENOR_DAYS: Partial<Record<Tenor, number>> = { '1W': 7, '2W': 14 };
const TENOR_MONTHS: Partial<Record<Tenor, number>> = {
  '1M': 1,
  '2M': 2,
  '3M': 3,
  '6M': 6,
  '9M': 9,
  '1Y': 12,
};

export const valueDateForTenor = (tradeDate: Date, tenor: Tenor): Date => {
  const spot = addBusinessDays(tradeDate, 2);
  if (tenor === 'SPOT') return spot;
  const d = new Date(spot);
  const days = TENOR_DAYS[tenor];
  const months = TENOR_MONTHS[tenor];
  if (days !== undefined) d.setDate(d.getDate() + days);
  else if (months !== undefined) d.setMonth(d.getMonth() + months);
  return rollForward(d);
};

const SETTLEMENT_FMT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export const formatSettlementDate = (date: Date): string => SETTLEMENT_FMT.format(date);

// Blotter value-date label (FXSW-086). A swap shows both leg dates (near → far);
// every other instrument shows the single settlement date for its tenor.
export const valueDateLabel = (deal: Deal): string => {
  const trade = new Date(deal.createdAt);
  const legs = deal.legs;
  if (instrumentOf(deal) === 'SWAP' && legs && legs.length >= 2) {
    const near = formatSettlementDate(valueDateForTenor(trade, legs[0].tenor));
    const far = formatSettlementDate(valueDateForTenor(trade, legs[1].tenor));
    return `${near} → ${far}`;
  }
  return formatSettlementDate(valueDateForTenor(trade, deal.tenor));
};
