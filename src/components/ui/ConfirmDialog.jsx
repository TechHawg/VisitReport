import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import Button from './Button';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false
}) => {
  if (!isOpen) return null;

  const variants = {
    danger: {
      icon: Trash2,
      iconColor: 'text-red-500',
      buttonVariant: 'danger'
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-yellow-500',
      buttonVariant: 'primary'
    }
  };

  const currentVariant = variants[variant];
  const IconComponent = currentVariant.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md animate-fade-in-up">
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className={`flex-shrink-0 ${currentVariant.iconColor}`}>
              <IconComponent size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {title}
              </h3>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <X size={20} />
            </button>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {message}
          </p>
          
          <div className="flex space-x-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              variant={currentVariant.buttonVariant}
              onClick={onConfirm}
              loading={loading}
              disabled={loading}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;