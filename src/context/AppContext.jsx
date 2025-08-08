import React, { createContext, useContext, useReducer, useEffect, useState, useMemo, useCallback } from 'react';
import { InputSanitizer, AUDIT_LEVELS, SECURITY_EVENTS } from '../utils/security';
import authMiddleware from '../middleware/authMiddleware.js';

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
    recommendations: [],
    
    // Checklists (pushed from templates)
    checklists: []
  },
  user: {
    id: null,
    email: '', // Will be populated from authentication
    username: '',
    displayName: '',
    role: '',
    permissions: [],
    authMethod: null // 'ad', 'local', or 'hybrid'
  },
  isAuthenticated: false,
  sessionId: null,
  authConfig: {
    strategy: 'hybrid',
    adEnabled: false,
    allowLocalAuth: true
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
  RESET_REPORT: 'RESET_REPORT',
  SET_USER: 'SET_USER',
  SET_AUTH_STATE: 'SET_AUTH_STATE',
  SET_AUTH_CONFIG: 'SET_AUTH_CONFIG',
  CLEAR_DATA: 'CLEAR_DATA'
};

// Reducer
const appReducer = (state, action) => {
  console.log('AppContext reducer called:', action.type, action.payload, 'current activePage:', state.activePage);
  switch (action.type) {
    case actionTypes.SET_THEME:
      return { ...state, theme: action.payload };
    
    case actionTypes.SET_ACTIVE_PAGE:
      return { ...state, activePage: action.payload };
    
    case actionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
    
    case actionTypes.UPDATE_REPORT_DATA:
      const { field, value } = action.payload;
      const sanitizedValue = typeof value === 'string' ? InputSanitizer.sanitizeString(value) : value;
      
      return {
        ...state,
        reportData: {
          ...state.reportData,
          [field]: sanitizedValue
        }
      };
    
    case actionTypes.SET_REPORT_DATA:
      console.log('🔧 DEBUG: SET_REPORT_DATA reducer called with:', action.payload);
      console.log('🔧 DEBUG: SET_REPORT_DATA payload checklists:', action.payload?.checklists);
      console.log('🔧 DEBUG: SET_REPORT_DATA payload checklists length:', action.payload?.checklists?.length);
      console.log('🔧 DEBUG: SET_REPORT_DATA payload checklists[0]:', action.payload?.checklists?.[0]);
      const newState = {
        ...state,
        reportData: action.payload
      };
      console.log('🔧 DEBUG: SET_REPORT_DATA new state checklists:', newState.reportData.checklists);
      console.log('🔧 DEBUG: SET_REPORT_DATA new state checklists length:', newState.reportData.checklists?.length);
      return newState;
    
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
    
    case actionTypes.SET_USER:
      return {
        ...state,
        user: action.payload
      };
    
    case actionTypes.SET_AUTH_STATE:
      return {
        ...state,
        isAuthenticated: action.payload.isAuthenticated,
        user: action.payload.user || state.user,
        sessionId: action.payload.sessionId,
        authConfig: { ...state.authConfig, ...action.payload.authConfig }
      };
    
    case actionTypes.SET_AUTH_CONFIG:
      return {
        ...state,
        authConfig: { ...state.authConfig, ...action.payload }
      };
    
    case actionTypes.CLEAR_DATA:
      return {
        ...state,
        reportData: initialState.reportData,
        user: initialState.user,
        isAuthenticated: false,
        sessionId: null,
        notifications: [],
        errors: []
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Initialize authentication system
  const initializeAuthentication = async () => {
    try {
      // Initialize auth middleware
      await authMiddleware.init();
      
      // Get auth configuration
      const authConfig = authMiddleware.getConfig();
      dispatch({ type: actionTypes.SET_AUTH_CONFIG, payload: authConfig });
      
      // Check if user is already authenticated
      const isAuthenticated = authMiddleware.isAuthenticated();
      const currentUser = authMiddleware.getCurrentUser();
      
      if (isAuthenticated && currentUser) {
        dispatch({ 
          type: actionTypes.SET_AUTH_STATE, 
          payload: { 
            isAuthenticated: true, 
            user: currentUser,
            sessionId: currentUser.sessionId,
            authConfig
          } 
        });
      }
      
      // Setup authentication event listeners
      authMiddleware.onAuthChange((event, data) => {
        switch (event) {
          case 'login':
            dispatch({ 
              type: actionTypes.SET_AUTH_STATE, 
              payload: { 
                isAuthenticated: true, 
                user: data,
                sessionId: data.sessionId 
              } 
            });
            break;
            
          case 'logout':
          case 'session-expired':
            dispatch({ 
              type: actionTypes.SET_AUTH_STATE, 
              payload: { 
                isAuthenticated: false, 
                user: initialState.user,
                sessionId: null 
              } 
            });
            // Clear report data on logout for security
            dispatch({ type: actionTypes.RESET_REPORT });
            break;
            
          case 'update':
            const updatedUser = authMiddleware.getCurrentUser();
            if (updatedUser) {
              dispatch({ type: actionTypes.SET_USER, payload: updatedUser });
            }
            break;
        }
      });
      
    } catch (error) {
      console.error('Authentication initialization failed:', error);
      // Continue with local-only mode
      dispatch({ 
        type: actionTypes.SET_AUTH_CONFIG, 
        payload: { 
          strategy: 'local', 
          adEnabled: false, 
          allowLocalAuth: true 
        } 
      });
    }
  };

  // Load saved theme and data on mount
  useEffect(() => {
    const loadData = async () => {
      // Set loading to true at the start
      dispatch({ type: actionTypes.SET_LOADING, payload: true });
      console.log('🔧 DEBUG: Starting data load, setting isLoading: true');
      
      try {
        // Load saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
          dispatch({ type: actionTypes.SET_THEME, payload: savedTheme });
        }

        // Load saved report data (SECURITY WARNING: localStorage is not secure)
        const saved = localStorage.getItem('officeVisitReport');
        console.log('🔧 DEBUG: Loading from localStorage:', saved);
        if (saved) {
          const parsedData = JSON.parse(saved);
          console.log('🔧 DEBUG: Parsed data:', parsedData);
          console.log('🔧 DEBUG: Loaded checklists:', parsedData.checklists);
          // Ensure checklists array exists for backward compatibility
          if (!parsedData.checklists) {
            parsedData.checklists = [];
          }
          console.log('🔧 DEBUG: InitialState checklists:', initialState.reportData.checklists);
          console.log('🔧 DEBUG: ParsedData checklists before merge:', parsedData.checklists);
          
          // Merge with initial state to ensure all properties exist
          const fullData = { ...initialState.reportData, ...parsedData };
          console.log('🔧 DEBUG: Full data after merge:', fullData);
          console.log('🔧 DEBUG: Final checklists after merge:', fullData.checklists);
          dispatch({ type: actionTypes.SET_REPORT_DATA, payload: fullData });
        }
        
        // Initialize authentication system
        await initializeAuthentication();
        
        // Mark initial load as complete and set loading to false
        setIsInitialLoad(false);
        dispatch({ type: actionTypes.SET_LOADING, payload: false });
        console.log('🔧 DEBUG: Data load complete, setting isLoading: false');
        
      } catch (error) {
        console.error('Error loading saved data:', error);
        setIsInitialLoad(false);
        dispatch({ type: actionTypes.SET_LOADING, payload: false });
        console.log('🔧 DEBUG: Data load failed, setting isLoading: false');
        dispatch({
          type: actionTypes.ADD_ERROR,
          payload: {
            message: 'Failed to load saved data',
            level: AUDIT_LEVELS.MEDIUM,
            event: SECURITY_EVENTS.DATA_IMPORT
          }
        });
      }
    };
    
    loadData();
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

  // Debounced save to localStorage to prevent excessive saves
  const debouncedSave = useMemo(() => {
    let timeout;
    return (data) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        try {
          if (import.meta.env.DEV) {
            console.log('Saving to localStorage (debounced)');
          }
          localStorage.setItem('officeVisitReport', JSON.stringify(data));
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
      }, 1000); // 1 second debounce
    };
  }, []);

  // Save data to localStorage when reportData changes (but not during initial load)
  useEffect(() => {
    // Skip saving during initial load to prevent overwriting manually set localStorage data
    if (isInitialLoad) {
      return;
    }
    
    debouncedSave(state.reportData);
  }, [state.reportData, isInitialLoad, debouncedSave]);

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

    // Authentication actions
    setUser: (user) => dispatch({ type: actionTypes.SET_USER, payload: user }),
    
    setAuthState: (authState) => dispatch({ type: actionTypes.SET_AUTH_STATE, payload: authState }),
    
    setAuthConfig: (config) => dispatch({ type: actionTypes.SET_AUTH_CONFIG, payload: config }),
    
    clearData: () => dispatch({ type: actionTypes.CLEAR_DATA }),

    // Enterprise authentication methods
    login: async (username, password, rememberMe = false, authType = 'auto') => {
      try {
        dispatch({ type: actionTypes.SET_LOADING, payload: true });
        const result = await authMiddleware.authenticate(username, password, rememberMe, authType);
        
        if (result.success) {
          dispatch({ 
            type: actionTypes.SET_AUTH_STATE, 
            payload: { 
              isAuthenticated: true, 
              user: result.user,
              sessionId: result.sessionId 
            } 
          });
          
          dispatch({
            type: actionTypes.ADD_NOTIFICATION,
            payload: {
              type: 'success',
              message: `Welcome, ${result.user.displayName || result.user.username}!`
            }
          });
        }
        
        return result;
        
      } catch (error) {
        dispatch({
          type: actionTypes.ADD_ERROR,
          payload: {
            message: error.message || 'Authentication failed',
            level: AUDIT_LEVELS.MEDIUM,
            event: SECURITY_EVENTS.AUTH_FAILURE
          }
        });
        throw error;
      } finally {
        dispatch({ type: actionTypes.SET_LOADING, payload: false });
      }
    },

    logout: async () => {
      try {
        await authMiddleware.logout();
        
        dispatch({ 
          type: actionTypes.SET_AUTH_STATE, 
          payload: { 
            isAuthenticated: false, 
            user: initialState.user,
            sessionId: null 
          } 
        });
        
        // Clear sensitive data
        dispatch({ type: actionTypes.RESET_REPORT });
        
        dispatch({
          type: actionTypes.ADD_NOTIFICATION,
          payload: {
            type: 'info',
            message: 'You have been logged out successfully.'
          }
        });
        
      } catch (error) {
        console.warn('Logout error:', error);
        // Clear state anyway for security
        dispatch({ 
          type: actionTypes.SET_AUTH_STATE, 
          payload: { 
            isAuthenticated: false, 
            user: initialState.user,
            sessionId: null 
          } 
        });
      }
    },

    // Permission checking methods
    hasPermission: (permission) => {
      // Fallback for demo mode - if authMiddleware isn't initialized or no enterprise auth
      try {
        // Convert id to string for safety since it might be a number
        const userId = String(state.user?.id || '');
        const username = state.user?.username || '';
        const isDemoUser = username === 'demo' || username === 'admin' || userId.includes('demo') || userId === '2';
        const isRegularDemoUser = username === 'demo' && (userId === 'demo-user-001' || userId === '1');
        const isAdminDemoUser = username === 'admin' || userId === '2' || userId === 'admin-demo-001';
        
        // Block admin permissions for regular demo users only
        if (isRegularDemoUser && (permission.startsWith('admin:') || permission.startsWith('system:'))) {
          console.log(`🔍 BLOCKED: Regular demo users cannot have admin permissions (${permission})`);
          return false;
        }
        
        // Grant all permissions to admin demo users
        if (isAdminDemoUser) {
          console.log(`🔍 GRANTED: Admin demo user has permission (${permission})`);
          return true;
        }
        
        if (!isDemoUser && authMiddleware && typeof authMiddleware.hasPermission === 'function') {
          return authMiddleware.hasPermission(permission);
        }
        
        // Demo fallback - basic permission checking
        if (state.user?.permissions?.includes(permission)) {
          return true;
        }
        
        // For demo compatibility, allow most permissions except admin
        return !permission.startsWith('admin:') && !permission.startsWith('system:');
      } catch (error) {
        console.warn('Permission check failed, using demo fallback:', error);
        return !permission.startsWith('admin:') && !permission.startsWith('system:');
      }
    },
    
    hasRole: (role) => {
      // DEBUG: Add detailed logging for role checks
      console.log(`🔍 hasRole(${role}) called:`, {
        hasAuthMiddleware: !!authMiddleware,
        authMiddlewareHasRoleFunction: authMiddleware && typeof authMiddleware.hasRole === 'function',
        userRole: state.user?.role,
        userRoleType: typeof state.user?.role,
        isAuthenticated: state.isAuthenticated,
        requestedRole: role,
        requestedRoleType: typeof role
      });
      
      // Fallback for demo mode - prioritize demo users
      try {
        // If this is a demo user (username 'demo' or 'admin'), use demo logic
        // Convert id to string for safety since it might be a number
        const userId = String(state.user?.id || '');
        const username = state.user?.username || '';
        
        // Check if this is any kind of demo user
        const isDemoUser = username === 'demo' || username === 'admin' || userId.includes('demo') || userId === '2';
        const isRegularDemoUser = username === 'demo' && (userId === 'demo-user-001' || userId === '1');
        const isAdminDemoUser = username === 'admin' || userId === '2' || userId === 'admin-demo-001';
        
        console.log(`🔍 Role check for '${role}':`, {
          username,
          userId,
          userRole: state.user?.role,
          isDemoUser,
          isRegularDemoUser,
          isAdminDemoUser
        });
        
        // For demo users, skip authMiddleware and use direct role checking
        if (isDemoUser) {
          console.log(`🔍 Using demo logic for role ${role}`);
          
          // Block admin role for regular demo users only
          if (isRegularDemoUser && role === 'admin') {
            console.log(`🔍 BLOCKED: Regular demo users cannot have admin role`);
            return false;
          }
          
          // For admin demo users, grant admin role
          if (isAdminDemoUser && role === 'admin') {
            console.log(`🔍 GRANTED: Admin demo user has admin role`);
            return true;
          }
          
          // Check exact role match
          const exactMatch = state.user?.role === role;
          console.log(`🔍 Exact role match (${state.user?.role} === ${role}): ${exactMatch}`);
          if (exactMatch) {
            return true;
          }
          
          // For admin users, they have access to all roles
          if (state.user?.role === 'admin') {
            console.log(`🔍 GRANTED: Admin has access to all roles`);
            return true;
          }
        }
        
        // Only try authMiddleware if not a demo user
        if (!isDemoUser && authMiddleware && typeof authMiddleware.hasRole === 'function') {
          console.log(`🔍 Using authMiddleware.hasRole for ${role}`);
          const result = authMiddleware.hasRole(role);
          console.log(`🔍 authMiddleware.hasRole(${role}) = ${result}`);
          return result;
        }
        
        // For demo compatibility, treat authenticated users as technicians (can access most features except admin)
        const isAuthenticatedTechOrViewer = state.isAuthenticated && (role === 'technician' || role === 'viewer') && role !== 'admin';
        console.log(`🔍 Auth fallback (isAuth: ${state.isAuthenticated}, role: ${role}): ${isAuthenticatedTechOrViewer}`);
        if (isAuthenticatedTechOrViewer) {
          return true;
        }
        
        console.log(`🔍 hasRole(${role}) returning false - no matches`);
        return false;
      } catch (error) {
        console.warn('Role check failed, using demo fallback:', error);
        // Default to technician role for demo
        return role === 'technician' || role === 'viewer';
      }
    },
    
    // Session management
    validateSession: () => authMiddleware.validateSession(),
    
    refreshToken: () => authMiddleware.refreshToken(),

    // Theme toggle
    toggleTheme: () => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      dispatch({ type: actionTypes.SET_THEME, payload: newTheme });
    }
  };

  const value = {
    // Expose state properties directly
    ...state,
    // Keep state object for backward compatibility
    state,
    dispatch,
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

export { AppContext, actionTypes };