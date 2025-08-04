import React, { useState } from 'react';
import { AlertTriangle, Plus, Edit, Trash2, Clock, CheckCircle, XCircle, BarChart3, Mail, FileText } from 'lucide-react';
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

const Issues = () => {
  const { reportData, updateReportData, addNotification } = useApp();
  const [editingIssue, setEditingIssue] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  // Initialize issues data
  const issuesData = reportData.issues || [];

  const updateIssuesData = (issues) => {
    updateReportData('issues', issues);
  };

  const severityOptions = [
    { value: 'critical', label: 'Critical', color: 'red' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'medium', label: 'Medium', color: 'yellow' },
    { value: 'low', label: 'Low', color: 'blue' }
  ];

  const statusOptions = [
    { value: 'open', label: 'Open', color: 'red' },
    { value: 'in-progress', label: 'In Progress', color: 'yellow' },
    { value: 'resolved', label: 'Resolved', color: 'green' },
    { value: 'closed', label: 'Closed', color: 'gray' }
  ];

  const categoryOptions = [
    'Hardware',
    'Software',
    'Network',
    'Security',
    'User Access',
    'Performance',
    'Data Management',
    'Backup & Recovery',
    'Documentation',
    'Training',
    'Compliance',
    'Other'
  ];

  const getEmptyIssue = () => ({
    id: Date.now(),
    title: '',
    description: '',
    category: '',
    severity: 'medium',
    status: 'open',
    location: '',
    affectedUsers: '',
    reportedBy: '',
    assignedTo: '',
    dateReported: new Date().toISOString().split('T')[0],
    dateResolved: '',
    resolution: '',
    ticketNumber: '',
    ticketLink: '',
    notes: ''
  });

  const handleAddIssue = () => {
    setEditingIssue(getEmptyIssue());
  };

  const handleEditIssue = (issue) => {
    setEditingIssue({ ...issue });
  };

  const handleSaveIssue = () => {
    if (!editingIssue.title.trim()) {
      addNotification({
        type: 'error',
        message: 'Issue title is required',
        duration: 3000
      });
      return;
    }

    let updatedIssues;
    if (editingIssue.id && issuesData.find(issue => issue.id === editingIssue.id)) {
      updatedIssues = issuesData.map(issue => 
        issue.id === editingIssue.id ? editingIssue : issue
      );
    } else {
      updatedIssues = [...issuesData, { ...editingIssue, id: Date.now() }];
    }

    updateIssuesData(updatedIssues);
    setEditingIssue(null);
    
    addNotification({
      type: 'success',
      message: 'Issue saved successfully',
      duration: 3000
    });
  };

  const handleDeleteIssue = (id) => {
    const updatedIssues = issuesData.filter(issue => issue.id !== id);
    updateIssuesData(updatedIssues);
    setShowDeleteDialog(null);
    
    addNotification({
      type: 'info',
      message: 'Issue deleted successfully',
      duration: 3000
    });
  };

  const getFilteredIssues = () => {
    return issuesData.filter(issue => {
      const statusMatch = filterStatus === 'all' || issue.status === filterStatus;
      const severityMatch = filterSeverity === 'all' || issue.severity === filterSeverity;
      return statusMatch && severityMatch;
    });
  };

  const calculateProgress = () => {
    if (issuesData.length === 0) return 100;
    const resolvedCount = issuesData.filter(issue => 
      issue.status === 'resolved' || issue.status === 'closed'
    ).length;
    return Math.round((resolvedCount / issuesData.length) * 100);
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    };
    return colors[severity] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      'in-progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };
    return colors[status] || colors.open;
  };

  const getStatusIcon = (status) => {
    const icons = {
      open: <XCircle size={16} />,
      'in-progress': <Clock size={16} />,
      resolved: <CheckCircle size={16} />,
      closed: <CheckCircle size={16} />
    };
    return icons[status] || icons.open;
  };

  // Email functionality
  const generateEmailReport = () => {
    const office = reportData.office || 'Office Visit';
    const date = reportData.date || new Date().toISOString().split('T')[0];
    
    const subject = `Issues Report - ${office} - ${date}`;
    
    let body = `Issues & Problems Report\n`;
    body += `Office: ${office}\n`;
    body += `Date: ${date}\n`;
    body += `Report Generated: ${new Date().toLocaleString()}\n\n`;
    
    const openIssues = issuesData.filter(issue => issue.status === 'open');
    const criticalIssues = issuesData.filter(issue => issue.severity === 'critical');
    
    body += `SUMMARY:\n`;
    body += `Total Issues: ${issuesData.length}\n`;
    body += `Open Issues: ${openIssues.length}\n`;
    body += `Critical Issues: ${criticalIssues.length}\n`;
    body += `Resolution Progress: ${calculateProgress()}%\n\n`;
    
    if (criticalIssues.length > 0) {
      body += `CRITICAL ISSUES:\n`;
      criticalIssues.forEach(issue => {
        body += `\n• ${issue.title}\n`;
        body += `  Category: ${issue.category}\n`;
        body += `  Status: ${issue.status}\n`;
        body += `  Location: ${issue.location}\n`;
        if (issue.description) body += `  Description: ${issue.description}\n`;
      });
      body += `\n`;
    }
    
    if (openIssues.length > 0) {
      body += `ALL OPEN ISSUES:\n`;
      openIssues.forEach(issue => {
        body += `\n• ${issue.title}\n`;
        body += `  Severity: ${issue.severity}\n`;
        body += `  Category: ${issue.category}\n`;
        body += `  Location: ${issue.location}\n`;
        if (issue.affectedUsers) body += `  Affected Users: ${issue.affectedUsers}\n`;
        if (issue.ticketNumber) body += `  Ticket Number: ${issue.ticketNumber}\n`;
        if (issue.ticketLink) body += `  Ticket Link: ${issue.ticketLink}\n`;
      });
    }
    
    const recipients = EMAIL_RECIPIENTS.issues || EMAIL_RECIPIENTS.default;
    const mailtoLink = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    return { mailtoLink, subject, body, recipients };
  };

  const sendEmailReport = () => {
    const { mailtoLink } = generateEmailReport();
    window.location.href = mailtoLink;
    setShowEmailModal(false);
    
    addNotification({
      type: 'success',
      message: 'Email client opened with issues report',
      duration: 3000
    });
  };

  const filteredIssues = getFilteredIssues();
  const progress = calculateProgress();

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Section title="Issues Resolution Progress" icon={<BarChart3 className="text-blue-500" />}>
        <div className="space-y-4">
          <ProgressBar 
            progress={progress} 
            label="Issues Resolution Rate"
            color={progress >= 80 ? 'green' : progress >= 50 ? 'yellow' : 'red'}
            size="lg"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{issuesData.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Issues</p>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {issuesData.filter(i => i.status === 'open').length}
              </p>
              <p className="text-xs text-red-500 dark:text-red-400">Open</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {issuesData.filter(i => i.status === 'in-progress').length}
              </p>
              <p className="text-xs text-yellow-500 dark:text-yellow-400">In Progress</p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {issuesData.filter(i => i.status === 'resolved' || i.status === 'closed').length}
              </p>
              <p className="text-xs text-green-500 dark:text-green-400">Resolved</p>
            </div>
          </div>
        </div>
      </Section>

      <Section 
        title="Issues & Problems Management" 
        icon={<AlertTriangle className="text-red-500" />}
        helpText="Document, track, and manage issues discovered during your office visit."
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
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="w-auto"
              >
                <option value="all">All Severities</option>
                {severityOptions.map(severity => (
                  <option key={severity.value} value={severity.value}>{severity.label}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleAddIssue} size="sm">
                <Plus size={16} />
                Add Issue
              </Button>
              <Button 
                onClick={() => setShowEmailModal(true)} 
                variant="outline" 
                size="sm"
                disabled={issuesData.length === 0}
              >
                <Mail size={16} />
                Email Report
              </Button>
            </div>
          </div>

          {/* Issues List */}
          {filteredIssues.length > 0 ? (
            <div className="space-y-4">
              {filteredIssues.map(issue => (
                <div 
                  key={issue.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                          {issue.title}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                          {issue.severity.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(issue.status)}`}>
                          {getStatusIcon(issue.status)}
                          {issue.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Category:</span>
                          <span className="ml-1 text-gray-900 dark:text-gray-100">{issue.category || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Location:</span>
                          <span className="ml-1 text-gray-900 dark:text-gray-100">{issue.location || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Reported:</span>
                          <span className="ml-1 text-gray-900 dark:text-gray-100">{issue.dateReported}</span>
                        </div>
                        {issue.affectedUsers && (
                          <div>
                            <span className="font-medium text-gray-600 dark:text-gray-400">Affected Users:</span>
                            <span className="ml-1 text-gray-900 dark:text-gray-100">{issue.affectedUsers}</span>
                          </div>
                        )}
                      </div>
                      
                      {(issue.ticketNumber || issue.ticketLink) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                          {issue.ticketNumber && (
                            <div>
                              <span className="font-medium text-blue-600 dark:text-blue-400">Ticket #:</span>
                              <span className="ml-1 text-blue-900 dark:text-blue-100">{issue.ticketNumber}</span>
                            </div>
                          )}
                          {issue.ticketLink && (
                            <div>
                              <span className="font-medium text-blue-600 dark:text-blue-400">Ticket Link:</span>
                              <a 
                                href={issue.ticketLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
                              >
                                View Ticket
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {issue.description && (
                        <p className="text-gray-700 dark:text-gray-300 mb-3">{issue.description}</p>
                      )}
                      
                      {issue.resolution && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-3">
                          <p className="text-sm text-green-800 dark:text-green-200">
                            <strong>Resolution:</strong> {issue.resolution}
                          </p>
                          {issue.dateResolved && (
                            <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                              Resolved on: {issue.dateResolved}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4 flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditIssue(issue)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setShowDeleteDialog(issue)}
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
              <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {filterStatus !== 'all' || filterSeverity !== 'all' 
                  ? 'No issues match the current filters' 
                  : 'No issues reported yet'}
              </p>
              <p className="text-sm mb-4">
                {filterStatus !== 'all' || filterSeverity !== 'all'
                  ? 'Try adjusting your filters to see more issues'
                  : 'Start documenting issues and problems found during your visit'}
              </p>
              <Button onClick={handleAddIssue}>
                <Plus size={16} />
                Report First Issue
              </Button>
            </div>
          )}
        </div>
      </Section>

      {/* Edit Issue Modal */}
      <Modal
        isOpen={!!editingIssue}
        onClose={() => setEditingIssue(null)}
        title={`${editingIssue?.id && issuesData.find(issue => issue.id === editingIssue.id) ? 'Edit' : 'Add'} Issue`}
        size="xl"
      >
        {editingIssue && (
          <div className="space-y-4">
            <Input
              label="Issue Title *"
              value={editingIssue.title}
              onChange={(e) => setEditingIssue({ ...editingIssue, title: e.target.value })}
              placeholder="Enter a descriptive title for the issue"
              required
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Category"
                value={editingIssue.category}
                onChange={(e) => setEditingIssue({ ...editingIssue, category: e.target.value })}
              >
                <option value="">Select Category</option>
                {categoryOptions.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
              
              <Select
                label="Severity"
                value={editingIssue.severity}
                onChange={(e) => setEditingIssue({ ...editingIssue, severity: e.target.value })}
              >
                {severityOptions.map(severity => (
                  <option key={severity.value} value={severity.value}>{severity.label}</option>
                ))}
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Status"
                value={editingIssue.status}
                onChange={(e) => setEditingIssue({ ...editingIssue, status: e.target.value })}
              >
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </Select>
              
              <Input
                label="Location"
                value={editingIssue.location}
                onChange={(e) => setEditingIssue({ ...editingIssue, location: e.target.value })}
                placeholder="Where was this issue found?"
              />
            </div>
            
            <Textarea
              label="Description"
              value={editingIssue.description}
              onChange={(e) => setEditingIssue({ ...editingIssue, description: e.target.value })}
              placeholder="Detailed description of the issue..."
              rows={3}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Affected Users"
                value={editingIssue.affectedUsers}
                onChange={(e) => setEditingIssue({ ...editingIssue, affectedUsers: e.target.value })}
                placeholder="Number or list of affected users"
              />
              
              <Input
                label="Ticket Number"
                value={editingIssue.ticketNumber}
                onChange={(e) => setEditingIssue({ ...editingIssue, ticketNumber: e.target.value })}
                placeholder="Support ticket number (optional)"
              />
            </div>
            
            <Input
              label="Ticket Link"
              value={editingIssue.ticketLink}
              onChange={(e) => setEditingIssue({ ...editingIssue, ticketLink: e.target.value })}
              placeholder="Link to support ticket or tracking system (optional)"
              type="url"
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Reported By"
                value={editingIssue.reportedBy}
                onChange={(e) => setEditingIssue({ ...editingIssue, reportedBy: e.target.value })}
                placeholder="Who reported this issue?"
              />
              
              <Input
                label="Assigned To"
                value={editingIssue.assignedTo}
                onChange={(e) => setEditingIssue({ ...editingIssue, assignedTo: e.target.value })}
                placeholder="Who is responsible for fixing this?"
              />
            </div>
            
            {(editingIssue.status === 'resolved' || editingIssue.status === 'closed') && (
              <>
                <Textarea
                  label="Resolution"
                  value={editingIssue.resolution}
                  onChange={(e) => setEditingIssue({ ...editingIssue, resolution: e.target.value })}
                  placeholder="How was this issue resolved?"
                  rows={3}
                />
                
                <Input
                  label="Date Resolved"
                  type="date"
                  value={editingIssue.dateResolved}
                  onChange={(e) => setEditingIssue({ ...editingIssue, dateResolved: e.target.value })}
                />
              </>
            )}
            
            <Textarea
              label="Additional Notes"
              value={editingIssue.notes}
              onChange={(e) => setEditingIssue({ ...editingIssue, notes: e.target.value })}
              placeholder="Any additional notes or observations..."
              rows={2}
            />
          </div>
        )}
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={() => setEditingIssue(null)}>
            Cancel
          </Button>
          <Button onClick={handleSaveIssue}>
            Save Issue
          </Button>
        </div>
      </Modal>

      {/* Email Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Email Issues Report"
        size="lg"
      >
        <div className="space-y-4">
          <Alert variant="info">
            <strong>Email Recipients:</strong><br />
            {(EMAIL_RECIPIENTS.issues || EMAIL_RECIPIENTS.default).join(', ')}
          </Alert>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Report Summary:</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>Total Issues: {issuesData.length}</div>
              <div>Open Issues: {issuesData.filter(i => i.status === 'open').length}</div>
              <div>Critical Issues: {issuesData.filter(i => i.severity === 'critical').length}</div>
              <div>Resolution Progress: {progress}%</div>
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
        onConfirm={() => handleDeleteIssue(showDeleteDialog?.id)}
        title="Delete Issue"
        message={`Are you sure you want to delete "${showDeleteDialog?.title}"? This action cannot be undone.`}
        confirmText="Delete Issue"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Issues;