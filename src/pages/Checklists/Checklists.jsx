import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import { 
  CheckSquare, 
  Square, 
  Edit3, 
  Save, 
  X,
  ChevronRight,
  ChevronDown,
  Type
} from 'lucide-react';

const Checklists = () => {
  const { 
    reportData, 
    setReportData, 
    addNotification,
    isLoading 
  } = useApp();

  // Get current checklists from report data (pushed from Admin)
  const checklists = reportData.checklists || [];
  
  console.log('🔧 DEBUG: Checklists component MOUNTED');
  console.log('🔧 DEBUG: Checklists component - reportData:', reportData);
  console.log('🔧 DEBUG: Checklists component - checklists:', checklists);
  console.log('🔧 DEBUG: Checklists component - checklists length:', checklists?.length);
  console.log('🔧 DEBUG: Checklists component - checklists[0] title:', checklists?.[0]?.title);
  
  const [editingChecklistId, setEditingChecklistId] = useState(null);
  const [expandedChecklists, setExpandedChecklists] = useState({});

  // Save checklists to report data
  const saveChecklists = (updatedChecklists) => {
    setReportData({
      ...reportData,
      checklists: updatedChecklists
    });
  };

  // Update checklist title
  const updateChecklistTitle = (checklistId, newTitle) => {
    const updatedChecklists = checklists.map(checklist =>
      checklist.id === checklistId 
        ? { ...checklist, title: newTitle, lastUpdated: new Date().toISOString() }
        : checklist
    );
    saveChecklists(updatedChecklists);
    setEditingChecklistId(null);
  };

  // Update checklist item
  const updateChecklistItem = (checklistId, itemId, updates) => {
    const updatedChecklists = checklists.map(checklist => {
      if (checklist.id !== checklistId) return checklist;

      const updateItems = (items) => {
        return items.map(item => {
          if (item.id === itemId) {
            return { ...item, ...updates };
          }
          if (item.children && item.children.length > 0) {
            return { ...item, children: updateItems(item.children) };
          }
          return item;
        });
      };

      return { 
        ...checklist, 
        items: updateItems(checklist.items),
        lastUpdated: new Date().toISOString()
      };
    });

    saveChecklists(updatedChecklists);
  };

  // Toggle checklist expansion
  const toggleChecklistExpansion = (checklistId) => {
    setExpandedChecklists(prev => ({
      ...prev,
      [checklistId]: !prev[checklistId]
    }));
  };

  // Render checklist item
  const renderChecklistItem = (item, checklistId, level = 0) => {
    // Section header rendering
    if (item.type === 'section') {
      return (
        <div key={item.id} className={`${level > 0 ? 'ml-6' : ''} py-3 ${level === 0 ? 'border-t border-gray-200 dark:border-gray-600 mt-4 pt-4' : ''}`}>
          <div className="flex items-center space-x-2">
            <Type size={16} className="text-purple-600 flex-shrink-0" />
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
              {item.text || 'Section Title'}
            </h4>
          </div>
          {/* Render children */}
          {item.children && item.children.length > 0 && (
            <div className="mt-2 ml-6">
              {item.children.map(child => renderChecklistItem(child, checklistId, level + 1))}
            </div>
          )}
        </div>
      );
    }

    // Regular item rendering
    return (
      <div key={item.id} className={`${level > 0 ? 'ml-6 border-l border-gray-200 dark:border-gray-600 pl-4' : ''}`}>
        <div className="flex items-start space-x-2 py-2">
          {/* Checkbox or bullet point */}
          <div className="flex-shrink-0 mt-1">
            {item.type === 'bullet' ? (
              <div className="w-4 h-4 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
              </div>
            ) : (
              <button
                onClick={() => updateChecklistItem(checklistId, item.id, { checked: !item.checked })}
                className="text-blue-600 hover:text-blue-700 transition-colors"
              >
                {item.checked ? <CheckSquare size={16} /> : <Square size={16} />}
              </button>
            )}
          </div>

          {/* Item content */}
          <div className="flex-1 min-w-0">
            <span className={`text-sm ${item.checked && item.type !== 'bullet' ? 'line-through text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
              {item.text || 'Empty item'}
            </span>
          </div>
        </div>

        {/* Render children */}
        {item.children && item.children.length > 0 && (
          <div className="mt-1">
            {item.children.map(child => renderChecklistItem(child, checklistId, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Active Checklist</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete your active checklist for the visit report. Push a template from Administration to set a new active checklist.
          </p>
        </div>
      </div>

      {/* Display checklists or loading state */}
      {(() => {
        console.log('🔧 DEBUG: Render condition check - checklists.length:', checklists?.length);
        console.log('🔧 DEBUG: Render condition check - checklists === 0?', checklists?.length === 0);
        console.log('🔧 DEBUG: Render condition check - isLoading:', isLoading);
        console.log('🔧 DEBUG: Render condition check - actual checklists:', checklists);
        
        if (isLoading) {
          return 'loading';
        } else if (checklists.length === 0) {
          return 'empty';
        } else {
          return 'checklists';
        }
      })() === 'loading' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Loading checklists...
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Please wait while we load your active checklist
            </p>
          </div>
        </div>
      ) : (() => {
        const renderCondition = (() => {
          console.log('🔧 DEBUG: Final render condition - checklists.length:', checklists?.length);
          if (isLoading) return 'loading';
          if (checklists.length === 0) return 'empty';
          return 'checklists';
        })();
        
        return renderCondition;
      })() === 'empty' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
          <div className="text-center py-12">
            <CheckSquare size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No active checklist
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Push a checklist template from the Administration section to set your active checklist
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {checklists.map(checklist => {
            const isExpanded = expandedChecklists[checklist.id] ?? true;
            const completedItems = checklist.items.filter(item => item.checked && item.type === 'checkbox').length;
            const totalCheckboxes = checklist.items.filter(item => item.type === 'checkbox').length;

            return (
              <div key={checklist.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600 group">
                {/* Checklist header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3 flex-1">
                    <button
                      onClick={() => toggleChecklistExpansion(checklist.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                    
                    {editingChecklistId === checklist.id ? (
                      <div className="flex items-center space-x-2 flex-1">
                        <Input
                          defaultValue={checklist.title}
                          className="flex-1"
                          autoFocus
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              updateChecklistTitle(checklist.id, e.target.value);
                            }
                          }}
                          onBlur={(e) => {
                            updateChecklistTitle(checklist.id, e.target.value);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {checklist.title}
                        </h3>
                        {totalCheckboxes > 0 && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {completedItems} of {totalCheckboxes} completed
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingChecklistId(
                        editingChecklistId === checklist.id ? null : checklist.id
                      )}
                      title="Edit checklist title"
                    >
                      <Edit3 size={14} />
                    </Button>
                  </div>
                </div>

                {/* Checklist items */}
                {isExpanded && (
                  <div className="space-y-1">
                    {checklist.items.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p>No items in this checklist</p>
                      </div>
                    ) : (
                      checklist.items.map(item => renderChecklistItem(item, checklist.id))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info alert */}
      {checklists.length > 0 && (
        <Alert variant="info">
          <div>
            <strong>Tip:</strong> Your checklist progress is automatically saved with your visit report. 
            You can edit the checklist title by clicking the edit button. Push a different template from Administration to replace this active checklist.
          </div>
        </Alert>
      )}
    </div>
  );
};

export default Checklists;