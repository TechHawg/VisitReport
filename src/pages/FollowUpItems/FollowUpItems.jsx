import React, { useState } from 'react';
import { CheckSquare, Plus, Edit, Trash2, Clock, CheckCircle, AlertCircle, BarChart3, Mail, Calendar, User } from 'lucide-react';
import Section from '../../components/ui/Section';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ProgressBar from '../../components/ui/ProgressBar';
import Alert from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Textarea from '../../components/ui/Textarea';
import { useApp } from '../../context/AppContext';
import { EMAIL_RECIPIENTS } from '../../constants/emailConfig';

const FollowUpItems = () => {
  const { reportData, updateReportData, addNotification } = useApp();
  const [editingItem, setEditingItem] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');

  // Initialize follow-up items data
  const followUpData = reportData.followUpItems || [];

  const updateFollowUpData = (items) => {
    updateReportData('followUpItems', items);
  };

  const categoryOptions = [
    'Hardware Issue',
    'Software Installation',
    'Network Configuration',
    'Security Implementation',
    'User Training',
    'Documentation',
    'Policy Implementation',
    'Equipment Order',
    'Maintenance Schedule',
    'Compliance Review',
    'Performance Monitoring',
    'Budget Planning',
    'Other'
  ];

  const priorityOptions = [
    { value: 'critical', label: 'Critical', color: 'red' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'medium', label: 'Medium', color: 'yellow' },
    { value: 'low', label: 'Low', color: 'blue' }
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'gray' },
    { value: 'in-progress', label: 'In Progress', color: 'yellow' },
    { value: 'completed', label: 'Completed', color: 'green' },
    { value: 'on-hold', label: 'On Hold', color: 'orange' },
    { value: 'cancelled', label: 'Cancelled', color: 'red' }
  ];

  const getEmptyItem = () => ({
    id: Date.now(),
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    status: 'pending',
    assignedTo: '',
    requestedBy: '',
    dueDate: '',
    dateCreated: new Date().toISOString().split('T')[0],
    dateCompleted: '',
    estimatedHours: '',
    actualHours: '',
    relatedTo: '',
    completionNotes: '',
    notes: ''
  });

  const handleAddItem = () => {
    setEditingItem(getEmptyItem());
  };

  const handleEditItem = (item) => {
    setEditingItem({ ...item });
  };

  const handleSaveItem = () => {
    if (!editingItem.title.trim()) {
      addNotification({
        type: 'error',
        message: 'Task title is required',
        duration: 3000
      });
      return;
    }

    let updatedItems;
    if (editingItem.id && followUpData.find(item => item.id === editingItem.id)) {
      updatedItems = followUpData.map(item => 
        item.id === editingItem.id ? editingItem : item
      );
    } else {
      updatedItems = [...followUpData, { ...editingItem, id: Date.now() }];
    }

    updateFollowUpData(updatedItems);
    setEditingItem(null);
    
    addNotification({
      type: 'success',
      message: 'Follow-up item saved successfully',
      duration: 3000
    });
  };

  const handleDeleteItem = (id) => {
    const updatedItems = followUpData.filter(item => item.id !== id);
    updateFollowUpData(updatedItems);
    setShowDeleteDialog(null);
    
    addNotification({
      type: 'info',
      message: 'Follow-up item deleted successfully',
      duration: 3000
    });
  };

  const getFilteredItems = () => {
    return followUpData.filter(item => {
      const statusMatch = filterStatus === 'all' || item.status === filterStatus;
      const priorityMatch = filterPriority === 'all' || item.priority === filterPriority;
      const assigneeMatch = filterAssignee === 'all' || item.assignedTo === filterAssignee;
      return statusMatch && priorityMatch && assigneeMatch;
    });
  };

  const calculateProgress = () => {
    if (followUpData.length === 0) return 100;
    const completedCount = followUpData.filter(item => 
      item.status === 'completed'
    ).length;
    return Math.round((completedCount / followUpData.length) * 100);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      'in-progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'on-hold': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <Clock size={16} />,
      'in-progress': <AlertCircle size={16} />,
      completed: <CheckCircle size={16} />,
      'on-hold': <Clock size={16} />,
      cancelled: <CheckCircle size={16} />
    };
    return icons[status] || icons.pending;
  };

  const getOverdueItems = () => {
    const today = new Date().toISOString().split('T')[0];
    return followUpData.filter(item => 
      item.dueDate && 
      item.dueDate < today && 
      item.status !== 'completed' && 
      item.status !== 'cancelled'
    );
  };

  const getUniqueAssignees = () => {
    const assignees = [...new Set(followUpData.map(item => item.assignedTo).filter(Boolean))];
    return assignees.sort();
  };

  // Email functionality
  const generateEmailReport = () => {
    const office = reportData.office || 'Office Visit';
    const date = reportData.date || new Date().toISOString().split('T')[0];
    
    const subject = `Follow-up Items Report - ${office} - ${date}`;
    
    let body = `Follow-up Items & Tasks Report\n`;
    body += `Office: ${office}\n`;
    body += `Date: ${date}\n`;
    body += `Report Generated: ${new Date().toLocaleString()}\n\n`;
    
    const pendingItems = followUpData.filter(item => item.status === 'pending' || item.status === 'in-progress');
    const overdueItems = getOverdueItems();
    const criticalItems = followUpData.filter(item => item.priority === 'critical');
    
    body += `SUMMARY:\n`;
    body += `Total Follow-up Items: ${followUpData.length}\n`;
    body += `Pending/In Progress: ${pendingItems.length}\n`;
    body += `Overdue Items: ${overdueItems.length}\n`;
    body += `Critical Priority: ${criticalItems.length}\n`;
    body += `Completion Rate: ${calculateProgress()}%\n\n`;
    
    if (overdueItems.length > 0) {
      body += `OVERDUE ITEMS:\n`;
      overdueItems.forEach(item => {
        body += `\n• ${item.title}\n`;
        body += `  Priority: ${item.priority}\n`;
        body += `  Assigned To: ${item.assignedTo || 'Unassigned'}\n`;
        body += `  Due Date: ${item.dueDate}\n`;
        body += `  Category: ${item.category}\n`;
      });
      body += `\n`;
    }
    
    if (criticalItems.length > 0) {
      body += `CRITICAL PRIORITY ITEMS:\n`;
      criticalItems.forEach(item => {
        body += `\n• ${item.title}\n`;
        body += `  Status: ${item.status}\n`;
        body += `  Assigned To: ${item.assignedTo || 'Unassigned'}\n`;
        body += `  Due Date: ${item.dueDate || 'Not set'}\n`;
        body += `  Category: ${item.category}\n`;
      });
      body += `\n`;
    }
    
    if (pendingItems.length > 0) {
      body += `PENDING/IN PROGRESS ITEMS:\n`;
      pendingItems.forEach(item => {
        body += `\n• ${item.title}\n`;
        body += `  Status: ${item.status}\n`;
        body += `  Priority: ${item.priority}\n`;
        body += `  Assigned To: ${item.assignedTo || 'Unassigned'}\n`;
        body += `  Due Date: ${item.dueDate || 'Not set'}\n`;
        if (item.estimatedHours) body += `  Estimated Hours: ${item.estimatedHours}\n`;
      });
    }
    
    const recipients = EMAIL_RECIPIENTS.followUp || EMAIL_RECIPIENTS.default;
    const mailtoLink = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    return { mailtoLink, subject, body, recipients };
  };

  const sendEmailReport = () => {
    const { mailtoLink } = generateEmailReport();
    window.location.href = mailtoLink;
    setShowEmailModal(false);
    
    addNotification({
      type: 'success',
      message: 'Email client opened with follow-up items report',
      duration: 3000
    });
  };

  const filteredItems = getFilteredItems();
  const progress = calculateProgress();
  const overdueItems = getOverdueItems();
  const uniqueAssignees = getUniqueAssignees();

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Section title="Follow-up Items Progress" icon={<BarChart3 className="text-blue-500" />}>
        <div className="space-y-4">
          <ProgressBar 
            progress={progress} 
            label="Task Completion Rate"
            color={progress >= 80 ? 'green' : progress >= 50 ? 'blue' : 'yellow'}
            size="lg"
          />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{followUpData.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Items</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {followUpData.filter(i => i.status === 'pending' || i.status === 'in-progress').length}
              </p>
              <p className="text-xs text-yellow-500 dark:text-yellow-400">Active</p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {followUpData.filter(i => i.status === 'completed').length}
              </p>
              <p className="text-xs text-green-500 dark:text-green-400">Completed</p>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {overdueItems.length}
              </p>
              <p className="text-xs text-red-500 dark:text-red-400">Overdue</p>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {followUpData.filter(i => i.priority === 'critical').length}
              </p>
              <p className="text-xs text-orange-500 dark:text-orange-400">Critical</p>
            </div>
          </div>
          
          {overdueItems.length > 0 && (
            <Alert variant="warning">
              <strong>Attention:</strong> You have {overdueItems.length} overdue follow-up item{overdueItems.length > 1 ? 's' : ''} that need immediate attention.
            </Alert>
          )}
        </div>
      </Section>

      <Section 
        title="Follow-up Items & Tasks" 
        icon={<CheckSquare className="text-green-500" />}
        helpText="Track and manage follow-up actions and tasks from your office visit."
      >
        <div className="space-y-6">
          {/* Actions and Filters */}
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="flex flex-wrap gap-3">
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-auto"
              >
                <option value="all">All Statuses</option>
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </Select>
              <Select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-auto"
              >
                <option value="all">All Priorities</option>
                {priorityOptions.map(priority => (
                  <option key={priority.value} value={priority.value}>{priority.label}</option>
                ))}
              </Select>
              {uniqueAssignees.length > 0 && (
                <Select
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  className="w-auto"
                >
                  <option value="all">All Assignees</option>
                  {uniqueAssignees.map(assignee => (
                    <option key={assignee} value={assignee}>{assignee}</option>
                  ))}
                </Select>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleAddItem} size="sm">
                <Plus size={16} />
                Add Task
              </Button>
              <Button 
                onClick={() => setShowEmailModal(true)} 
                variant="outline" 
                size="sm"
                disabled={followUpData.length === 0}
              >
                <Mail size={16} />
                Email Report
              </Button>
            </div>
          </div>

          {/* Items List */}
          {filteredItems.length > 0 ? (
            <div className="space-y-4">
              {filteredItems.map(item => (
                <div 
                  key={item.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg p-6 border shadow-sm ${
                    overdueItems.some(overdue => overdue.id === item.id) 
                      ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10' 
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                          {item.title}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                          {item.priority.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          {item.status.replace('-', ' ').toUpperCase()}
                        </span>
                        {overdueItems.some(overdue => overdue.id === item.id) && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                            OVERDUE
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Category:</span>
                          <span className="ml-1 text-gray-900 dark:text-gray-100">{item.category || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Assigned To:</span>
                          <span className="ml-1 text-gray-900 dark:text-gray-100">{item.assignedTo || 'Unassigned'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Due Date:</span>
                          <span className="ml-1 text-gray-900 dark:text-gray-100">{item.dueDate || 'Not set'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Created:</span>
                          <span className="ml-1 text-gray-900 dark:text-gray-100">{item.dateCreated}</span>
                        </div>
                      </div>
                      
                      {item.description && (
                        <p className="text-gray-700 dark:text-gray-300 mb-3">{item.description}</p>
                      )}
                      
                      {(item.estimatedHours || item.actualHours) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                          {item.estimatedHours && (
                            <div>
                              <span className="font-medium text-gray-600 dark:text-gray-400">Estimated Hours:</span>
                              <span className="ml-1 text-gray-900 dark:text-gray-100">{item.estimatedHours}</span>
                            </div>
                          )}
                          {item.actualHours && (
                            <div>
                              <span className="font-medium text-gray-600 dark:text-gray-400">Actual Hours:</span>
                              <span className="ml-1 text-gray-900 dark:text-gray-100">{item.actualHours}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {item.completionNotes && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-3">
                          <p className="text-sm text-green-800 dark:text-green-200">
                            <strong>Completion Notes:</strong> {item.completionNotes}
                          </p>
                          {item.dateCompleted && (
                            <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                              Completed on: {item.dateCompleted}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4 flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditItem(item)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setShowDeleteDialog(item)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <CheckSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {filterStatus !== 'all' || filterPriority !== 'all' || filterAssignee !== 'all'
                  ? 'No items match the current filters' 
                  : 'No follow-up items created yet'}
              </p>
              <p className="text-sm mb-4">
                {filterStatus !== 'all' || filterPriority !== 'all' || filterAssignee !== 'all'
                  ? 'Try adjusting your filters to see more items'
                  : 'Start tracking follow-up tasks and action items from your visit'}
              </p>
              <Button onClick={handleAddItem}>
                <Plus size={16} />
                Add First Task
              </Button>
            </div>
          )}
        </div>
      </Section>

      {/* Edit Item Modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title={`${editingItem?.id && followUpData.find(item => item.id === editingItem.id) ? 'Edit' : 'Add'} Follow-up Item`}
        size="xl"
      >
        {editingItem && (
          <div className="space-y-4">
            <Input
              label="Task Title *"
              value={editingItem.title}
              onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
              placeholder="Enter a descriptive title for the task"
              required
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Category"
                value={editingItem.category}
                onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
              >
                <option value="">Select Category</option>
                {categoryOptions.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
              
              <Select
                label="Priority"
                value={editingItem.priority}
                onChange={(e) => setEditingItem({ ...editingItem, priority: e.target.value })}
              >
                {priorityOptions.map(priority => (
                  <option key={priority.value} value={priority.value}>{priority.label}</option>
                ))}
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Status"
                value={editingItem.status}
                onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}
              >
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </Select>
              
              <Input
                label="Due Date"
                type="date"
                value={editingItem.dueDate}
                onChange={(e) => setEditingItem({ ...editingItem, dueDate: e.target.value })}
              />
            </div>
            
            <Textarea
              label="Description"
              value={editingItem.description}
              onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
              placeholder="Detailed description of the task..."
              rows={3}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Assigned To"
                value={editingItem.assignedTo}
                onChange={(e) => setEditingItem({ ...editingItem, assignedTo: e.target.value })}
                placeholder="Who is responsible for this task?"
              />
              
              <Input
                label="Requested By"
                value={editingItem.requestedBy}
                onChange={(e) => setEditingItem({ ...editingItem, requestedBy: e.target.value })}
                placeholder="Who requested this task?"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Estimated Hours"
                value={editingItem.estimatedHours}
                onChange={(e) => setEditingItem({ ...editingItem, estimatedHours: e.target.value })}
                placeholder="e.g., 2, 4.5"
                type="number"
                step="0.5"
              />
              
              <Input
                label="Actual Hours"
                value={editingItem.actualHours}
                onChange={(e) => setEditingItem({ ...editingItem, actualHours: e.target.value })}
                placeholder="e.g., 2, 4.5"
                type="number"
                step="0.5"
              />
              
              <Input
                label="Related To"
                value={editingItem.relatedTo}
                onChange={(e) => setEditingItem({ ...editingItem, relatedTo: e.target.value })}
                placeholder="Issue ID, Project, etc."
              />
            </div>
            
            {editingItem.status === 'completed' && (
              <>
                <Textarea
                  label="Completion Notes"
                  value={editingItem.completionNotes}
                  onChange={(e) => setEditingItem({ ...editingItem, completionNotes: e.target.value })}
                  placeholder="How was this task completed?"
                  rows={3}
                />
                
                <Input
                  label="Date Completed"
                  type="date"
                  value={editingItem.dateCompleted}
                  onChange={(e) => setEditingItem({ ...editingItem, dateCompleted: e.target.value })}
                />
              </>
            )}
            
            <Textarea
              label="Additional Notes"
              value={editingItem.notes}
              onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
              placeholder="Any additional notes or observations..."
              rows={2}
            />
          </div>
        )}
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={() => setEditingItem(null)}>
            Cancel
          </Button>
          <Button onClick={handleSaveItem}>
            Save Task
          </Button>
        </div>
      </Modal>

      {/* Email Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Email Follow-up Items Report"
        size="lg"
      >
        <div className="space-y-4">
          <Alert variant="info">
            <strong>Email Recipients:</strong><br />
            {(EMAIL_RECIPIENTS.followUp || EMAIL_RECIPIENTS.default).join(', ')}
          </Alert>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Report Summary:</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>Total Follow-up Items: {followUpData.length}</div>
              <div>Pending/In Progress: {followUpData.filter(i => i.status === 'pending' || i.status === 'in-progress').length}</div>
              <div>Overdue Items: {overdueItems.length}</div>
              <div>Completion Rate: {progress}%</div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowEmailModal(false)}>
              Cancel
            </Button>
            <Button onClick={sendEmailReport}>
              <Mail size={16} />
              Send Email
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!showDeleteDialog}
        onClose={() => setShowDeleteDialog(null)}
        onConfirm={() => handleDeleteItem(showDeleteDialog?.id)}
        title="Delete Follow-up Item"
        message={`Are you sure you want to delete "${showDeleteDialog?.title}"? This action cannot be undone.`}
        confirmText="Delete Task"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default FollowUpItems;