// Data templates and examples for bulk import functionality

export const HARDWARE_TEMPLATES = {
  computers: {
    csv: `name,model,serialNumber,os,processor,memory,storage,status
Desktop-001,Dell OptiPlex 7090,ABC123DEF456,Windows 11 Pro,Intel i7-11700,16GB DDR4,512GB NVMe SSD,active
Desktop-002,HP EliteDesk 800,DEF789GHI012,Windows 10 Pro,Intel i5-10500,8GB DDR4,256GB SSD,active
Laptop-001,Lenovo ThinkPad T14,GHI345JKL678,Windows 11 Pro,AMD Ryzen 7 5850U,16GB DDR4,1TB NVMe SSD,active
Workstation-001,Dell Precision 7760,JKL901MNO234,Windows 11 Pro,Intel i9-11950H,32GB DDR4,1TB NVMe SSD,active`,
    
    json: {
      dataType: 'hardware',
      data: {
        hardware: {
          computers: [
            {
              id: 1,
              name: 'Desktop-001',
              model: 'Dell OptiPlex 7090',
              serialNumber: 'ABC123DEF456',
              os: 'Windows 11 Pro',
              processor: 'Intel i7-11700',
              memory: '16GB DDR4',
              storage: '512GB NVMe SSD',
              status: 'active',
              notes: 'Primary workstation for accounting',
              lastUpdated: new Date().toISOString().split('T')[0]
            },
            {
              id: 2,
              name: 'Desktop-002',
              model: 'HP EliteDesk 800',
              serialNumber: 'DEF789GHI012',
              os: 'Windows 10 Pro',
              processor: 'Intel i5-10500',
              memory: '8GB DDR4',
              storage: '256GB SSD',
              status: 'active',
              notes: 'Sales floor workstation',
              lastUpdated: new Date().toISOString().split('T')[0]
            }
          ],
          monitors: [
            {
              id: 1,
              name: 'Monitor-001',
              model: 'Dell P2719H',
              serialNumber: 'MON123ABC456',
              size: '27 inch',
              resolution: '1920x1080',
              status: 'active',
              notes: 'Primary display for Desktop-001'
            }
          ]
        }
      }
    }
  },

  networking: {
    csv: `name,type,model,serialNumber,ipAddress,ports,status
Router-Main,router,Cisco ISR 4331,RTR123ABC456,192.168.1.1,4,active
Switch-Floor1,switch,Cisco Catalyst 2960,SW1234DEF789,192.168.1.10,24,active
Switch-Floor2,switch,HP Aruba 2530,SW5678GHI012,192.168.1.11,48,active
Firewall-01,firewall,SonicWall TZ470,FW9012JKL345,192.168.1.2,8,active
AccessPoint-01,access-point,Ubiquiti UniFi AC Pro,AP3456MNO678,192.168.1.20,2,active`,
    
    json: {
      dataType: 'hardware',
      data: {
        hardware: {
          networking: [
            {
              id: 1,
              name: 'Router-Main',
              type: 'router',
              model: 'Cisco ISR 4331',
              serialNumber: 'RTR123ABC456',
              ipAddress: '192.168.1.1',
              ports: '4',
              status: 'active',
              notes: 'Main internet gateway router'
            },
            {
              id: 2,
              name: 'Switch-Floor1',
              type: 'switch',
              model: 'Cisco Catalyst 2960',
              serialNumber: 'SW1234DEF789',
              ipAddress: '192.168.1.10',
              ports: '24',
              status: 'active',
              notes: 'Main floor network switch'
            }
          ]
        }
      }
    }
  }
};

