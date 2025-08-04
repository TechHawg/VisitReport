import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { sanitizeInput, AUDIT_LEVELS, SECURITY_EVENTS } from '../utils/security';

// Initial state
const initialState = {
  theme: 'light',
  activePage: 'Dashboard',
  isLoading: false,
  reportData: {
    // Basic report information
    rss: '', 
    office: '', 
    date: new Date().toISOString().split('T')[0], 
    nextVisit: '',
    visitPurpose: '',
    
    // Summary section with detailed breakdown
    summary: { 
      summaryText: '', 
      pcRepairsText: '', 
      trainingRoomText: '', 
      issuesText: '', 
      recommendationsText: '', 
      followUpText: '' 
    },
    
    // Photo uploads
    pictures: { 
      dataCloset: [], 
      trainingRoom: [] 
    },
    
    // Office grading system
    officeGrading: [
      { category: 'IT Relationship', score: '', comments: '' },
      { category: 'Inventory', score: '', comments: '' },
      { category: 'Sales Floor - IT Experience', score: '', comments: '' },
      { category: 'Data Closet', score: '', comments: '' },
    ],
    officeGrade: 'N/A',
    
    // Hardware infrastructure
    hardware: {
      computers: [],
      monitors: [],
      printers: [],
      phones: [],
      tablets: [],
      networking: [],
      lastUpdated: new Date().toISOString().split('T')[0]
    },
    officeHardware: [], // Legacy field for compatibility
    
    // Data closet management
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
    
    // Comprehensive inventory management
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
      },
      lastUpdated: new Date().toISOString().split('T')[0],
      notes: ''
    },
    
    // Comprehensive recycling management
    recycling: {
      broughtBack: [ 
        { item: '17" Monitors', quantity: 0, notes: '', status: 'completed' }, 
        { item: '24" Monitors', quantity: 0, notes: '', status: 'completed' }, 
        { item: 'Hard drives', quantity: 0, notes: '', status: 'completed' }, 
        { item: 'Computers', quantity: 0, notes: '', status: 'completed' }, 
        { item: 'Network devices', quantity: 0, notes: '', status: 'completed' }, 
        { item: 'Printer', quantity: 0, notes: '', status: 'completed' }, 
        { item: 'UPS batteries', quantity: 0, notes: '', status: 'completed' }, 
        { item: 'Other', quantity: 0, notes: '', status: 'completed' } 
      ],
      pickupRequired: [ 
        { item: '17" Monitors', quantity: 0, notes: '', status: 'pending', priority: 'normal' }, 
        { item: '24" Monitors', quantity: 0, notes: '', status: 'pending', priority: 'normal' }, 
        { item: 'Hard drives', quantity: 0, notes: '', status: 'pending', priority: 'high' }, 
        { item: 'Computers', quantity: 0, notes: '', status: 'pending', priority: 'normal' }, 
        { item: 'Network devices', quantity: 0, notes: '', status: 'pending', priority: 'normal' }, 
        { item: 'Printer', quantity: 0, notes: '', status: 'pending', priority: 'low' }, 
        { item: 'UPS batteries', quantity: 0, notes: '', status: 'pending', priority: 'high' }, 
        { item: 'Other', quantity: 0, notes: '', status: 'pending', priority: 'normal' } 
      ],
      sentToHq: [ 
        { item: 'Headsets', quantity: 0, notes: '', status: 'completed' }, 
        { item: 'Direct Connects', quantity: 0, notes: '', status: 'completed' }, 
        { item: 'Webcams', quantity: 0, notes: '', status: 'completed' }, 
        { item: 'Phones', quantity: 0, notes: '', status: 'completed' } 
      ],
      scheduled: 'No', 
      scheduleDate: '',
      scheduledBy: '',
      pickupContact: '',
      lastUpdated: new Date().toISOString().split('T')[0],
      generalNotes: ''
    },
    
    // Issues and recommendations tracking
    issues: [],
    recommendations: []
  },
  user: {
    email: 'development-user@company.com', // TODO: Replace with proper auth
    role: 'admin',
    permissions: ['read', 'write', 'submit']
  },
  notifications: [],
  errors: []
};

