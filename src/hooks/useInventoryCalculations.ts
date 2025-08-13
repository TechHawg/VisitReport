import { useMemo } from 'react';

export interface InventoryRow {
  id: string;
  name: string;
  inUseByEmployees: number | string;
  training: number | string;
  conferenceRoom: number | string;
  gsmOffice: number | string;
  prospectingStation: number | string;
  applicantStation: number | string;
  visitorStation: number | string;
  other: number | string;
  sparesOnFloor: number | string;
  sparesInStorage: number | string;
  broken: number | string;
}

export interface CalculatedRow extends InventoryRow {
  totalOtherUse: number;
  sparesAuto: number;
  rowTotal: number;
}

// Number sanitization - handles strings, removes commas, clamps negatives to 0
const sanitizeNumber = (value: unknown): number => {
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    if (cleaned === '') return 0;
    const num = Number(cleaned);
    return Number.isFinite(num) && num >= 0 ? Math.floor(num) : 0;
  }
  const num = Number(value ?? 0);
  return Number.isFinite(num) && num >= 0 ? Math.floor(num) : 0;
};

// Calculate totals for a single row
export const calculateRowTotals = (row: InventoryRow) => {
  const inUse = sanitizeNumber(row.inUseByEmployees);
  const training = sanitizeNumber(row.training);
  const conference = sanitizeNumber(row.conferenceRoom);
  const gsm = sanitizeNumber(row.gsmOffice);
  const prospect = sanitizeNumber(row.prospectingStation);
  const applicant = sanitizeNumber(row.applicantStation);
  const visitor = sanitizeNumber(row.visitorStation);
  const other = sanitizeNumber(row.other);
  const floor = sanitizeNumber(row.sparesOnFloor);
  const storage = sanitizeNumber(row.sparesInStorage);
  const broken = sanitizeNumber(row.broken);

  // Calculate formulas exactly as specified
  const totalOtherUse = training + conference + gsm + prospect + applicant + visitor + other;
  const sparesAuto = floor + storage;
  const rowTotal = inUse + totalOtherUse + sparesAuto + broken;

  return {
    totalOtherUse,
    sparesAuto,
    rowTotal
  };
};

// Hook for inventory calculations with memoization
export const useInventoryCalculations = (rows: InventoryRow[]) => {
  const calculatedRows = useMemo((): CalculatedRow[] => {
    return rows.map(row => {
      const totals = calculateRowTotals(row);
      return {
        ...row,
        totalOtherUse: totals.totalOtherUse,
        sparesAuto: totals.sparesAuto,
        rowTotal: totals.rowTotal
      };
    });
  }, [rows]);

  const summaryTotals = useMemo(() => {
    return calculatedRows.reduce((acc, row) => ({
      totalInUse: acc.totalInUse + sanitizeNumber(row.inUseByEmployees),
      totalTraining: acc.totalTraining + sanitizeNumber(row.training),
      totalConference: acc.totalConference + sanitizeNumber(row.conferenceRoom),
      totalGsm: acc.totalGsm + sanitizeNumber(row.gsmOffice),
      totalProspect: acc.totalProspect + sanitizeNumber(row.prospectingStation),
      totalApplicant: acc.totalApplicant + sanitizeNumber(row.applicantStation),
      totalVisitor: acc.totalVisitor + sanitizeNumber(row.visitorStation),
      totalOtherUse: acc.totalOtherUse + row.totalOtherUse,
      totalFloor: acc.totalFloor + sanitizeNumber(row.sparesOnFloor),
      totalStorage: acc.totalStorage + sanitizeNumber(row.sparesInStorage),
      totalSpares: acc.totalSpares + row.sparesAuto,
      totalBroken: acc.totalBroken + sanitizeNumber(row.broken),
      grandTotal: acc.grandTotal + row.rowTotal
    }), {
      totalInUse: 0,
      totalTraining: 0,
      totalConference: 0,
      totalGsm: 0,
      totalProspect: 0,
      totalApplicant: 0,
      totalVisitor: 0,
      totalOtherUse: 0,
      totalFloor: 0,
      totalStorage: 0,
      totalSpares: 0,
      totalBroken: 0,
      grandTotal: 0
    });
  }, [calculatedRows]);

  return {
    calculatedRows,
    summaryTotals,
    sanitizeNumber
  };
};