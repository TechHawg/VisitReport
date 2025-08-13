import React from 'react';

const typeColor: Record<string, string> = {
  switch: 'bg-blue-200',
  server: 'bg-green-200', 
  pdu: 'bg-amber-200',
  ups: 'bg-purple-200',
  device: 'bg-sky-200',
  empty: 'bg-gray-100'
};

type Props = {
  types?: string[];
};

export default function RackLegend({ types }: Props) {
  const displayTypes = types || Object.keys(typeColor);
  
  return (
    <div className="rack-legend" role="img" aria-label="Device type color legend">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Device Types</h4>
      <div className="flex flex-wrap gap-2">
        {displayTypes.map(type => (
          <div key={type} className="flex items-center gap-1">
            <div 
              className={`w-4 h-4 border border-gray-300 rounded ${typeColor[type] || 'bg-gray-100'}`}
              aria-hidden="true"
            />
            <span className="text-xs text-gray-600 capitalize">
              {type.replace('-', ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}