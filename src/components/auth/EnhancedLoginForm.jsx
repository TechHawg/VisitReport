/**
 * Enhanced LoginForm Component
 * Improved error handling, validation, and user experience
 */

import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import enhancedAuthService, { AUTH_EVENTS } from '../../services/enhancedAuthService.v2.js';
import { ValidationError, AuthenticationError, NetworkError } from '../../services/apiClient.js';

const EnhancedLoginForm = ({ onLogin, onClose }) => {
  const { dispatch } = useContext(AppContext);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  
  const [state, setState] = useState({
    loading: false,
    error: '',
    errorType: null,
    showPassword: false,
    attempts: 0,
    isLocked: false,
    lockoutTime: 0
  });
  
  const [validation, setValidation] = useState({
    username: { isValid: true, message: '' },
    password: { isValid: true, message: '' }
  });

  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const submitButtonRef = useRef(null);

  // Focus username field on mount
  useEffect(() => {
    if (usernameRef.current) {
      usernameRef.current.focus();
    }
  }, []);

  // Check for account lockout on mount
  useEffect(() => {
    checkLockoutStatus();
  }, []);

  // Listen to auth events
  useEffect(() => {
    const unsubscribeLoginStart = enhancedAuthService.on(AUTH_EVENTS.LOGIN_START, () => {
      setState(prev => ({ ...prev, loading: true, error: '', errorType: null }));
    });

    const unsubscribeLoginFailure = enhancedAuthService.on(AUTH_EVENTS.LOGIN_FAILURE, (data) => {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        attempts: data.attempts || 0 
      }));
      checkLockoutStatus();
    });

    return () => {
      unsubscribeLoginStart();
      unsubscribeLoginFailure();
    };
  }, []);

  /**
   * Check if account is locked
   */
  const checkLockoutStatus = () => {
    const isLocked = enhancedAuthService.isAccountLocked();
    const lockoutTime = enhancedAuthService.getLockoutRemainingTime();
    
    setState(prev => ({ 
      ...prev, 
      isLocked, 
      lockoutTime 
    }));

    // Set up countdown if locked
    if (isLocked && lockoutTime > 0) {
      const interval = setInterval(() => {
        const remainingTime = enhancedAuthService.getLockoutRemainingTime();
        if (remainingTime <= 0) {
          setState(prev => ({ ...prev, isLocked: false, lockoutTime: 0 }));
          clearInterval(interval);
        } else {
          setState(prev => ({ ...prev, lockoutTime: remainingTime }));
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  };

  /**
   * Validate form field
   */
  const validateField = (name, value) => {
    let isValid = true;
    let message = '';

    switch (name) {
      case 'username':
        if (!value || value.trim().length === 0) {
          isValid = false;
          message = 'Username is required';
        } else if (value.length > 100) {
          isValid = false;
          message = 'Username is too long';
        } else if (!/^[a-zA-Z0-9@._-]+$/.test(value)) {
          isValid = false;
          message = 'Username contains invalid characters';
        }
        break;
        
      case 'password':
        if (!value || value.length === 0) {
          isValid = false;
          message = 'Password is required';
        } else if (value.length > 200) {
          isValid = false;
          message = 'Password is too long';
        }
        break;
    }

    return { isValid, message };
  };

  /**
   * Handle input change with validation
   */
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    // Clear previous errors
    if (state.error) {
      setState(prev => ({ ...prev, error: '', errorType: null }));
    }
    
    // Validate field
    if (name === 'username' || name === 'password') {
      const validation = validateField(name, newValue);
      setValidation(prev => ({ ...prev, [name]: validation }));
    }
  };

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !state.loading && !state.isLocked) {
      e.preventDefault();
      if (e.target === usernameRef.current && passwordRef.current) {
        passwordRef.current.focus();
      } else {
        handleSubmit(e);
      }
    }
  };

  /**
   * Get user-friendly error message
   */
  const getErrorMessage = (error) => {
    if (error instanceof ValidationError) {
      return { message: error.message, type: 'validation' };
    }
    
    if (error instanceof AuthenticationError) {
      return { 
        message: 'Invalid username or password. Please check your credentials and try again.',
        type: 'authentication'
      };
    }
    
    if (error instanceof NetworkError) {
      if (error.statusCode === 0) {
        return { 
          message: 'Unable to connect to the server. Please check your internet connection.',
          type: 'network'
        };
      }
      return { 
        message: 'Server is temporarily unavailable. Please try again in a few moments.',
        type: 'network'
      };
    }
    
    return { 
      message: error.message || 'An unexpected error occurred. Please try again.',
      type: 'general'
    };
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (state.loading || state.isLocked) return;

    // Validate all fields
    const usernameValidation = validateField('username', formData.username);
    const passwordValidation = validateField('password', formData.password);
    
    setValidation({
      username: usernameValidation,
      password: passwordValidation
    });

    if (!usernameValidation.isValid || !passwordValidation.isValid) {
      return;
    }

    try {
      setState(prev => ({ 
        ...prev, 
        loading: true, 
        error: '', 
        errorType: null 
      }));

      const result = await enhancedAuthService.login(
        formData.username,
        formData.password,
        formData.rememberMe
      );

      if (result.success) {
        // Update app context
        dispatch({
          type: 'SET_USER',
          payload: result.user
        });

        dispatch({
          type: 'SET_AUTH_STATE',
          payload: {
            isAuthenticated: true,
            user: result.user,
            sessionId: result.session_id
          }
        });

        // Call success callbacks
        if (onLogin) {
          onLogin(result.user);
        }

        if (onClose) {
          onClose();
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      const { message, type } = getErrorMessage(error);
      
      setState(prev => ({ 
        ...prev, 
        loading: false,
        error: message,
        errorType: type
      }));

      // Check lockout status after failed attempt
      checkLockoutStatus();
    }
  };

  /**
   * Handle forgot password
   */
  const handleForgotPassword = () => {
    setState(prev => ({ 
      ...prev, 
      error: 'Password reset feature is coming soon. Please contact your system administrator for assistance.',
      errorType: 'info'
    }));
  };

  /**
   * Render error message with appropriate styling
   */
  const renderError = () => {
    if (!state.error) return null;

    const getErrorClasses = () => {
      switch (state.errorType) {
        case 'validation':
          return 'bg-yellow-50 border-yellow-200 text-yellow-700';
        case 'network':
          return 'bg-blue-50 border-blue-200 text-blue-700';
        case 'authentication':
          return 'bg-red-50 border-red-200 text-red-700';
        case 'info':
          return 'bg-blue-50 border-blue-200 text-blue-700';
        default:
          return 'bg-red-50 border-red-200 text-red-700';
      }
    };

    return (
      <div className={`border px-4 py-3 rounded-md text-sm ${getErrorClasses()}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {state.errorType === 'network' && (
              <svg className="w-4 h-4 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
            {state.errorType === 'validation' && (
              <svg className="w-4 h-4 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="ml-2 flex-1">
            {state.error}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render lockout message
   */
  const renderLockoutMessage = () => {
    if (!state.isLocked) return null;

    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <strong>Account temporarily locked</strong>
            <div className="mt-1">
              Too many failed login attempts. Please try again in {state.lockoutTime} minute{state.lockoutTime !== 1 ? 's' : ''}.
            </div>
          </div>
        </div>
      </div>
    );
  };

  const isFormValid = validation.username.isValid && 
                     validation.password.isValid && 
                     formData.username.trim() && 
                     formData.password;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Sign In
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Use your company credentials
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={state.loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Demo Mode Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Demo Mode</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Use these credentials to access the application:</p>
                  <div className="mt-2 font-mono bg-blue-100 p-2 rounded text-xs">
                    <div><strong>Username:</strong> demo</div>
                    <div><strong>Password:</strong> demo123</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lockout Message */}
          {renderLockoutMessage()}

          {/* Error Message */}
          {renderError()}

          {/* Username Field */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username or Email
            </label>
            <input
              ref={usernameRef}
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              required
              autoComplete="username"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                validation.username.isValid 
                  ? 'border-gray-300 focus:border-blue-500' 
                  : 'border-red-300 focus:border-red-500 focus:ring-red-500'
              }`}
              placeholder="Enter your username or email"
              disabled={state.loading || state.isLocked}
              aria-invalid={!validation.username.isValid}
              aria-describedby={!validation.username.isValid ? "username-error" : undefined}
            />
            {!validation.username.isValid && (
              <p id="username-error" className="mt-1 text-sm text-red-600">
                {validation.username.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                ref={passwordRef}
                type={state.showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                required
                autoComplete="current-password"
                className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  validation.password.isValid 
                    ? 'border-gray-300 focus:border-blue-500' 
                    : 'border-red-300 focus:border-red-500 focus:ring-red-500'
                }`}
                placeholder="Enter your password"
                disabled={state.loading || state.isLocked}
                aria-invalid={!validation.password.isValid}
                aria-describedby={!validation.password.isValid ? "password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setState(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                disabled={state.loading || state.isLocked}
                aria-label={state.showPassword ? "Hide password" : "Show password"}
              >
                {state.showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {!validation.password.isValid && (
              <p id="password-error" className="mt-1 text-sm text-red-600">
                {validation.password.message}
              </p>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={state.loading || state.isLocked}
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                Remember me for 30 days
              </label>
            </div>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-blue-600 hover:text-blue-500"
              disabled={state.loading || state.isLocked}
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            ref={submitButtonRef}
            type="submit"
            disabled={state.loading || state.isLocked || !isFormValid}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {state.loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Signing in...
              </div>
            ) : state.isLocked ? (
              `Locked (${state.lockoutTime}m remaining)`
            ) : (
              'Sign In'
            )}
          </button>

          {/* Login Attempts Warning */}
          {state.attempts > 2 && state.attempts < 5 && (
            <div className="text-center text-sm text-orange-600">
              Warning: {5 - state.attempts} attempts remaining before account lockout
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t text-center">
          <p className="text-xs text-gray-600">
            This system supports Active Directory authentication.
            Contact IT support if you need assistance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EnhancedLoginForm;