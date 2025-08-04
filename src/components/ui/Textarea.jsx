import React, { useRef, useEffect } from 'react';

const Textarea = ({ label, value, onChange, ...props }) => {
  const textareaRef = useRef(null);
  
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = 'auto';
      // Set the height to the scrollHeight
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);
  
  const handleChange = (e) => {
    onChange(e);
    // Immediately adjust height on change
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };
  
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{label}</label>
      <textarea
        ref={textareaRef}
        className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 resize-none overflow-hidden"
        style={{ minHeight: '100px' }}
        value={value}
        onChange={handleChange}
        {...props}
      ></textarea>
    </div>
  );
};

export default Textarea;