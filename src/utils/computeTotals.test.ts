import { describe, test, expect } from 'vitest';
import { computeTotals } from './computeTotals';

describe('computeTotals', () => {
  test('spares & other use math', () => {
    const inv = { 
      trainingRoom: 2, 
      other: [1, 0], 
      sparesFloor: 3, 
      sparesStorage: 2, 
      inUseByEmployee: 10, 
      broken: 1 
    };
    expect(computeTotals(inv)).toEqual({ totalOtherUse: 3, spares: 5, total: 19 });
  });

  test('handles strings and blanks', () => {
    const inv = { 
      trainingRoom: '2', 
      other: ['', '4'], 
      sparesFloor: '0', 
      sparesStorage: '5', 
      inUseByEmployee: '7', 
      broken: '' 
    };
    expect(computeTotals(inv)).toEqual({ totalOtherUse: 6, spares: 5, total: 18 });
  });

  test('handles empty other array', () => {
    const inv = {
      trainingRoom: 5,
      other: [],
      sparesFloor: 2,
      sparesStorage: 3,
      inUseByEmployee: 10,
      broken: 1
    };
    expect(computeTotals(inv)).toEqual({ totalOtherUse: 5, spares: 5, total: 21 });
  });

  test('handles null and undefined values', () => {
    const inv = {
      trainingRoom: null,
      other: [undefined, null, 3],
      sparesFloor: undefined,
      sparesStorage: 4,
      inUseByEmployee: 8,
      broken: null
    };
    expect(computeTotals(inv)).toEqual({ totalOtherUse: 3, spares: 4, total: 15 });
  });
});