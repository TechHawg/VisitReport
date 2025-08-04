import React from 'react';

const Select = ({ label, error, children, ...props }) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{label}</label>}
    <select
      className={`w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200`}
      {...props}
    >
      {children}
    </select>
    {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
  </div>
);

export default Select;