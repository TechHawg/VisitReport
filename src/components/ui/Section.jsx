import React from 'react';
import { HelpCircle } from 'lucide-react';

const Section = ({ title, icon, children, helpText }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8 animate-fade-in">
    <div className="p-6 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {icon}
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
      </div>
      {helpText && (
        <div className="group relative">
          <HelpCircle className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" size={20} />
          <div className="absolute right-0 top-6 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            {helpText}
          </div>
        </div>
      )}
    </div>
    <div className="p-6 md:p-8">
      {children}
    </div>
  </div>
);

export default Section;