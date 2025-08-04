import React from 'react';

const ProgressBar = ({ progress, label, showPercentage = true, size = 'md', color = 'blue' }) => {
  const safeProgress = Math.max(0, Math.min(100, progress || 0));
  
  const sizes = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };
  
  const colors = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-500',
    red: 'bg-red-600',
    purple: 'bg-purple-600'
  };
  
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
          {showPercentage && (
            <span className="text-sm text-gray-500 dark:text-gray-400">{safeProgress}%</span>
          )}
        </div>
      )}
      <div className={`w-full ${sizes[size]} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
        <div 
          className={`${sizes[size]} ${colors[color]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${safeProgress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;