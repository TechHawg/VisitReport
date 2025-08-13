import { describe, test, expect } from 'vitest';
import { calculateRowTotals } from '../useInventoryCalculations';
import { InventoryRow } from '../useInventoryCalculations';

describe('useInventoryCalculations', () => {
  describe('calculateRowTotals', () => {
    test('calculates correct totals with all positive numbers', () => {
      const row: InventoryRow = {
        id: 'test-1',
        name: 'Test Item',
        inUseByEmployees: 10,
        training: 2,
        conferenceRoom: 1,
        gsmOffice: 1,
        prospectingStation: 3,
        applicantStation: 1,
        visitorStation: 1,
        other: 1,
        sparesOnFloor: 5,
        sparesInStorage: 3,
        broken: 2
      };

      const result = calculateRowTotals(row);

      expect(result.totalOtherUse).toBe(10); // 2+1+1+3+1+1+1
      expect(result.sparesAuto).toBe(8); // 5+3
      expect(result.rowTotal).toBe(30); // 10+10+8+2
    });

    test('handles string inputs with commas', () => {
      const row: InventoryRow = {
        id: 'test-2',
        name: 'Test Item',
        inUseByEmployees: '1,000',
        training: '500',
        conferenceRoom: '0',
        gsmOffice: '100',
        prospectingStation: '50',
        applicantStation: '25',
        visitorStation: '10',
        other: '5',
        sparesOnFloor: '2,500',
        sparesInStorage: '1,000',
        broken: '100'
      };

      const result = calculateRowTotals(row);

      expect(result.totalOtherUse).toBe(690); // 500+0+100+50+25+10+5
      expect(result.sparesAuto).toBe(3500); // 2500+1000
      expect(result.rowTotal).toBe(5290); // 1000+690+3500+100
    });

    test('handles negative numbers by clamping to 0', () => {
      const row: InventoryRow = {
        id: 'test-3',
        name: 'Test Item',
        inUseByEmployees: -5,
        training: -1,
        conferenceRoom: 2,
        gsmOffice: -3,
        prospectingStation: 1,
        applicantStation: 0,
        visitorStation: 1,
        other: -2,
        sparesOnFloor: -10,
        sparesInStorage: 5,
        broken: -1
      };

      const result = calculateRowTotals(row);

      expect(result.totalOtherUse).toBe(4); // 0+2+0+1+0+1+0
      expect(result.sparesAuto).toBe(5); // 0+5
      expect(result.rowTotal).toBe(9); // 0+4+5+0
    });

    test('handles empty and invalid strings', () => {
      const row: InventoryRow = {
        id: 'test-4',
        name: 'Test Item',
        inUseByEmployees: '',
        training: 'invalid',
        conferenceRoom: '   ',
        gsmOffice: 'NaN',
        prospectingStation: 'abc123',
        applicantStation: '5.7', // Should floor to 5
        visitorStation: '10.9', // Should floor to 10
        other: '',
        sparesOnFloor: '   0   ',
        sparesInStorage: 'null',
        broken: 'undefined'
      };

      const result = calculateRowTotals(row);

      expect(result.totalOtherUse).toBe(15); // 0+0+0+0+5+10+0
      expect(result.sparesAuto).toBe(0); // 0+0
      expect(result.rowTotal).toBe(15); // 0+15+0+0
    });

    test('handles null and undefined values', () => {
      const row: InventoryRow = {
        id: 'test-5',
        name: 'Test Item',
        inUseByEmployees: null as any,
        training: undefined as any,
        conferenceRoom: 0,
        gsmOffice: 1,
        prospectingStation: null as any,
        applicantStation: undefined as any,
        visitorStation: 2,
        other: null as any,
        sparesOnFloor: undefined as any,
        sparesInStorage: 3,
        broken: null as any
      };

      const result = calculateRowTotals(row);

      expect(result.totalOtherUse).toBe(3); // 0+0+1+0+0+2+0
      expect(result.sparesAuto).toBe(3); // 0+3
      expect(result.rowTotal).toBe(6); // 0+3+3+0
    });

    test('handles decimal numbers by flooring', () => {
      const row: InventoryRow = {
        id: 'test-6',
        name: 'Test Item',
        inUseByEmployees: 10.8,
        training: 2.1,
        conferenceRoom: 1.9,
        gsmOffice: 0.5,
        prospectingStation: 3.7,
        applicantStation: 1.2,
        visitorStation: 1.6,
        other: 0.9,
        sparesOnFloor: 5.4,
        sparesInStorage: 3.3,
        broken: 2.7
      };

      const result = calculateRowTotals(row);

      expect(result.totalOtherUse).toBe(8); // floor(2.1)+floor(1.9)+floor(0.5)+floor(3.7)+floor(1.2)+floor(1.6)+floor(0.9) = 2+1+0+3+1+1+0
      expect(result.sparesAuto).toBe(8); // floor(5.4)+floor(3.3) = 5+3
      expect(result.rowTotal).toBe(28); // floor(10.8)+8+8+floor(2.7) = 10+8+8+2
    });

    test('edge case: all zeros', () => {
      const row: InventoryRow = {
        id: 'test-7',
        name: 'Empty Item',
        inUseByEmployees: 0,
        training: 0,
        conferenceRoom: 0,
        gsmOffice: 0,
        prospectingStation: 0,
        applicantStation: 0,
        visitorStation: 0,
        other: 0,
        sparesOnFloor: 0,
        sparesInStorage: 0,
        broken: 0
      };

      const result = calculateRowTotals(row);

      expect(result.totalOtherUse).toBe(0);
      expect(result.sparesAuto).toBe(0);
      expect(result.rowTotal).toBe(0);
    });

    test('edge case: large numbers', () => {
      const row: InventoryRow = {
        id: 'test-8',
        name: 'Large Numbers',
        inUseByEmployees: 999999,
        training: 100000,
        conferenceRoom: 50000,
        gsmOffice: 25000,
        prospectingStation: 10000,
        applicantStation: 5000,
        visitorStation: 2500,
        other: 1250,
        sparesOnFloor: 500000,
        sparesInStorage: 250000,
        broken: 100000
      };

      const result = calculateRowTotals(row);

      expect(result.totalOtherUse).toBe(193750); // 100000+50000+25000+10000+5000+2500+1250
      expect(result.sparesAuto).toBe(750000); // 500000+250000
      expect(result.rowTotal).toBe(2043749); // 999999+193750+750000+100000
    });
  });
});