import React from 'react';

const Alert = ({ variant = 'info', children }) => {
  const variants = {
    info: 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    success: 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    warning: 'bg-yellow-100 border-yellow-500 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    error: 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  };
  return (
    <div className={`${variants[variant]} border-l-4 p-4 rounded-r-lg mb-4`}>
      {children}
    </div>
  );
};

export default Alert;