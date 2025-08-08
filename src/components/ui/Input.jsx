import React, { useRef, useEffect } from 'react';

const Input = ({ label, error, multiline, spellCheck, ...props }) => {
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (multiline && inputRef.current) {
      // Reset height to auto to get the correct scrollHeight
      inputRef.current.style.height = 'auto';
      // Set the height to the scrollHeight
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [props.value, multiline]);
  
  const handleChange = (e) => {
    if (props.onChange) {
      props.onChange(e);
    }
    // Immediately adjust height on change for multiline inputs
    if (multiline && inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  };
  
  const inputElement = multiline ? (
    <textarea
      ref={inputRef}
      className={`w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 disabled:bg-gray-100 dark:disabled:bg-gray-800/50 resize-none overflow-hidden`}
      style={{ minHeight: '40px' }}
      spellCheck={spellCheck !== undefined ? spellCheck : true}
      {...props}
      onChange={handleChange}
    />
  ) : (
    <input
      className={`w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 disabled:bg-gray-100 dark:disabled:bg-gray-800/50`}
      spellCheck={spellCheck !== undefined ? spellCheck : false}
      {...props}
    />
  );
  
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{label}</label>}
      {inputElement}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default Input;