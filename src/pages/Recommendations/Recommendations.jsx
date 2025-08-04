import React, { useState } from 'react';
import { TrendingUp, Plus, Edit, Trash2, CheckCircle, Clock, Star, BarChart3, Mail, DollarSign, Calendar } from 'lucide-react';
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

const Recommendations = () => {
  const { reportData, updateReportData, addNotification } = useApp();
  const [editingRecommendation, setEditingRecommendation] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Initialize recommendations data
  const recommendationsData = reportData.recommendations || [];

  const updateRecommendationsData = (recommendations) => {
    updateReportData('recommendations', recommendations);
  };

  const priorityOptions = [
    { value: 'critical', label: 'Critical', color: 'red' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'medium', label: 'Medium', color: 'yellow' },
    { value: 'low', label: 'Low', color: 'blue' }
  ];

  const statusOptions = [
    { value: 'proposed', label: 'Proposed', color: 'blue' },
    { value: 'approved', label: 'Approved', color: 'green' },
    { value: 'in-progress', label: 'In Progress', color: 'yellow' },
    { value: 'completed', label: 'Completed', color: 'green' },
    { value: 'rejected', label: 'Rejected', color: 'red' },
    { value: 'deferred', label: 'Deferred', color: 'gray' }
  ];

  const categoryOptions = [
    'Security Enhancement',
    'Performance Improvement',
    'Hardware Upgrade',
    'Software Update',
    'Network Optimization',
    'User Training',
    'Process Improvement',
    'Cost Reduction',
    'Compliance',
    'Backup & Recovery',
    'Documentation',
    'Other'
  ];

  const getEmptyRecommendation = () => ({
    id: Date.now(),
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    status: 'proposed',
    justification: '',
    timeframe: '',
    dateProposed: new Date().toISOString().split('T')[0],
    dateImplemented: '',
    implementationNotes: '',
    notes: ''
  });

  const handleAddRecommendation = () => {
    setEditingRecommendation(getEmptyRecommendation());
  };

  const handleEditRecommendation = (recommendation) => {
    setEditingRecommendation({ ...recommendation });
  };

  const handleSaveRecommendation = () => {
    if (!editingRecommendation.title.trim()) {
      addNotification({
        type: 'error',
        message: 'Recommendation title is required',
        duration: 3000
      });
      return;
    }

    let updatedRecommendations;
    if (editingRecommendation.id && recommendationsData.find(rec => rec.id === editingRecommendation.id)) {
      updatedRecommendations = recommendationsData.map(rec => 
        rec.id === editingRecommendation.id ? editingRecommendation : rec
      );
    } else {
      updatedRecommendations = [...recommendationsData, { ...editingRecommendation, id: Date.now() }];
    }

    updateRecommendationsData(updatedRecommendations);
    setEditingRecommendation(null);
    
    addNotification({
      type: 'success',
      message: 'Recommendation saved successfully',
      duration: 3000
    });
  };

  const handleDeleteRecommendation = (id) => {
    const updatedRecommendations = recommendationsData.filter(rec => rec.id !== id);
    updateRecommendationsData(updatedRecommendations);
    setShowDeleteDialog(null);
    
    addNotification({
      type: 'info',
      message: 'Recommendation deleted successfully',
      duration: 3000
    });
  };

  const getFilteredRecommendations = () => {
    return recommendationsData.filter(rec => {
      const statusMatch = filterStatus === 'all' || rec.status === filterStatus;
      const priorityMatch = filterPriority === 'all' || rec.priority === filterPriority;
      return statusMatch && priorityMatch;
    });
  };

  const calculateProgress = () => {
    if (recommendationsData.length === 0) return 100;
    const completedCount = recommendationsData.filter(rec => 
      rec.status === 'completed'
    ).length;
    return Math.round((completedCount / recommendationsData.length) * 100);
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
      proposed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'in-progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      deferred: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };
    return colors[status] || colors.proposed;
  };

  const getStatusIcon = (status) => {
    const icons = {
      proposed: <Clock size={16} />,
      approved: <CheckCircle size={16} />,
      'in-progress': <Clock size={16} />,
      completed: <CheckCircle size={16} />,
      rejected: <Clock size={16} />,
      deferred: <Clock size={16} />
    };
    return icons[status] || icons.proposed;
  };

  // Email functionality
  const generateEmailReport = () => {
    const office = reportData.office || 'Office Visit';
    const date = reportData.date || new Date().toISOString().split('T')[0];
    
    const subject = `Recommendations Report - ${office} - ${date}`;
    
    let body = `Recommendations & Improvements Report\n`;
    body += `Office: ${office}\n`;
    body += `Date: ${date}\n`;
    body += `Report Generated: ${new Date().toLocaleString()}\n\n`;
    
    const criticalRecs = recommendationsData.filter(rec => rec.priority === 'critical');
    const approvedRecs = recommendationsData.filter(rec => rec.status === 'approved');
    
    body += `SUMMARY:\n`;
    body += `Total Recommendations: ${recommendationsData.length}\n`;
    body += `Critical Priority: ${criticalRecs.length}\n`;
    body += `Approved Recommendations: ${approvedRecs.length}\n`;
    body += `Implementation Progress: ${calculateProgress()}%\n\n`;
    
    if (criticalRecs.length > 0) {
      body += `CRITICAL PRIORITY RECOMMENDATIONS:\n`;
      criticalRecs.forEach(rec => {
        body += `\n• ${rec.title}\n`;
        body += `  Category: ${rec.category}\n`;
        body += `  Status: ${rec.status}\n`;
        if (rec.timeframe) body += `  Timeframe: ${rec.timeframe}\n`;
        if (rec.description) body += `  Description: ${rec.description}\n`;
      });
      body += `\n`;
    }
    
    if (approvedRecs.length > 0) {
      body += `APPROVED RECOMMENDATIONS:\n`;
      approvedRecs.forEach(rec => {
        body += `\n• ${rec.title}\n`;
        body += `  Priority: ${rec.priority}\n`;
        body += `  Category: ${rec.category}\n`;
        if (rec.timeframe) body += `  Timeframe: ${rec.timeframe}\n`;
        if (rec.description) body += `  Description: ${rec.description}\n`;
      });
    }
    
    const recipients = EMAIL_RECIPIENTS.recommendations || EMAIL_RECIPIENTS.default;
    const mailtoLink = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    return { mailtoLink, subject, body, recipients };
  };

  const sendEmailReport = () => {
    const { mailtoLink } = generateEmailReport();
    window.location.href = mailtoLink;
    setShowEmailModal(false);
    
    addNotification({
      type: 'success',
      message: 'Email client opened with recommendations report',
      duration: 3000
    });
  };

  const filteredRecommendations = getFilteredRecommendations();
  const progress = calculateProgress();

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Section title="Implementation Progress" icon={<BarChart3 className="text-blue-500" />}>
        <div className="space-y-4">
          <ProgressBar 
            progress={progress} 
            label="Recommendations Implementation Rate"
            color={progress >= 80 ? 'green' : progress >= 50 ? 'blue' : 'yellow'}
            size="lg"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{recommendationsData.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Recommendations</p>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {recommendationsData.filter(r => r.status === 'proposed').length}
              </p>
              <p className="text-xs text-blue-500 dark:text-blue-400">Proposed</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {recommendationsData.filter(r => r.status === 'approved' || r.status === 'in-progress').length}
              </p>
              <p className="text-xs text-yellow-500 dark:text-yellow-400">In Progress</p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {recommendationsData.filter(r => r.status === 'completed').length}
              </p>
              <p className="text-xs text-green-500 dark:text-green-400">Completed</p>
            </div>
          </div>
        </div>
      </Section>

      <Section 
        title="Recommendations & Improvements" 
        icon={<TrendingUp className="text-indigo-500" />}
        helpText="Track and manage improvement recommendations for the office environment."
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
              <Button onClick={handleAddRecommendation} size="sm">
                <Plus size={16} />
                Add Recommendation
              </Button>
              <Button 
                onClick={() => setShowEmailModal(true)} 
                variant="outline" 
                size="sm"
                disabled={recommendationsData.length === 0}
              >
                <Mail size={16} />
                Email Report
              </Button>
            </div>
          </div>

          {/* Recommendations List */}
          {filteredRecommendations.length > 0 ? (
            <div className="space-y-4">
              {filteredRecommendations.map(recommendation => (
                <div 
                  key={recommendation.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                          {recommendation.title}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(recommendation.priority)}`}>
                          {recommendation.priority.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(recommendation.status)}`}>
                          {getStatusIcon(recommendation.status)}
                          {recommendation.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Category:</span>
                          <span className="ml-1 text-gray-900 dark:text-gray-100">{recommendation.category || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Proposed:</span>
                          <span className="ml-1 text-gray-900 dark:text-gray-100">{recommendation.dateProposed}</span>
                        </div>
                        {recommendation.timeframe && (
                          <div>
                            <span className="font-medium text-gray-600 dark:text-gray-400">Timeframe:</span>
                            <span className="ml-1 text-gray-900 dark:text-gray-100">{recommendation.timeframe}</span>
                          </div>
                        )}
                      </div>
                      
                      {recommendation.description && (
                        <p className="text-gray-700 dark:text-gray-300 mb-3">{recommendation.description}</p>
                      )}
                      
                      {recommendation.implementationNotes && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-3">
                          <p className="text-sm text-green-800 dark:text-green-200">
                            <strong>Implementation Notes:</strong> {recommendation.implementationNotes}
                          </p>
                          {recommendation.dateImplemented && (
                            <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                              Implemented on: {recommendation.dateImplemented}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4 flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditRecommendation(recommendation)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setShowDeleteDialog(recommendation)}
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
              <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {filterStatus !== 'all' || filterPriority !== 'all' 
                  ? 'No recommendations match the current filters' 
                  : 'No recommendations created yet'}
              </p>
              <p className="text-sm mb-4">
                {filterStatus !== 'all' || filterPriority !== 'all'
                  ? 'Try adjusting your filters to see more recommendations'
                  : 'Start documenting improvement recommendations for the office'}
              </p>
              <Button onClick={handleAddRecommendation}>
                <Plus size={16} />
                Add First Recommendation
              </Button>
            </div>
          )}
        </div>
      </Section>

      {/* Edit Recommendation Modal */}
      <Modal
        isOpen={!!editingRecommendation}
        onClose={() => setEditingRecommendation(null)}
        title={`${editingRecommendation?.id && recommendationsData.find(rec => rec.id === editingRecommendation.id) ? 'Edit' : 'Add'} Recommendation`}
        size="xl"
      >
        {editingRecommendation && (
          <div className="space-y-4">
            <Input
              label="Recommendation Title *"
              value={editingRecommendation.title}
              onChange={(e) => setEditingRecommendation({ ...editingRecommendation, title: e.target.value })}
              placeholder="Enter a descriptive title for the recommendation"
              required
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Category"
                value={editingRecommendation.category}
                onChange={(e) => setEditingRecommendation({ ...editingRecommendation, category: e.target.value })}
              >
                <option value="">Select Category</option>
                {categoryOptions.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
              
              <Select
                label="Priority"
                value={editingRecommendation.priority}
                onChange={(e) => setEditingRecommendation({ ...editingRecommendation, priority: e.target.value })}
              >
                {priorityOptions.map(priority => (
                  <option key={priority.value} value={priority.value}>{priority.label}</option>
                ))}
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Status"
                value={editingRecommendation.status}
                onChange={(e) => setEditingRecommendation({ ...editingRecommendation, status: e.target.value })}
              >
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </Select>
              
              <Input
                label="Timeframe"
                value={editingRecommendation.timeframe}
                onChange={(e) => setEditingRecommendation({ ...editingRecommendation, timeframe: e.target.value })}
                placeholder="e.g., 30 days, Q2 2024, etc."
              />
            </div>
            
            <Textarea
              label="Description"
              value={editingRecommendation.description}
              onChange={(e) => setEditingRecommendation({ ...editingRecommendation, description: e.target.value })}
              placeholder="Detailed description of the recommendation..."
              rows={3}
            />
            
            <Textarea
              label="Justification"
              value={editingRecommendation.justification}
              onChange={(e) => setEditingRecommendation({ ...editingRecommendation, justification: e.target.value })}
              placeholder="Why is this recommendation important?"
              rows={2}
            />
            
            {editingRecommendation.status === 'completed' && (
              <>
                <Textarea
                  label="Implementation Notes"
                  value={editingRecommendation.implementationNotes}
                  onChange={(e) => setEditingRecommendation({ ...editingRecommendation, implementationNotes: e.target.value })}
                  placeholder="How was this recommendation implemented?"
                  rows={3}
                />
                
                <Input
                  label="Date Implemented"
                  type="date"
                  value={editingRecommendation.dateImplemented}
                  onChange={(e) => setEditingRecommendation({ ...editingRecommendation, dateImplemented: e.target.value })}
                />
              </>
            )}
            
            <Textarea
              label="Additional Notes"
              value={editingRecommendation.notes}
              onChange={(e) => setEditingRecommendation({ ...editingRecommendation, notes: e.target.value })}
              placeholder="Any additional notes or observations..."
              rows={2}
            />
          </div>
        )}
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={() => setEditingRecommendation(null)}>
            Cancel
          </Button>
          <Button onClick={handleSaveRecommendation}>
            Save Recommendation
          </Button>
        </div>
      </Modal>

      {/* Email Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Email Recommendations Report"
        size="lg"
      >
        <div className="space-y-4">
          <Alert variant="info">
            <strong>Email Recipients:</strong><br />
            {(EMAIL_RECIPIENTS.recommendations || EMAIL_RECIPIENTS.default).join(', ')}
          </Alert>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Report Summary:</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>Total Recommendations: {recommendationsData.length}</div>
              <div>Critical Priority: {recommendationsData.filter(r => r.priority === 'critical').length}</div>
              <div>Approved: {recommendationsData.filter(r => r.status === 'approved').length}</div>
              <div>Implementation Progress: {progress}%</div>
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
        onConfirm={() => handleDeleteRecommendation(showDeleteDialog?.id)}
        title="Delete Recommendation"
        message={`Are you sure you want to delete "${showDeleteDialog?.title}"? This action cannot be undone.`}
        confirmText="Delete Recommendation"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Recommendations;