// Action types
const actionTypes = {
  SET_THEME: 'SET_THEME',
  SET_ACTIVE_PAGE: 'SET_ACTIVE_PAGE',
  SET_LOADING: 'SET_LOADING',
  UPDATE_REPORT_DATA: 'UPDATE_REPORT_DATA',
  SET_REPORT_DATA: 'SET_REPORT_DATA',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  ADD_ERROR: 'ADD_ERROR',
  CLEAR_ERRORS: 'CLEAR_ERRORS',
  RESET_REPORT: 'RESET_REPORT'
};

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_THEME:
      return { ...state, theme: action.payload };
    
    case actionTypes.SET_ACTIVE_PAGE:
      return { ...state, activePage: action.payload };
    
    case actionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
    
    case actionTypes.UPDATE_REPORT_DATA:
      const { field, value } = action.payload;
      const sanitizedValue = typeof value === 'string' ? sanitizeInput(value) : value;
      
      return {
        ...state,
        reportData: {
          ...state.reportData,
          [field]: sanitizedValue
        }
      };
    
    case actionTypes.SET_REPORT_DATA:
      return {
        ...state,
        reportData: { ...state.reportData, ...action.payload }
      };
    
    case actionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, {
          id: Date.now(),
          ...action.payload
        }]
      };
    
    case actionTypes.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    
    case actionTypes.ADD_ERROR:
      return {
        ...state,
        errors: [...state.errors, {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          ...action.payload
        }]
      };
    
    case actionTypes.CLEAR_ERRORS:
      return { ...state, errors: [] };
    
    case actionTypes.RESET_REPORT:
      return {
        ...state,
        reportData: initialState.reportData
      };
    
    default:
      return state;
  }
};

// Context
const AppContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load saved theme and data on mount
  useEffect(() => {
    try {
      // Load saved theme
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        dispatch({ type: actionTypes.SET_THEME, payload: savedTheme });
      }

      // Load saved report data (SECURITY WARNING: localStorage is not secure)
      const saved = localStorage.getItem('officeVisitReport');
      if (saved) {
        const parsedData = JSON.parse(saved);
        dispatch({ type: actionTypes.SET_REPORT_DATA, payload: parsedData });
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
      dispatch({
        type: actionTypes.ADD_ERROR,
        payload: {
          message: 'Failed to load saved data',
          level: AUDIT_LEVELS.MEDIUM,
          event: SECURITY_EVENTS.DATA_IMPORT
        }
      });
    }
  }, []);

  // Apply theme class to document element when theme changes
  useEffect(() => {
    const root = document.documentElement;
    
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Save theme to localStorage
    try {
      localStorage.setItem('theme', state.theme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }, [state.theme]);

  // Save data to localStorage when reportData changes
  useEffect(() => {
    try {
      localStorage.setItem('officeVisitReport', JSON.stringify(state.reportData));
    } catch (error) {
      console.error('Error saving data:', error);
      dispatch({
        type: actionTypes.ADD_ERROR,
        payload: {
          message: 'Failed to save data',
          level: AUDIT_LEVELS.MEDIUM,
          event: SECURITY_EVENTS.DATA_EXPORT
        }
      });
    }
  }, [state.reportData]);

  // Action creators
  const actions = {
    setTheme: (theme) => dispatch({ type: actionTypes.SET_THEME, payload: theme }),
    
    setActivePage: (page) => dispatch({ type: actionTypes.SET_ACTIVE_PAGE, payload: page }),
    
    setLoading: (loading) => dispatch({ type: actionTypes.SET_LOADING, payload: loading }),
    
    updateReportData: (field, value) => 
      dispatch({ type: actionTypes.UPDATE_REPORT_DATA, payload: { field, value } }),
    
    setReportData: (data) => dispatch({ type: actionTypes.SET_REPORT_DATA, payload: data }),
    
    addNotification: (notification) => 
      dispatch({ type: actionTypes.ADD_NOTIFICATION, payload: notification }),
    
    removeNotification: (id) => 
      dispatch({ type: actionTypes.REMOVE_NOTIFICATION, payload: id }),
    
    addError: (error) => dispatch({ type: actionTypes.ADD_ERROR, payload: error }),
    
    clearErrors: () => dispatch({ type: actionTypes.CLEAR_ERRORS }),
    
    resetReport: () => dispatch({ type: actionTypes.RESET_REPORT }),

    // Theme toggle
    toggleTheme: () => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      dispatch({ type: actionTypes.SET_THEME, payload: newTheme });
    }
  };

  const value = {
    ...state,
    ...actions
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Hook to use the context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export { actionTypes };