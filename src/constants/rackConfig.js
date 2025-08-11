/**
 * Rack visualization configuration constants
 */

export const RACK_CONFIG = {
  DEFAULT_HEIGHT: 45,
  UPS_PORTS: 6,
  PDU_PORTS: 12,
  MIN_UNIT: 1,
  MAX_UNIT: 45,
  UNIT_HEIGHT_REM: 1.5,
  
  VIEW_MODES: {
    DETAILED: 'detailed',
    COMPACT: 'compact',
    OVERVIEW: 'overview'
  },
  
  COLORS: {
    EMPTY_UNIT: 'bg-gray-100 dark:bg-gray-800',
    DEVICE_BORDER: 'border-gray-300 dark:border-gray-600',
    HOVER_UNIT: 'bg-blue-50 dark:bg-blue-900/20',
    WARNING: 'text-yellow-500',
    ERROR: 'text-red-500',
    SUCCESS: 'text-green-500'
  }
};

export const DEVICE_TYPES = {
  SERVER: {
    type: 'server',
    icon: 'Server',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-blue-300 dark:border-blue-700',
    defaultSpan: 1,
    maxSpan: 4
  },
  SWITCH: {
    type: 'switch',
    icon: 'Wifi',
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    borderColor: 'border-green-300 dark:border-green-700',
    defaultSpan: 1,
    maxSpan: 2
  },
  ROUTER: {
    type: 'router',
    icon: 'Wifi',
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    borderColor: 'border-purple-300 dark:border-purple-700',
    defaultSpan: 1,
    maxSpan: 2
  },
  STORAGE: {
    type: 'storage',
    icon: 'HardDrive',
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    borderColor: 'border-orange-300 dark:border-orange-700',
    defaultSpan: 2,
    maxSpan: 6
  },
  UPS: {
    type: 'ups',
    icon: 'Zap',
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    borderColor: 'border-red-300 dark:border-red-700',
    defaultSpan: 2,
    maxSpan: 4
  },
  PDU: {
    type: 'pdu',
    icon: 'Power',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    borderColor: 'border-indigo-300 dark:border-indigo-700',
    defaultSpan: 1,
    maxSpan: 2
  },
  FIREWALL: {
    type: 'firewall',
    icon: 'Shield',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    borderColor: 'border-cyan-300 dark:border-cyan-700',
    defaultSpan: 1,
    maxSpan: 2
  },
  MONITOR: {
    type: 'monitor',
    icon: 'Monitor',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    borderColor: 'border-gray-300 dark:border-gray-600',
    defaultSpan: 1,
    maxSpan: 1
  },
  OTHER: {
    type: 'other',
    icon: 'Package',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    borderColor: 'border-gray-300 dark:border-gray-600',
    defaultSpan: 1,
    maxSpan: 8
  }
};

export const POWER_STATUS = {
  ON: { status: 'on', color: 'text-green-500', icon: 'CheckCircle' },
  OFF: { status: 'off', color: 'text-red-500', icon: 'AlertTriangle' },
  UNKNOWN: { status: 'unknown', color: 'text-gray-500', icon: 'Info' }
};

export const THERMAL_STATUS = {
  NORMAL: { status: 'normal', color: 'text-green-500', threshold: [0, 35] },
  WARNING: { status: 'warning', color: 'text-yellow-500', threshold: [36, 45] },
  CRITICAL: { status: 'critical', color: 'text-red-500', threshold: [46, 100] }
};
