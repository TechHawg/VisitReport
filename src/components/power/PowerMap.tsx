import React, { useState } from 'react';

type Props = { 
  selectedPdu: { name: string; portCount: number }; 
  connections: Record<number, string>;
  onConnectionsChange?: (connections: Record<number, string>) => void;
};

export function validateConnections(connections: Record<number, string>, portCount: number): string[] {
  const errors: string[] = [];
  
  Object.entries(connections).forEach(([portStr, device]) => {
    const port = Number(portStr);
    if (device && (port < 1 || port > portCount)) {
      errors.push(`Port ${port} is outside valid range (1-${portCount})`);
    }
  });
  
  return errors;
}

export default function PowerMap({ selectedPdu, connections, onConnectionsChange }: Props) {
  const [localConnections, setLocalConnections] = useState(connections);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const ports = Array.from({ length: selectedPdu.portCount }, (_, i) => i + 1);
  const rows = ports.map(p => ({ port: p, device: localConnections[p] ?? '' }));

  const handleDeviceChange = (port: number, device: string) => {
    const newConnections = { ...localConnections, [port]: device };
    setLocalConnections(newConnections);
    
    // Validate connections
    const errors = validateConnections(newConnections, selectedPdu.portCount);
    setValidationErrors(errors);
    
    // Notify parent component
    if (onConnectionsChange) {
      onConnectionsChange(newConnections);
    }
  };

  const handleSave = () => {
    const errors = validateConnections(localConnections, selectedPdu.portCount);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return false;
    }
    setValidationErrors([]);
    return true;
  };

  return (
    <div className="power-map">
      <h3 className="text-lg font-semibold mb-4">
        Power Connections - {selectedPdu.name} ({selectedPdu.portCount} ports)
      </h3>
      
      {validationErrors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <h4 className="text-red-800 font-medium">Validation Errors:</h4>
          <ul className="text-red-700 text-sm mt-1">
            {validationErrors.map((error, idx) => (
              <li key={idx}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 px-3 py-2 bg-gray-50">Port</th>
              <th className="border border-gray-300 px-3 py-2 bg-gray-50">Connected Device</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ port, device }) => (
              <tr key={port}>
                <td className="border border-gray-300 px-3 py-2 font-mono text-center">
                  {port}
                </td>
                <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="text"
                    value={device}
                    onChange={(e) => handleDeviceChange(port, e.target.value)}
                    className="w-full px-2 py-1 border border-gray-200 rounded"
                    placeholder="Enter device name"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={validationErrors.length > 0}
        >
          Save Connections
        </button>
      </div>
    </div>
  );
}