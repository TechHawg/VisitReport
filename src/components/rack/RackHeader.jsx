import React from 'react';
import { Activity, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const RackHeader = ({ rack, utilization, viewMode }) => {
  if (!rack) return null;

  const getUtilizationColor = (status) => {
    switch (status) {
      case 'critical': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'moderate': return 'text-blue-500';
      default: return 'text-green-500';
    }
  };

  const getUtilizationIcon = (status) => {
    switch (status) {
      case 'critical': return AlertTriangle;
      case 'warning': return Info;
      case 'moderate': return Activity;
      default: return CheckCircle;
    }
  };

  const UtilizationIcon = getUtilizationIcon(utilization.status);

  if (viewMode === 'compact') {
    return (
      <div className="flex justify-between items-center mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="font-semibold text-sm">{rack.name}</h3>
        <div className="flex items-center space-x-2">
          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                utilization.status === 'critical' ? 'bg-red-500' :
                utilization.status === 'warning' ? 'bg-yellow-500' :
                utilization.status === 'moderate' ? 'bg-blue-500' : 'bg-green-500'
              }`}
              style={{ width: `${utilization.percentage}%` }}
            />
          </div>
          <span className="text-xs font-medium">{utilization.percentage}%</span>
        </div>
      </div>
    );
  }

  if (viewMode === 'overview') {
    return (
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg">{rack.name}</h3>
            {rack.location && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{rack.location}</p>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 mb-1">
              <UtilizationIcon 
                size={16} 
                className={getUtilizationColor(utilization.status)}
              />
              <span className={`font-semibold ${getUtilizationColor(utilization.status)}`}>
                {utilization.percentage}%
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {utilization.occupied}/{utilization.total} units
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Detailed view
  return (
    <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{rack.name}</h3>
          {rack.location && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{rack.location}</p>
          )}
          {rack.description && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{rack.description}</p>
          )}
        </div>
        
        <div className="text-right">
          <div className="flex items-center space-x-2 mb-2">
            <UtilizationIcon 
              size={18} 
              className={getUtilizationColor(utilization.status)}
            />
            <span className={`text-lg font-bold ${getUtilizationColor(utilization.status)}`}>
              {utilization.percentage}%
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Utilization
          </div>
        </div>
      </div>

      {/* Utilization Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Rack Units</span>
          <span>{utilization.occupied} of {utilization.total} occupied</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              utilization.status === 'critical' ? 'bg-red-500' :
              utilization.status === 'warning' ? 'bg-yellow-500' :
              utilization.status === 'moderate' ? 'bg-blue-500' : 'bg-green-500'
            }`}
            style={{ width: `${utilization.percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>Available: {utilization.available}U</span>
          <span>
            Status: <span className={getUtilizationColor(utilization.status)}>
              {utilization.status.charAt(0).toUpperCase() + utilization.status.slice(1)}
            </span>
          </span>
        </div>
      </div>

      {/* Additional rack metadata */}
      {(rack.manufacturer || rack.model || rack.height) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {rack.manufacturer && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Manufacturer:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{rack.manufacturer}</span>
            </div>
          )}
          {rack.model && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Model:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{rack.model}</span>
            </div>
          )}
          {rack.height && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Height:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{rack.height}U</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RackHeader;