export const DATACLOSET_TEMPLATES = {
  devices: {
    csv: `deviceName,deviceType,model,serialNumber,locationName,rackName,startUnit,unitSpan,status,notes
Server-001,server,Dell PowerEdge R730,SRV123ABC456,Server Room,Rack-01,1,2,active,Primary domain controller
Server-002,server,HP ProLiant DL380,SRV789DEF012,Server Room,Rack-01,3,2,active,File server
Switch-Core,switch,Cisco Catalyst 3850,SW1111AAA222,Server Room,Rack-01,5,1,active,Core network switch
UPS-01,ups,APC Smart-UPS 3000,UPS333BBB444,Server Room,Rack-01,40,3,active,Backup power supply
Firewall-01,firewall,Fortinet FortiGate 60F,FW555CCC666,Network Closet,Rack-02,1,1,active,Network security appliance
Storage-01,storage,Synology DS1621+,STG777DDD888,Server Room,Rack-01,10,4,active,Network attached storage`,
    
    json: {
      dataType: 'datacloset',
      data: {
        locations: [
          {
            id: 1,
            name: 'Server Room',
            description: 'Main server room with climate control',
            racks: [
              {
                id: 1,
                name: 'Rack-01',
                height: 42,
                devices: [
                  {
                    id: 1,
                    name: 'Server-001',
                    type: 'server',
                    model: 'Dell PowerEdge R730',
                    serialNumber: 'SRV123ABC456',
                    startUnit: 1,
                    unitSpan: 2,
                    status: 'active',
                    notes: 'Primary domain controller'
                  },
                  {
                    id: 2,
                    name: 'Switch-Core',
                    type: 'switch',
                    model: 'Cisco Catalyst 3850',
                    serialNumber: 'SW1111AAA222',
                    startUnit: 5,
                    unitSpan: 1,
                    status: 'active',
                    notes: 'Core network switch'
                  }
                ],
                power: '5.5 kW',
                notes: 'Main equipment rack'
              }
            ]
          }
        ],
        environmental: {
          temperature: '72',
          humidity: '45',
          airflow: 'good',
          powerStatus: 'stable'
        }
      }
    }
  },

  racks: {
    csv: `rackName,locationName,height,power,notes
Rack-01,Server Room,42,5.5kW,Main server rack with UPS backup
Rack-02,Network Closet,24,3kW,Network equipment and patch panels
Rack-03,Storage Room,18,2kW,Storage arrays and backup equipment
Rack-04,Telecom Room,42,4kW,Phone system and communication equipment`,
    
    json: {
      dataType: 'datacloset',
      data: {
        locations: [
          {
            id: 1,
            name: 'Server Room',
            description: 'Primary server room with environmental controls',
            racks: [
              {
                id: 1,
                name: 'Rack-01',
                height: 42,
                devices: [],
                power: '5.5kW',
                notes: 'Main server rack with UPS backup'
              }
            ]
          },
          {
            id: 2,
            name: 'Network Closet',
            description: 'Network equipment closet',
            racks: [
              {
                id: 2,
                name: 'Rack-02',
                height: 24,
                devices: [],
                power: '3kW',
                notes: 'Network equipment and patch panels'
              }
            ]
          }
        ]
      }
    }
  }
};

export const INVENTORY_TEMPLATES = {
  general: {
    csv: `description,inUse,training,conf,gsm,prospecting,applicant,visitor,other,sparesOnFloor,sparesInStorage,broken
PCs,45,5,2,3,8,4,6,2,12,8,3
Laptops,25,8,4,2,12,6,8,1,6,4,2
Monitors,78,12,6,5,16,8,12,4,18,10,5
Phones,52,6,3,4,10,5,7,2,8,6,3
Headsets,48,8,4,3,12,6,8,1,10,8,4
Webcams,35,5,2,2,8,4,6,1,6,4,2
Printers,8,1,1,1,2,1,1,0,2,1,1`,
    
    json: {
      dataType: 'inventory',
      data: {
        inventory: {
          items: [
            {
              description: 'PCs',
              inUse: 45,
              otherUse: {
                training: 5,
                conf: 2,
                gsm: 3,
                prospecting: 8,
                applicant: 4,
                visitor: 6,
                other: 2
              },
              spares: {
                onFloor: 12,
                inStorage: 8
              },
              broken: 3
            },
            {
              description: 'Laptops',
              inUse: 25,
              otherUse: {
                training: 8,
                conf: 4,
                gsm: 2,
                prospecting: 12,
                applicant: 6,
                visitor: 8,
                other: 1
              },
              spares: {
                onFloor: 6,
                inStorage: 4
              },
              broken: 2
            },
            {
              description: 'Monitors',
              inUse: 78,
              otherUse: {
                training: 12,
                conf: 6,
                gsm: 5,
                prospecting: 16,
                applicant: 8,
                visitor: 12,
                other: 4
              },
              spares: {
                onFloor: 18,
                inStorage: 10
              },
              broken: 5
            }
          ],
          specialStations: {
            threeMonitorSetups: 12,
            prospectingStations: 8,
            visitorStations: 6,
            applicantStations: 4,
            eolComputers: 5
          }
        }
      }
    }
  }
};

