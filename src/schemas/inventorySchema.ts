import { z } from 'zod';

// Number field schema - validates integers >= 0
const positiveIntegerField = z.union([
  z.number().int().nonnegative(),
  z.string().transform((val) => {
    const cleaned = val.replace(/,/g, '').trim();
    if (cleaned === '') return 0;
    const num = Number(cleaned);
    if (!Number.isFinite(num) || num < 0) return 0;
    return Math.floor(num);
  }).pipe(z.number().int().nonnegative())
]);

// Individual inventory row schema
export const inventoryRowSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().min(1, 'Item name is required'),
  inUseByEmployees: positiveIntegerField,
  training: positiveIntegerField,
  conferenceRoom: positiveIntegerField,
  gsmOffice: positiveIntegerField,
  prospectingStation: positiveIntegerField,
  applicantStation: positiveIntegerField,
  visitorStation: positiveIntegerField,
  other: positiveIntegerField,
  sparesOnFloor: positiveIntegerField,
  sparesInStorage: positiveIntegerField,
  broken: positiveIntegerField
});

// KPI data schema for footer boxes
export const kpiDataSchema = z.object({
  threeMonitorSetups: positiveIntegerField,
  prospectingStations: positiveIntegerField,
  visitorStations: positiveIntegerField,
  applicantStations: positiveIntegerField,
  eolComputers: positiveIntegerField,
  officeHeadcount: positiveIntegerField
});

// Header info schema
export const headerInfoSchema = z.object({
  location: z.string().trim().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  recordedBy: z.string().trim().optional()
});

// Complete inventory data schema
export const inventoryDataSchema = z.object({
  items: z.array(inventoryRowSchema).min(1, 'At least one inventory item is required'),
  kpiData: kpiDataSchema,
  headerInfo: headerInfoSchema,
  lastUpdated: z.string().optional(),
  notes: z.string().optional()
});

// Type exports
export type InventoryRowType = z.infer<typeof inventoryRowSchema>;
export type KpiDataType = z.infer<typeof kpiDataSchema>;
export type HeaderInfoType = z.infer<typeof headerInfoSchema>;
export type InventoryDataType = z.infer<typeof inventoryDataSchema>;

// Validation functions
export const validateInventoryRow = (data: unknown) => {
  return inventoryRowSchema.safeParse(data);
};

export const validateKpiData = (data: unknown) => {
  return kpiDataSchema.safeParse(data);
};

export const validateHeaderInfo = (data: unknown) => {
  return headerInfoSchema.safeParse(data);
};

export const validateInventoryData = (data: unknown) => {
  return inventoryDataSchema.safeParse(data);
};

// Default data generators
export const createDefaultInventoryRow = (name: string, id?: string): InventoryRowType => ({
  id: id || `item-${Date.now()}`,
  name,
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
});

export const createDefaultKpiData = (): KpiDataType => ({
  threeMonitorSetups: 0,
  prospectingStations: 0,
  visitorStations: 0,
  applicantStations: 0,
  eolComputers: 0,
  officeHeadcount: 0
});

export const createDefaultHeaderInfo = (): HeaderInfoType => ({
  location: '',
  date: new Date().toISOString().split('T')[0],
  recordedBy: ''
});

export const createDefaultInventoryData = (): InventoryDataType => {
  const defaultItems = [
    'PCs', 'Laptops', 'Monitors', 'Webcams', 'Phones', 'Headsets',
    'Direct Connect', 'Workstations', 'Desk Chairs', 'Wireless Headsets', 'VPN Phone'
  ];

  return {
    items: defaultItems.map((name, index) => createDefaultInventoryRow(name, `item-${index}`)),
    kpiData: createDefaultKpiData(),
    headerInfo: createDefaultHeaderInfo(),
    lastUpdated: new Date().toISOString().split('T')[0],
    notes: ''
  };
};