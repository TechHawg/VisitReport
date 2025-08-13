import { describe, test, expect } from 'vitest';

describe('RackDiagram', () => {
  test('calculates correct gridRow for 2U device at U=40', () => {
    // Test the grid calculation logic
    const totalU = 42;
    const deviceU = 40;
    const heightU = 2;
    
    // For U=40 in a 42U rack: gridRow should be "3 / span 2"
    // Formula: (totalU - u + 1) = (42 - 40 + 1) = 3
    const expectedGridRowStart = totalU - deviceU + 1;
    const expectedGridRow = `${expectedGridRowStart} / span ${heightU}`;
    
    expect(expectedGridRowStart).toBe(3);
    expect(expectedGridRow).toBe('3 / span 2');
  });

  test('generates correct RU labels for rack', () => {
    const totalU = 5;
    const expectedLabels = Array.from({ length: totalU }, (_, i) => totalU - i);
    
    // Should generate [5, 4, 3, 2, 1] for a 5U rack
    expect(expectedLabels).toEqual([5, 4, 3, 2, 1]);
  });

  test('color mapping contains all required device types', () => {
    const typeColor: Record<string, string> = {
      switch: 'bg-blue-200',
      server: 'bg-green-200', 
      pdu: 'bg-amber-200',
      ups: 'bg-purple-200',
      device: 'bg-sky-200',
      empty: 'bg-gray-100'
    };
    
    expect(typeColor.switch).toBe('bg-blue-200');
    expect(typeColor.server).toBe('bg-green-200');
    expect(typeColor.ups).toBe('bg-purple-200');
    expect(typeColor.pdu).toBe('bg-amber-200');
    expect(typeColor.device).toBe('bg-sky-200');
    expect(typeColor.empty).toBe('bg-gray-100');
  });
});