export const RECYCLING_TEMPLATES = {
  complete: {
    csv: `category,item,quantity,notes,status,priority
broughtBack,17" Monitors,5,Older LCD monitors from floor,completed,normal
broughtBack,Hard drives,8,Various capacity drives for secure wipe,completed,high
broughtBack,Computers,3,End-of-life desktops,completed,normal
pickupRequired,24" Monitors,12,Large monitors need HQ pickup,pending,normal
pickupRequired,UPS batteries,6,Lead acid batteries for disposal,pending,high
pickupRequired,Network devices,4,Old switches and routers,pending,low
sentToHq,Headsets,15,Various wired headsets,completed,normal
sentToHq,Phones,8,Desk phones for refurbishment,completed,normal`,
    
    json: {
      dataType: 'recycling',
      data: {
        recycling: {
          broughtBack: [
            { item: '17" Monitors', quantity: 5, notes: 'Older LCD monitors from floor', status: 'completed' },
            { item: 'Hard drives', quantity: 8, notes: 'Various capacity drives for secure wipe', status: 'completed' },
            { item: 'Computers', quantity: 3, notes: 'End-of-life desktops', status: 'completed' }
          ],
          pickupRequired: [
            { item: '24" Monitors', quantity: 12, notes: 'Large monitors need HQ pickup', status: 'pending', priority: 'normal' },
            { item: 'UPS batteries', quantity: 6, notes: 'Lead acid batteries for disposal', status: 'pending', priority: 'high' },
            { item: 'Network devices', quantity: 4, notes: 'Old switches and routers', status: 'pending', priority: 'low' }
          ],
          sentToHq: [
            { item: 'Headsets', quantity: 15, notes: 'Various wired headsets', status: 'completed' },
            { item: 'Phones', quantity: 8, notes: 'Desk phones for refurbishment', status: 'completed' }
          ],
          scheduled: 'Yes',
          scheduleDate: '2024-02-15',
          scheduledBy: 'John Smith',
          pickupContact: 'jane.doe@company.com'
        }
      }
    }
  }
};

