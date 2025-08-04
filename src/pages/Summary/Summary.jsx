import React, { useState, useEffect } from 'react';
import { FileText, Save, RefreshCw, Camera, BarChart3, Calendar, User, Building, Target, FileCheck, Mail } from 'lucide-react';
import Section from '../../components/ui/Section';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import PhotoUpload from '../../components/ui/PhotoUpload';
import ProgressBar from '../../components/ui/ProgressBar';
import Alert from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useApp } from '../../context/AppContext';
import { EMAIL_RECIPIENTS } from '../../constants/emailConfig';

const Summary = () => {
  const { reportData, updateReportData, addNotification, isLoading, setActivePage } = useApp();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [offices, setOffices] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  // Load offices and technicians from localStorage
  useEffect(() => {
    try {
      const savedOffices = localStorage.getItem('rss_offices');
      const savedTechnicians = localStorage.getItem('rss_technicians');
      
      if (savedOffices) {
        setOffices(JSON.parse(savedOffices));
      }
      
      if (savedTechnicians) {
        setTechnicians(JSON.parse(savedTechnicians));
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  }, []);

  // Use the main reportData structure
  const summaryData = {
    office: reportData.office || '',
    visitDate: reportData.date || '',
    technician: reportData.technician || '',
    purpose: reportData.purpose || '',
    overallNotes: reportData.overallNotes || '',
    dataClosetPhotos: reportData.dataClosetPhotos || [],
    trainingRoomPhotos: reportData.trainingRoomPhotos || []
  };

  const updateSummaryData = (field, value) => {
    // Map field names to the main reportData structure
    const fieldMapping = {
      office: 'office',
      visitDate: 'date',
      technician: 'technician',
      purpose: 'purpose',
      overallNotes: 'overallNotes',
      dataClosetPhotos: 'dataClosetPhotos',
      trainingRoomPhotos: 'trainingRoomPhotos'
    };
    
    const actualField = fieldMapping[field] || field;
    updateReportData(actualField, value);
  };

  const handlePhotoChange = (type, photos) => {
    updateSummaryData(type, photos);
  };

  const calculateProgress = () => {
    const basicInfoFields = ['office', 'visitDate', 'technician'];
    const basicInfoComplete = basicInfoFields.every(field => summaryData[field]?.trim());
    
    const photosComplete = (summaryData.dataClosetPhotos?.length > 0) || (summaryData.trainingRoomPhotos?.length > 0);
    
    const notesComplete = summaryData.overallNotes?.trim();
    
    const completedSections = [basicInfoComplete, photosComplete, notesComplete].filter(Boolean).length;
    return Math.round((completedSections / 3) * 100);
  };

  const progress = calculateProgress();

  const handleSave = () => {
    addNotification({
      type: 'success',
      message: 'Summary data saved successfully',
      duration: 3000
    });
  };

  const handleReset = () => {
    // Reset the main reportData fields
    updateReportData('office', '');
    updateReportData('date', '');
    updateReportData('technician', '');
    updateReportData('purpose', '');
    updateReportData('overallNotes', '');
    updateReportData('dataClosetPhotos', []);
    updateReportData('trainingRoomPhotos', []);
    
    setShowResetDialog(false);
    addNotification({
      type: 'info',
      message: 'Summary data has been reset',
      duration: 3000
    });
  };

  // Email functionality
  const generateEmailReport = () => {
    const office = reportData.office || 'Office Visit';
    const date = reportData.date || new Date().toISOString().split('T')[0];
    
    const subject = `Visit Summary Report - ${office} - ${date}`;
    
    let body = `Office Visit Summary Report\n`;
    body += `Office: ${office}\n`;
    body += `Date: ${date}\n`;
    body += `Technician: ${reportData.technician || 'Not specified'}\n`;
    body += `Purpose: ${reportData.purpose || 'Not specified'}\n`;
    body += `Report Generated: ${new Date().toLocaleString()}\n\n`;
    
    if (reportData.dataClosetPhotos && reportData.dataClosetPhotos.length > 0) {
      body += `Data Closet Photos: ${reportData.dataClosetPhotos.length} photos attached\n`;
    }
    
    if (reportData.trainingRoomPhotos && reportData.trainingRoomPhotos.length > 0) {
      body += `Training Room Photos: ${reportData.trainingRoomPhotos.length} photos attached\n`;
    }
    
    if (reportData.overallNotes) {
      body += `\nOVERALL NOTES:\n${reportData.overallNotes}\n`;
    }
    
    body += `\nSummary Progress: ${progress}% complete\n`;
    
    const recipients = EMAIL_RECIPIENTS.fullReport || EMAIL_RECIPIENTS.default;
    const mailtoLink = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    return { mailtoLink, subject, body, recipients };
  };

  const sendEmailReport = () => {
    const { mailtoLink } = generateEmailReport();
    window.location.href = mailtoLink;
    setShowEmailModal(false);
    
    addNotification({
      type: 'success',
      message: 'Email client opened with summary report',
      duration: 3000
    });
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: <Building size={16} /> },
    { id: 'photos', label: 'Photos', icon: <Camera size={16} /> },
    { id: 'notes', label: 'Notes', icon: <FileText size={16} /> }
  ];

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Section title="Summary Progress" icon={<FileCheck className="text-green-500" />}>
        <div className="space-y-4">
          <ProgressBar 
            progress={progress} 
            label="Overall Summary Completion"
            color={progress >= 80 ? 'green' : progress >= 50 ? 'blue' : 'yellow'}
            size="lg"
          />
          {progress < 100 && (
            <Alert variant="info">
              Complete all sections (Basic Info, Photos, Grading, Notes) to finish the summary.
            </Alert>
          )}
        </div>
      </Section>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'basic' && (
        <Section 
          title="Visit Summary" 
          icon={<Building className="text-blue-500" />}
          helpText="Provide essential details about your office visit."
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Office Location"
                value={summaryData.office || ''}
                onChange={(e) => updateSummaryData('office', e.target.value)}
                required
              >
                <option value="">Select Office Location</option>
                {offices.map(office => (
                  <option key={office.id} value={office.name}>
                    {office.name} {office.location && `(${office.location})`}
                  </option>
                ))}
              </Select>
              <Input
                label="Visit Date"
                type="date"
                value={summaryData.visitDate || ''}
                onChange={(e) => updateSummaryData('visitDate', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Technician Name"
                value={summaryData.technician || ''}
                onChange={(e) => updateSummaryData('technician', e.target.value)}
                required
              >
                <option value="">Select Technician</option>
                {technicians.map(technician => (
                  <option key={technician.id} value={technician.name}>
                    {technician.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Visit Summary Text Area */}
            <div>
              <Textarea
                label="Visit Summary"
                value={summaryData.overallNotes || ''}
                onChange={(e) => updateSummaryData('overallNotes', e.target.value)}
                placeholder="Provide a comprehensive summary of your office visit, including key observations, activities performed, and overall assessment..."
                rows={6}
                required
              />
            </div>

          </div>
        </Section>
      )}

      {activeTab === 'photos' && (
        <Section 
          title="Photo Documentation" 
          icon={<Camera className="text-green-500" />}
          helpText="Upload photos of data closets and training rooms for documentation."
        >
          <div className="space-y-8">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Data Closet Photos
              </h4>
              <PhotoUpload
                photos={summaryData.dataClosetPhotos || []}
                onPhotosChange={(photos) => handlePhotoChange('dataClosetPhotos', photos)}
                maxPhotos={10}
                label="Data Closet Documentation"
              />
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Training Room Photos
              </h4>
              <PhotoUpload
                photos={summaryData.trainingRoomPhotos || []}
                onPhotosChange={(photos) => handlePhotoChange('trainingRoomPhotos', photos)}
                maxPhotos={10}
                label="Training Room Documentation"
              />
            </div>

            <Alert variant="info">
              <strong>Photo Guidelines:</strong>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Take clear, well-lit photos of equipment and spaces</li>
                <li>Include before/after shots when applicable</li>
                <li>Capture any issues or improvements made</li>
                <li>Ensure sensitive information is not visible</li>
              </ul>
            </Alert>
          </div>
        </Section>
      )}


      {activeTab === 'notes' && (
        <Section 
          title="Overall Notes & Observations" 
          icon={<FileText className="text-orange-500" />}
          helpText="Provide comprehensive notes about the visit, observations, and recommendations."
        >
          <div className="space-y-6">
            <Textarea
              label="Overall Visit Notes"
              value={summaryData.overallNotes || ''}
              onChange={(e) => updateSummaryData('overallNotes', e.target.value)}
              placeholder="Provide detailed notes about the visit, including:
• Key observations and findings
• Actions taken during the visit
• Issues identified and their resolution
• Recommendations for future visits
• Staff interactions and training provided
• Any equipment or system changes made"
              rows={12}
            />

            <Alert variant="info">
              <strong>Tips for Complete Notes:</strong>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Be specific about systems and equipment reviewed</li>
                <li>Include any issues found and how they were addressed</li>
                <li>Note recommendations for future maintenance or upgrades</li>
                <li>Document changes made to existing configurations</li>
                <li>Mention any training provided to local staff</li>
              </ul>
            </Alert>
          </div>
        </Section>
      )}

      {/* Action Buttons */}
      <Section>
        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={handleSave}
            disabled={isLoading}
            variant="primary"
            size="lg"
          >
            <Save size={18} />
            Save Summary
          </Button>
          
          <Button
            onClick={() => setShowEmailModal(true)}
            disabled={isLoading}
            variant="outline"
            size="lg"
          >
            <Mail size={18} />
            Email Summary
          </Button>
          
          <Button
            onClick={() => setShowResetDialog(true)}
            disabled={isLoading}
            variant="outline"
            size="lg"
          >
            <RefreshCw size={18} />
            Reset All Data
          </Button>

          {progress === 100 && (
            <Button
              variant="success"
              size="lg"
              onClick={() => setActivePage('Infrastructure')}
            >
              <FileCheck size={18} />
              Continue to Infrastructure
            </Button>
          )}
        </div>
      </Section>

      {/* Email Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Email Summary Report"
        size="lg"
      >
        <div className="space-y-4">
          <Alert variant="info">
            <strong>Email Recipients:</strong><br />
            {(EMAIL_RECIPIENTS.fullReport || EMAIL_RECIPIENTS.default).join(', ')}
          </Alert>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Report Summary:</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>Office: {summaryData.office || 'Not specified'}</div>
              <div>Visit Date: {summaryData.visitDate || 'Not set'}</div>
              <div>Technician: {summaryData.technician || 'Not specified'}</div>
              <div>Progress: {progress}% complete</div>
              <div>Photos: {(summaryData.dataClosetPhotos.length + summaryData.trainingRoomPhotos.length)} attached</div>
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

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onConfirm={handleReset}
        title="Reset Summary Data"
        message="Are you sure you want to reset all summary data? This will clear all fields and photos. This action cannot be undone."
        confirmText="Reset All Data"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Summary;