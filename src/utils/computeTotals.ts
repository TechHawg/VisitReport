export interface Inventory {
  inUseByEmployee: number | string;
  trainingRoom: number | string;
  other: (number | string)[];
  sparesFloor: number | string;
  sparesStorage: number | string;
  broken: number | string;
}

const n = (v: unknown): number => Number(v ?? 0);

export function computeTotals(inv: Inventory) {
  const totalOtherUse = n(inv.trainingRoom) + (inv.other ?? []).reduce((a, b) => a + n(b), 0);
  const spares = n(inv.sparesFloor) + n(inv.sparesStorage);
  const total = n(inv.inUseByEmployee) + totalOtherUse + spares + n(inv.broken);
  return { totalOtherUse, spares, total };
}