export const COMPLETE_REPORT_TEMPLATE = {
  json: {
    dataType: 'complete',
    exportTimestamp: new Date().toISOString(),
    office: 'Example Office Location',
    date: new Date().toISOString().split('T')[0],
    rss: 'John Smith',
    data: {
      rss: 'John Smith',
      office: 'Example Office Location',
      date: new Date().toISOString().split('T')[0],
      nextVisit: '2024-03-15',
      visitPurpose: 'Quarterly IT assessment and hardware audit',
      
      summary: {
        summaryText: 'Comprehensive IT infrastructure assessment completed. Overall systems running well with some areas for improvement identified.',
        pcRepairsText: 'Resolved 3 desktop issues, updated drivers on 5 machines, replaced 2 failing hard drives.',
        trainingRoomText: 'Training room equipment functional, recommended upgrading projector for better presentations.',
        issuesText: 'Network switch in closet showing intermittent connectivity issues, scheduled for replacement.',
        recommendationsText: 'Recommend upgrading 8 end-of-life computers in Q2, implement backup solution for critical data.',
        followUpText: 'Schedule follow-up in 30 days to verify network switch replacement and backup implementation.'
      },
      
      hardware: {
        computers: [
          {
            id: 1,
            name: 'Desktop-001',
            model: 'Dell OptiPlex 7090',
            serialNumber: 'ABC123DEF456',
            os: 'Windows 11 Pro',
            processor: 'Intel i7-11700',
            memory: '16GB DDR4',
            storage: '512GB NVMe SSD',
            status: 'active',
            notes: 'Primary workstation for accounting'
          }
        ],
        monitors: [
          {
            id: 1,
            name: 'Monitor-001',
            model: 'Dell P2719H',
            serialNumber: 'MON123ABC456',
            size: '27 inch',
            resolution: '1920x1080',
            status: 'active'
          }
        ],
        printers: [
          {
            id: 1,
            name: 'Printer-Main',
            model: 'HP LaserJet Pro 404dn',
            serialNumber: 'PRT789GHI012',
            type: 'laser',
            ipAddress: '192.168.1.100',
            status: 'active'
          }
        ],
        phones: [
          {
            id: 1,
            name: 'Phone-Reception',
            model: 'Cisco IP Phone 8841',
            serialNumber: 'PHN345JKL678',
            extension: '1001',
            department: 'Reception',
            status: 'active'
          }
        ],
        networking: [
          {
            id: 1,
            name: 'Router-Main',
            type: 'router',
            model: 'Cisco ISR 4331',
            serialNumber: 'RTR123ABC456',
            ipAddress: '192.168.1.1',
            ports: '4',
            status: 'active'
          }
        ]
      },
      
      dataCloset: {
        grading: [
          { category: 'Data Closet Appearance', score: '4', comments: 'Clean and well-organized' },
          { category: 'Cable Management', score: '3', comments: 'Good but could use some improvements' },
          { category: 'Labeling', score: '5', comments: 'Excellent labeling throughout' },
          { category: 'Temperature', score: '4', comments: 'Good climate control' },
          { category: 'Physical Security', score: '3', comments: 'Adequate but recommend camera upgrade' },
          { category: 'Device Health', score: '4', comments: 'All devices operational' }
        ],
        overallScore: 77,
        locations: [
          {
            id: 1,
            name: 'Main Server Room',
            description: 'Primary server room with climate control',
            racks: [
              {
                id: 1,
                name: 'Rack-01',
                height: 42,
                devices: [
                  {
                    id: 1,
                    name: 'Server-001',
                    type: 'server',
                    model: 'Dell PowerEdge R730',
                    serialNumber: 'SRV123ABC456',
                    startUnit: 1,
                    unitSpan: 2,
                    status: 'active',
                    notes: 'Primary domain controller'
                  }
                ],
                power: '5.5 kW',
                notes: 'Main equipment rack'
              }
            ]
          }
        ],
        environmental: {
          temperature: '72',
          humidity: '45',
          airflow: 'good',
          powerStatus: 'stable',
          lastChecked: new Date().toISOString().split('T')[0]
        }
      },
      
      inventory: {
        items: [
          {
            description: 'PCs',
            inUse: 45,
            otherUse: { training: 5, conf: 2, gsm: 3, prospecting: 8, applicant: 4, visitor: 6, other: 2 },
            spares: { onFloor: 12, inStorage: 8 },
            broken: 3
          },
          {
            description: 'Laptops',
            inUse: 25,
            otherUse: { training: 8, conf: 4, gsm: 2, prospecting: 12, applicant: 6, visitor: 8, other: 1 },
            spares: { onFloor: 6, inStorage: 4 },
            broken: 2
          }
        ],
        specialStations: {
          threeMonitorSetups: 12,
          prospectingStations: 8,
          visitorStations: 6,
          applicantStations: 4,
          eolComputers: 5
        }
      },
      
      recycling: {
        broughtBack: [
          { item: '17" Monitors', quantity: 5, notes: 'Older LCD monitors', status: 'completed' },
          { item: 'Hard drives', quantity: 8, notes: 'For secure wipe', status: 'completed' }
        ],
        pickupRequired: [
          { item: '24" Monitors', quantity: 12, notes: 'Large monitors', status: 'pending', priority: 'normal' },
          { item: 'UPS batteries', quantity: 6, notes: 'Lead acid batteries', status: 'pending', priority: 'high' }
        ],
        sentToHq: [
          { item: 'Headsets', quantity: 15, notes: 'Various wired headsets', status: 'completed' }
        ],
        scheduled: 'Yes',
        scheduleDate: '2024-02-15'
      },
      
      issues: [
        {
          id: 1,
          title: 'Network Switch Intermittent Issues',
          description: 'Main floor switch experiencing connectivity drops during peak hours',
          severity: 'medium',
          status: 'identified',
          category: 'network',
          reportedDate: new Date().toISOString().split('T')[0]
        }
      ],
      
      recommendations: [
        {
          id: 1,
          title: 'End-of-Life Computer Replacement',
          description: 'Replace 8 computers that are approaching end-of-life status',
          priority: 'medium',
          status: 'proposed',
          category: 'hardware',
          estimatedCost: '$12,000',
          timeline: 'Q2 2024'
        }
      ]
    }
  }
};

// Helper function to get template by type and format
export const getTemplate = (dataType, format = 'json') => {
  const templates = {
    hardware: HARDWARE_TEMPLATES.computers,
    datacloset: DATACLOSET_TEMPLATES.devices,
    inventory: INVENTORY_TEMPLATES.general,
    recycling: RECYCLING_TEMPLATES.complete,
    complete: COMPLETE_REPORT_TEMPLATE
  };
  
  const template = templates[dataType];
  if (!template) return null;
  
  if (format === 'json') {
    return JSON.stringify(template.json, null, 2);
  } else if (format === 'csv') {
    return template.csv;
  }
  
  return null;
};

// Helper function to get all available templates
export const getAvailableTemplates = () => {
  return {
    hardware: {
      computers: 'Computer hardware inventory',
      networking: 'Network equipment inventory'
    },
    datacloset: {
      devices: 'Rack-mounted devices',
      racks: 'Rack configuration'
    },
    inventory: {
      general: 'General office inventory'
    },
    recycling: {
      complete: 'Complete recycling data'
    },
    complete: {
      json: 'Complete report template'
    }
  };
};

export default {
  HARDWARE_TEMPLATES,
  DATACLOSET_TEMPLATES,
  INVENTORY_TEMPLATES,
  RECYCLING_TEMPLATES,
  COMPLETE_REPORT_TEMPLATE,
  getTemplate,
  getAvailableTemplates
};