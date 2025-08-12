import React from 'react';

/**
 * Build power tables showing only PDUs and UPSs with per-port mappings
 */
function buildPowerTables(devs) {
  const srcs = devs.filter(d => d.type === 'pdu' || d.type === 'ups');
  const consumers = devs.filter(d => !(d.type === 'pdu' || d.type === 'ups'));

  return srcs.map(src => {
    const ports = (src.outlets?.map(String)) ?? Array.from({length: 24}, (_, i) => (i + 1).toString());
    const rows = ports.map(port => {
      const c = consumers.find(x => x.power?.sourceId === src.id && String(x.power?.port) === port);
      return { 
        port, 
        device: c?.name ?? '', 
        rack: c?.rackId ?? '', 
        position: c ? `U${c.startU}` : '' 
      };
    });

    return { source: src, rows };
  });
}

/**
 * PowerMapping component - shows only PDU/UPS devices with per-port tables
 */
const PowerMapping = ({ devices = [] }) => {
  const powerTables = buildPowerTables(devices);

  if (powerTables.length === 0) {
    return (
      <div className="power-mapping">
        <h3>Power Outlet Mapping</h3>
        <p>No PDU or UPS devices found.</p>
      </div>
    );
  }

  return (
    <div className="power-mapping">
      <h3>Power Outlet Mapping</h3>
      {powerTables.map(({ source, rows }) => (
        <div key={source.id} className="power-source-table">
          <h4>{source.name} ({source.type.toUpperCase()})</h4>
          <table className="power-table">
            <thead>
              <tr>
                <th>Port</th>
                <th>Connected Device</th>
                <th>Rack</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.port}>
                  <td>{row.port}</td>
                  <td>{row.device}</td>
                  <td>{row.rack}</td>
                  <td>{row.position}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default PowerMapping;