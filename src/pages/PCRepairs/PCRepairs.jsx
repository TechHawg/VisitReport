import React, { useState } from 'react';
import { Wrench, Plus, Edit, Trash2, Clock, CheckCircle, XCircle, BarChart3, Mail, Monitor } from 'lucide-react';
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

const PCRepairs = () => {
  const { reportData, updateReportData, addNotification } = useApp();
  const [editingRepair, setEditingRepair] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Initialize repairs data
  const repairsData = reportData.pcRepairs || [];

  const updateRepairsData = (repairs) => {
    updateReportData('pcRepairs', repairs);
  };

  const pcModelOptions = [
    'Dell OptiPlex 3070',
    'Dell OptiPlex 5070',  
    'Dell OptiPlex 7070',
    'Dell OptiPlex 3080',
    'Dell OptiPlex 5080',
    'Dell OptiPlex 7080',
    'Dell Latitude 5520',
    'Dell Latitude 7520',
    'HP EliteDesk 800',
    'HP EliteDesk 805',
    'HP EliteBook 840',
    'HP EliteBook 850',
    'HP ProDesk 400',
    'HP ProBook 450',
    'Lenovo ThinkCentre M70',
    'Lenovo ThinkCentre M80',
    'Lenovo ThinkPad E15',
    'Lenovo ThinkPad T14',
    'Custom Build',
    'Other'
  ];

  const repairTypeOptions = [
    'Hardware Replacement',
    'Software Installation',
    'Driver Update',
    'System Cleanup',
    'Virus Removal',
    'Performance Optimization',
    'Data Recovery',
    'Network Configuration',
    'User Account Setup',
    'Preventive Maintenance',
    'Diagnostic Testing',
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

  const getEmptyRepair = () => ({
    id: Date.now(),
    pcName: '',
    pcModel: '',
    serviceTag: '',
    userName: '',
    location: '',
    repairType: '',
    priority: 'medium',
    status: 'pending',
    issueDescription: '',
    workPerformed: '',
    partsUsed: '',
    timeSpent: '',
    dateRequested: new Date().toISOString().split('T')[0],
    dateCompleted: '',
    technicianNotes: '',
    followUpRequired: false,
    followUpNotes: ''
  });

  const handleAddRepair = () => {
    setEditingRepair(getEmptyRepair());
  };

  const handleEditRepair = (repair) => {
    setEditingRepair({ ...repair });
  };

  const handleSaveRepair = () => {
    if (!editingRepair.pcName.trim()) {
      addNotification({
        type: 'error',
        message: 'PC name is required',
        duration: 3000
      });
      return;
    }

    let updatedRepairs;
    if (editingRepair.id && repairsData.find(repair => repair.id === editingRepair.id)) {
      updatedRepairs = repairsData.map(repair => 
        repair.id === editingRepair.id ? editingRepair : repair
      );
    } else {
      updatedRepairs = [...repairsData, { ...editingRepair, id: Date.now() }];
    }

    updateRepairsData(updatedRepairs);
    setEditingRepair(null);
    
    addNotification({
      type: 'success',
      message: 'PC repair record saved successfully',
      duration: 3000
    });
  };

  const handleDeleteRepair = (id) => {
    const updatedRepairs = repairsData.filter(repair => repair.id !== id);
    updateRepairsData(updatedRepairs);
    setShowDeleteDialog(null);
    
    addNotification({
      type: 'info',
      message: 'PC repair record deleted successfully',
      duration: 3000
    });
  };

  const getFilteredRepairs = () => {
    return repairsData.filter(repair => {
      const statusMatch = filterStatus === 'all' || repair.status === filterStatus;
      const priorityMatch = filterPriority === 'all' || repair.priority === filterPriority;
      return statusMatch && priorityMatch;
    });
  };

  const calculateProgress = () => {
    if (repairsData.length === 0) return 100;
    const completedCount = repairsData.filter(repair => 
      repair.status === 'completed'
    ).length;
    return Math.round((completedCount / repairsData.length) * 100);
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
      'in-progress': <Wrench size={16} />,
      completed: <CheckCircle size={16} />,
      'on-hold': <Clock size={16} />,
      cancelled: <XCircle size={16} />
    };
    return icons[status] || icons.pending;
  };

  // Email functionality
  const generateEmailReport = () => {
    const office = reportData.office || 'Office Visit';
    const date = reportData.date || new Date().toISOString().split('T')[0];
    
    const subject = `PC Repairs Report - ${office} - ${date}`;
    
    let body = `PC Repairs & Services Report\n`;
    body += `Office: ${office}\n`;
    body += `Date: ${date}\n`;
    body += `Report Generated: ${new Date().toLocaleString()}\n\n`;
    
    const completedRepairs = repairsData.filter(repair => repair.status === 'completed');
    const pendingRepairs = repairsData.filter(repair => repair.status === 'pending' || repair.status === 'in-progress');
    
    body += `SUMMARY:\n`;
    body += `Total PC Repairs: ${repairsData.length}\n`;
    body += `Completed Repairs: ${completedRepairs.length}\n`;
    body += `Pending/In Progress: ${pendingRepairs.length}\n`;
    body += `Completion Rate: ${calculateProgress()}%\n\n`;
    
    if (completedRepairs.length > 0) {
      body += `COMPLETED REPAIRS:\n`;
      completedRepairs.forEach(repair => {
        body += `\n• PC: ${repair.pcName} (${repair.pcModel})\n`;
        body += `  User: ${repair.userName}\n`;
        body += `  Repair Type: ${repair.repairType}\n`;
        body += `  Date Completed: ${repair.dateCompleted}\n`;
        if (repair.workPerformed) body += `  Work Performed: ${repair.workPerformed}\n`;
        if (repair.timeSpent) body += `  Time Spent: ${repair.timeSpent}\n`;
      });
      body += `\n`;
    }
    
    if (pendingRepairs.length > 0) {
      body += `PENDING/IN PROGRESS REPAIRS:\n`;
      pendingRepairs.forEach(repair => {
        body += `\n• PC: ${repair.pcName} (${repair.pcModel})\n`;
        body += `  Status: ${repair.status}\n`;
        body += `  Priority: ${repair.priority}\n`;
        body += `  Repair Type: ${repair.repairType}\n`;
        body += `  Date Requested: ${repair.dateRequested}\n`;
        if (repair.issueDescription) body += `  Issue: ${repair.issueDescription}\n`;
      });
    }
    
    const recipients = EMAIL_RECIPIENTS.pcRepairs || EMAIL_RECIPIENTS.default;
    const mailtoLink = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    return { mailtoLink, subject, body, recipients };
  };

  const sendEmailReport = () => {
    const { mailtoLink } = generateEmailReport();
    window.location.href = mailtoLink;
    setShowEmailModal(false);
    
    addNotification({
      type: 'success',
      message: 'Email client opened with PC repairs report',
      duration: 3000
    });
  };

  const filteredRepairs = getFilteredRepairs();
  const progress = calculateProgress();

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Section title="PC Repairs Completion Progress" icon={<BarChart3 className="text-blue-500" />}>
        <div className="space-y-4">
          <ProgressBar 
            progress={progress} 
            label="Repair Completion Rate"
            color={progress >= 80 ? 'green' : progress >= 50 ? 'blue' : 'yellow'}
            size="lg"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{repairsData.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Repairs</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {repairsData.filter(r => r.status === 'pending' || r.status === 'in-progress').length}
              </p>
              <p className="text-xs text-yellow-500 dark:text-yellow-400">In Progress</p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {repairsData.filter(r => r.status === 'completed').length}
              </p>
              <p className="text-xs text-green-500 dark:text-green-400">Completed</p>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {repairsData.filter(r => r.followUpRequired).length}
              </p>
              <p className="text-xs text-blue-500 dark:text-blue-400">Follow-ups</p>
            </div>
          </div>
        </div>
      </Section>

      <Section 
        title="PC Repairs & Services" 
        icon={<Wrench className="text-orange-500" />}
        helpText="Track and manage PC repair requests, service work, and maintenance activities."
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
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleAddRepair} size="sm">
                <Plus size={16} />
                Add Repair
              </Button>
              <Button 
                onClick={() => setShowEmailModal(true)} 
                variant="outline" 
                size="sm"
                disabled={repairsData.length === 0}
              >
                <Mail size={16} />
                Email Report
              </Button>
            </div>
          </div>

          {/* Repairs List */}
          {filteredRepairs.length > 0 ? (
            <div className="space-y-4">
              {filteredRepairs.map(repair => (
                <div 
                  key={repair.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                          {repair.pcName}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(repair.priority)}`}>
                          {repair.priority.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(repair.status)}`}>
                          {getStatusIcon(repair.status)}
                          {repair.status.replace('-', ' ').toUpperCase()}
                        </span>
                        {repair.followUpRequired && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            FOLLOW-UP
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Model:</span>
                          <span className="ml-1 text-gray-900 dark:text-gray-100">{repair.pcModel || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">User:</span>
                          <span className="ml-1 text-gray-900 dark:text-gray-100">{repair.userName || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Location:</span>
                          <span className="ml-1 text-gray-900 dark:text-gray-100">{repair.location || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Repair Type:</span>
                          <span className="ml-1 text-gray-900 dark:text-gray-100">{repair.repairType || 'Not specified'}</span>
                        </div>
                      </div>
                      
                      {repair.issueDescription && (
                        <p className="text-gray-700 dark:text-gray-300 mb-3">
                          <strong>Issue:</strong> {repair.issueDescription}
                        </p>
                      )}
                      
                      {repair.workPerformed && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-3">
                          <p className="text-sm text-green-800 dark:text-green-200">
                            <strong>Work Performed:</strong> {repair.workPerformed}
                          </p>
                          {repair.dateCompleted && (
                            <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                              Completed on: {repair.dateCompleted}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {(repair.partsUsed || repair.timeSpent) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {repair.partsUsed && (
                            <div>
                              <span className="font-medium text-gray-600 dark:text-gray-400">Parts Used:</span>
                              <span className="ml-1 text-gray-900 dark:text-gray-100">{repair.partsUsed}</span>
                            </div>
                          )}
                          {repair.timeSpent && (
                            <div>
                              <span className="font-medium text-gray-600 dark:text-gray-400">Time Spent:</span>
                              <span className="ml-1 text-gray-900 dark:text-gray-100">{repair.timeSpent}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4 flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditRepair(repair)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setShowDeleteDialog(repair)}
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
              <Wrench size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {filterStatus !== 'all' || filterPriority !== 'all' 
                  ? 'No repairs match the current filters' 
                  : 'No PC repairs recorded yet'}
              </p>
              <p className="text-sm mb-4">
                {filterStatus !== 'all' || filterPriority !== 'all'
                  ? 'Try adjusting your filters to see more repairs'
                  : 'Start tracking PC repair and service activities'}
              </p>
              <Button onClick={handleAddRepair}>
                <Plus size={16} />
                Record First Repair
              </Button>
            </div>
          )}
        </div>
      </Section>

      {/* Edit Repair Modal */}
      <Modal
        isOpen={!!editingRepair}
        onClose={() => setEditingRepair(null)}
        title={`${editingRepair?.id && repairsData.find(repair => repair.id === editingRepair.id) ? 'Edit' : 'Add'} PC Repair`}
        size="xl"
      >
        {editingRepair && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="PC Name *"
                value={editingRepair.pcName}
                onChange={(e) => setEditingRepair({ ...editingRepair, pcName: e.target.value })}
                placeholder="PC-001, DESKTOP-ABC123"
                required
              />
              <Select
                label="PC Model"
                value={editingRepair.pcModel}
                onChange={(e) => setEditingRepair({ ...editingRepair, pcModel: e.target.value })}
              >
                <option value="">Select PC Model</option>
                {pcModelOptions.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Service Tag / Serial"
                value={editingRepair.serviceTag}
                onChange={(e) => setEditingRepair({ ...editingRepair, serviceTag: e.target.value })}
                placeholder="Service tag or serial number"
              />
              <Input
                label="User Name"
                value={editingRepair.userName}
                onChange={(e) => setEditingRepair({ ...editingRepair, userName: e.target.value })}
                placeholder="End user name"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Location"
                value={editingRepair.location}
                onChange={(e) => setEditingRepair({ ...editingRepair, location: e.target.value })}
                placeholder="Desk location, department"
              />
              <Select
                label="Repair Type"
                value={editingRepair.repairType}
                onChange={(e) => setEditingRepair({ ...editingRepair, repairType: e.target.value })}
              >
                <option value="">Select Repair Type</option>
                {repairTypeOptions.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Priority"
                value={editingRepair.priority}
                onChange={(e) => setEditingRepair({ ...editingRepair, priority: e.target.value })}
              >
                {priorityOptions.map(priority => (
                  <option key={priority.value} value={priority.value}>{priority.label}</option>
                ))}
              </Select>
              
              <Select
                label="Status"
                value={editingRepair.status}
                onChange={(e) => setEditingRepair({ ...editingRepair, status: e.target.value })}
              >
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </Select>
            </div>
            
            <Textarea
              label="Issue Description"
              value={editingRepair.issueDescription}
              onChange={(e) => setEditingRepair({ ...editingRepair, issueDescription: e.target.value })}
              placeholder="Describe the reported issue or requested service..."
              rows={3}
            />
            
            {(editingRepair.status === 'completed' || editingRepair.status === 'in-progress') && (
              <>
                <Textarea
                  label="Work Performed"
                  value={editingRepair.workPerformed}
                  onChange={(e) => setEditingRepair({ ...editingRepair, workPerformed: e.target.value })}
                  placeholder="Describe the work that was performed..."
                  rows={3}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Parts Used"
                    value={editingRepair.partsUsed}
                    onChange={(e) => setEditingRepair({ ...editingRepair, partsUsed: e.target.value })}
                    placeholder="List parts or components used"
                  />
                  <Input
                    label="Time Spent"
                    value={editingRepair.timeSpent}
                    onChange={(e) => setEditingRepair({ ...editingRepair, timeSpent: e.target.value })}
                    placeholder="e.g., 2 hours, 30 minutes"
                  />
                </div>
              </>
            )}
            
            {editingRepair.status === 'completed' && (
              <Input
                label="Date Completed"
                type="date"
                value={editingRepair.dateCompleted}
                onChange={(e) => setEditingRepair({ ...editingRepair, dateCompleted: e.target.value })}
              />
            )}
            
            <div className="border-t pt-4">
              <div className="flex items-center space-x-3 mb-3">
                <input
                  type="checkbox"
                  id="followUpRequired"
                  checked={editingRepair.followUpRequired}
                  onChange={(e) => setEditingRepair({ ...editingRepair, followUpRequired: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="followUpRequired" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Follow-up required
                </label>
              </div>
              
              {editingRepair.followUpRequired && (
                <Textarea
                  label="Follow-up Notes"
                  value={editingRepair.followUpNotes}
                  onChange={(e) => setEditingRepair({ ...editingRepair, followUpNotes: e.target.value })}
                  placeholder="What follow-up work is needed?"
                  rows={2}
                />
              )}
            </div>
            
            <Textarea
              label="Technician Notes"
              value={editingRepair.technicianNotes}
              onChange={(e) => setEditingRepair({ ...editingRepair, technicianNotes: e.target.value })}
              placeholder="Additional notes or observations..."
              rows={2}
            />
          </div>
        )}
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={() => setEditingRepair(null)}>
            Cancel
          </Button>
          <Button onClick={handleSaveRepair}>
            Save Repair
          </Button>
        </div>
      </Modal>

      {/* Email Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Email PC Repairs Report"
        size="lg"
      >
        <div className="space-y-4">
          <Alert variant="info">
            <strong>Email Recipients:</strong><br />
            {(EMAIL_RECIPIENTS.pcRepairs || EMAIL_RECIPIENTS.default).join(', ')}
          </Alert>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Report Summary:</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>Total PC Repairs: {repairsData.length}</div>
              <div>Completed: {repairsData.filter(r => r.status === 'completed').length}</div>
              <div>In Progress: {repairsData.filter(r => r.status === 'in-progress' || r.status === 'pending').length}</div>
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
        onConfirm={() => handleDeleteRepair(showDeleteDialog?.id)}
        title="Delete PC Repair"
        message={`Are you sure you want to delete the repair record for "${showDeleteDialog?.pcName}"? This action cannot be undone.`}
        confirmText="Delete Repair"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default PCRepairs;