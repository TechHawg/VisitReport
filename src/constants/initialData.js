// Initial data structure for RSS Visit Report
export const initialData = {
  rss: '', 
  office: '', 
  date: new Date().toISOString().split('T')[0], 
  nextVisit: '',
  summary: { 
    summaryText: '', 
    pcRepairsText: '', 
    trainingRoomText: '', 
    issuesText: '', 
    recommendationsText: '', 
    followUpText: '' 
  },
  pictures: { 
    dataCloset: [], 
    trainingRoom: [] 
  },
  officeGrading: [
    { category: 'IT Relationship', score: '', comments: '' },
    { category: 'Inventory', score: '', comments: '' },
    { category: 'Sales Floor - IT Experience', score: '', comments: '' },
    { category: 'Data Closet', score: '', comments: '' },
  ],
  officeGrade: 'N/A',
  officeHardware: [],
  dataCloset: {
    grading: [
      { category: 'Data Closet Appearance', score: '', comments: '' },
      { category: 'Cable Management', score: '', comments: '' },
      { category: 'Labeling', score: '', comments: '' },
      { category: 'Temperature', score: '', comments: '' },
      { category: 'Physical Security', score: '', comments: '' },
      { category: 'Device Health', score: '', comments: '' },
    ],
    score: 'N/A',
    deviceLocations: [],
    rackLocations: [],
  },
  inventory: {
    items: [
      { description: 'PCs', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'Laptops', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'Monitors', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'Webcams', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'Phones', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'Headsets', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'Direct Connect', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'Workstations', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'Desk Chairs', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'Wireless Headsets', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
      { description: 'VPN Phone', inUse: 0, otherUse: { training: 0, conf: 0, gsm: 0, prospecting: 0, applicant: 0, visitor: 0, other: 0 }, spares: { onFloor: 0, inStorage: 0 }, broken: 0 },
    ],
    specialStations: {
      threeMonitorSetups: 0,
      prospectingStations: 0,
      visitorStations: 0,
      applicantStations: 0,
      eolComputers: 0
    }
  },
  recycling: {
    broughtBack: [ 
      { item: '17" Monitors', quantity: 0 }, 
      { item: '24" Monitors', quantity: 0 }, 
      { item: 'Hard drives', quantity: 0 }, 
      { item: 'Computers', quantity: 0 }, 
      { item: 'Network devices', quantity: 0 }, 
      { item: 'Printer', quantity: 0 }, 
      { item: 'UPS batteries', quantity: 0 }, 
      { item: 'Other', quantity: 0 } 
    ],
    pickupRequired: [ 
      { item: '17" Monitors', quantity: 0 }, 
      { item: '24" Monitors', quantity: 0 }, 
      { item: 'Hard drives', quantity: 0 }, 
      { item: 'Computers', quantity: 0 }, 
      { item: 'Network devices', quantity: 0 }, 
      { item: 'Printer', quantity: 0 }, 
      { item: 'UPS batteries', quantity: 0 }, 
      { item: 'Other', quantity: 0 } 
    ],
    sentToHq: [ 
      { item: 'Headsets', quantity: 0 }, 
      { item: 'Direct Connects', quantity: 0 }, 
      { item: 'Webcams', quantity: 0 }, 
      { item: 'Phones', quantity: 0 } 
    ],
    scheduled: 'No', 
    scheduleDate: ''
  }
};