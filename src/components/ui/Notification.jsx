import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, X, Info, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const Notification = ({ notification }) => {
  const { removeNotification } = useApp();

  useEffect(() => {
    if (notification.duration) {
      const timer = setTimeout(() => {
        removeNotification(notification.id);
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.duration, removeNotification]);

  const icons = {
    success: <CheckCircle className="text-green-400" size={20} />,
    error: <AlertCircle className="text-red-400" size={20} />,
    warning: <AlertTriangle className="text-yellow-400" size={20} />,
    info: <Info className="text-blue-400" size={20} />
  };

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
  };

  return (
    <div className={`flex items-start p-4 border rounded-lg shadow-lg animate-slide-in ${styles[notification.type]}`}>
      <div className="flex-shrink-0 mr-3">
        {icons[notification.type]}
      </div>
      <div className="flex-1">
        <p className="font-medium">
          {notification.message}
        </p>
        {notification.description && (
          <p className="text-sm mt-1 opacity-90">
            {notification.description}
          </p>
        )}
      </div>
      <button
        onClick={() => removeNotification(notification.id)}
        className="flex-shrink-0 ml-4 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss notification"
      >
        <X size={18} />
      </button>
    </div>
  );
};

const NotificationContainer = () => {
  const { notifications } = useApp();

  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
      {notifications.map(notification => (
        <Notification key={notification.id} notification={notification} />
      ))}
    </div>
  );
};

export default NotificationContainer;