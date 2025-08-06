/**
 * Auth Guard Component
 * Protects routes and handles authentication state
 */

import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import enhancedAuthService from '../../services/enhancedAuthService.v2.js';
import EnhancedLoginForm from './EnhancedLoginForm';

const AuthGuard = ({ children, requireAuth = true }) => {
  const { state, dispatch } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      
      // Check if user is already authenticated
      if (enhancedAuthService.isAuthenticated()) {
        const user = enhancedAuthService.getCurrentUser();
        
        if (user) {
          dispatch({
            type: 'SET_AUTH_STATE',
            payload: {
              isAuthenticated: true,
              user,
              sessionId: enhancedAuthService.getSessionId()
            }
          });
          setLoading(false);
          return;
        }
      }

      // Try to refresh token if we have one
      const refreshed = await enhancedAuthService.refreshToken();
      
      if (refreshed.success) {
        dispatch({
          type: 'SET_AUTH_STATE',
          payload: {
            isAuthenticated: true,
            user: refreshed.user,
            sessionId: refreshed.session_id
          }
        });
      } else if (requireAuth) {
        // Clear any stale auth state
        enhancedAuthService.logout();
        dispatch({
          type: 'SET_AUTH_STATE',
          payload: {
            isAuthenticated: false,
            user: null,
            sessionId: null
          }
        });
        setShowLogin(true);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      if (requireAuth) {
        enhancedAuthService.logout();
        dispatch({
          type: 'SET_AUTH_STATE',
          payload: {
            isAuthenticated: false,
            user: null,
            sessionId: null
          }
        });
        setShowLogin(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (user) => {
    setShowLogin(false);
    dispatch({
      type: 'SET_AUTH_STATE',
      payload: {
        isAuthenticated: true,
        user,
        sessionId: enhancedAuthService.getSessionId()
      }
    });
  };

  // Show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show login form if authentication is required and user is not authenticated
  if (requireAuth && (!state.isAuthenticated || showLogin)) {
    return (
      <EnhancedLoginForm 
        onLogin={handleLogin}
        onClose={() => setShowLogin(false)}
      />
    );
  }

  // Render children if authenticated or auth not required
  return children;
};

export default AuthGuard;
