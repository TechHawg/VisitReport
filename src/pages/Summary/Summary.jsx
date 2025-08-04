import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Save, RefreshCw, Camera, BarChart3, Building, FileCheck, Mail } from 'lucide-react';
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
  // Normalize grading data to context schema (array of {category, score, comments})
  const gradingArray = Array.isArray(reportData.officeGrading) ? reportData.officeGrading : [
    { category: 'IT Relationship', score: '', comments: '' },
    { category: 'Inventory', score: '', comments: '' },
    { category: 'Sales Floor - IT Experience', score: '', comments: '' },
    { category: 'Data Closet', score: '', comments: '' },
  ];

  // Map UI ids to human-readable categories used in context
  const categoryIdToLabel = {
    itRelationship: 'IT Relationship',
    inventory: 'Inventory',
    salesFloorExperience: 'Sales Floor - IT Experience',
    dataCloset: 'Data Closet',
  };

  // Convert array to a quick lookup for UI binding
  const gradingData = useMemo(() => {
    const map = {};
    gradingArray.forEach(item => { map[item.category] = item; });
    return {
      itRelationship: map['IT Relationship'] || { score: '', comments: '' },
      inventory: map['Inventory'] || { score: '', comments: '' },
      salesFloorExperience: map['Sales Floor - IT Experience'] || { score: '', comments: '' },
      dataCloset: map['Data Closet'] || { score: '', comments: '' },
    };
  }, [gradingArray]);

  const clampScore = (val) => {
    if (val === '' || val === null || val === undefined) return '';
    const n = parseInt(val, 10);
    if (isNaN(n)) return '';
    return String(Math.max(1, Math.min(5, n)));
  };

  const updateGradingData = (categoryId, field, value) => {
    const label = categoryIdToLabel[categoryId];
    const next = gradingArray.map(item => {
      if (item.category !== label) return item;
      const nextVal = field === 'score' ? clampScore(value) : value;
      return { ...item, [field]: nextVal };
    });
    updateReportData('officeGrading', next);
  };
  const gradingCategories = [
    {
      id: 'itRelationship',
      title: 'IT Relationship',
      description: 'Evaluate the working relationship with local IT staff, communication effectiveness, and collaboration level.'
    },
    {
      id: 'inventory',
      title: 'Inventory Management',
      description: 'Assess the accuracy, organization, and maintenance of hardware and software inventory systems.'
    },
    {
      id: 'salesFloorExperience',
      title: 'Sales Floor IT Experience',
      description: 'Rate the user experience, system performance, and IT support quality on the sales floor.'
    },
    {
      id: 'dataCloset',
      title: 'Data Closet',
      description: 'Evaluate organization, labeling, cleanliness, and overall condition of network infrastructure.'
    }
  ];
  const scoreOptions = [
    { value: '', label: 'Select Score' },
    { value: '5', label: '5 - Excellent' },
    { value: '4', label: '4 - Good' },
    { value: '3', label: '3 - Average' },
    { value: '2', label: '2 - Below Average' },
    { value: '1', label: '1 - Poor' }
  ];
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

  // Use the main reportData structure (align with AppContext schema)
  const summaryData = {
    office: reportData.office || '',
    visitDate: reportData.date || '',
    nextVisit: reportData.nextVisit || '',
    technician: reportData.technician || '',
    overallNotes: reportData.summary?.summaryText || '',
    dataClosetPhotos: reportData.pictures?.dataCloset || [],
    trainingRoomPhotos: reportData.pictures?.trainingRoom || []
  };

  const updateSummaryData = (field, value) => {
    // Handle nested structures by updating entire objects
    if (field === 'visitDate') {
      updateReportData('date', value);
      // Auto-calculate next visit = 60 days from selected visit date
      if (value) {
        const base = new Date(value);
        if (!isNaN(base.getTime())) {
          const next = new Date(base);
          next.setDate(next.getDate() + 60);
          const iso = next.toISOString().split('T')[0];
          updateReportData('nextVisit', iso);
        }
      }
      return;
    }
    if (field === 'office') return updateReportData('office', value);
    if (field === 'technician') return updateReportData('technician', value);
    // nextVisit is auto-derived; do not allow manual override via this handler

    if (field === 'overallNotes') {
      const nextSummary = { ...(reportData.summary || {}), summaryText: value };
      return updateReportData('summary', nextSummary);
    }

    if (field === 'dataClosetPhotos' || field === 'trainingRoomPhotos') {
      const nextPictures = { ...(reportData.pictures || { dataCloset: [], trainingRoom: [] }) };
      if (field === 'dataClosetPhotos') nextPictures.dataCloset = value;
      if (field === 'trainingRoomPhotos') nextPictures.trainingRoom = value;
      return updateReportData('pictures', nextPictures);
    }

    // Fallback
    updateReportData(field, value);
  };

  const handlePhotoChange = (type, photos) => {
    updateSummaryData(type, photos);
  };

  const calculateProgress = () => {
    const basicInfoFields = ['office', 'visitDate', 'technician'];
    const basicInfoComplete = basicInfoFields.every(field => String(summaryData[field] || '').trim());
    const photosComplete = (summaryData.dataClosetPhotos?.length > 0) || (summaryData.trainingRoomPhotos?.length > 0);
    const notesComplete = String(summaryData.overallNotes || '').trim();

    // Grading: compute a 0-100% based on average of selected scores across categories present
   const numericScores = (gradingArray || [])
      .map(item => parseInt(item.score, 10))
      .filter(v => !isNaN(v) && v >= 1 && v <= 5);
    const gradingPercent = numericScores.length === 0 ? 0 : Math.round(((numericScores.reduce((a,b)=>a+b,0) / numericScores.length) / 5) * 100);

    // Compose overall progress equally across 4 sections (basic, photos, grading, notes)
    const sections = [
      basicInfoComplete ? 100 : 0,
      photosComplete ? 100 : 0,
      gradingPercent, // 0-100
      notesComplete ? 100 : 0
    ];
    const overall = Math.round(sections.reduce((a,b)=>a+b,0) / sections.length);
    return overall;
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
    // Reset all input data while keeping Visit Date defaulted to "today"
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];

    updateReportData('office', '');
    updateReportData('technician', '');
    updateReportData('summary', { ...(reportData.summary || {}), summaryText: '' });
    updateReportData('pictures', { dataCloset: [], trainingRoom: [] });
    updateReportData('officeGrading', [
      { category: 'IT Relationship', score: '', comments: '' },
      { category: 'Inventory', score: '', comments: '' },
      { category: 'Sales Floor - IT Experience', score: '', comments: '' },
      { category: 'Data Closet', score: '', comments: '' },
    ]);

    // Visit Date: If report was already started with an earlier date, preserve it; otherwise set to today
    const existingDate = reportData.date;
    const isValidExisting = existingDate && !isNaN(new Date(existingDate).getTime());
    const chosenDateISO = isValidExisting ? existingDate : todayISO;
    updateReportData('date', chosenDateISO);

    // Next Visit auto = Visit Date + 60 days
   if (chosenDateISO) {
      const base = new Date(chosenDateISO);
      if (!isNaN(base.getTime())) {
        const next = new Date(base);
        next.setDate(next.getDate() + 60);
        const nextISO = next.toISOString().split('T')[0];
        updateReportData('nextVisit', nextISO);
      } else {
        updateReportData('nextVisit', '');
      }
    } else {
      updateReportData('nextVisit', '');
    }
    
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
    body += `Purpose: ${reportData.visitPurpose || 'Not specified'}\n`;
    body += `Report Generated: ${new Date().toLocaleString()}\n\n`;
    
    const dcPhotos = reportData.pictures?.dataCloset || [];
    const trPhotos = reportData.pictures?.trainingRoom || [];
    if (dcPhotos.length > 0) {
      body += `Data Closet Photos: ${dcPhotos.length} photos attached\n`;
    }
    
    if (trPhotos.length > 0) {
      body += `Training Room Photos: ${trPhotos.length} photos attached\n`;
    }
    
    const notes = reportData.summary?.summaryText || '';
    if (notes) {
      body += `\nOVERALL NOTES:\n${notes}\n`;
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
    { id: 'grading', label: 'Grading', icon: <BarChart3 size={16} /> },
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
              <Input
                label="Next Visit"
                type="date"
                value={summaryData.nextVisit || ''}
                readOnly
                title="Auto-calculated as 60 days from Visit Date"
              />
            </div>

            {/* Removed Visit Purpose per request */}

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


      {activeTab === 'grading' && (
        <Section
          title="Office Assessment Categories"
          icon={<BarChart3 className="text-purple-500" />}
          helpText="Rate each category from 1-5 and provide detailed comments for comprehensive evaluation."
        >
          <div className="space-y-6">
            {/* Average score summary */}
            {(() => {
              const nums = gradingArray.map(i => parseInt(i.score, 10)).filter(n => !isNaN(n));
              const avg = nums.length ? (nums.reduce((a,b)=>a+b,0)/nums.length) : null;
              const avgFixed = avg ? avg.toFixed(1) : null;
              const percent = avg ? Math.round((avg / 5) * 100) : null;
              const getColor = (score) => {
                const s = typeof score === 'number' ? score : parseFloat(score);
                if (s >= 4) return 'text-green-600';
                if (s >= 3) return 'text-yellow-600';
                if (s >= 1) return 'text-red-600';
                return 'text-gray-400';
              };
              return avg ? (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Grading Score:</span>
                    <div className="flex items-center">
                      <span className={`text-2xl font-bold ${getColor(avg)}`}>{percent}%</span>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            {gradingCategories.map((category) => (
              <div
                key={category.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-start space-x-4 mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {category.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {category.description}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="md:col-span-1">
                        <Select
                          label="Score (1-5)"
                          value={gradingData[category.id]?.score || ''}
                          onChange={(e) => updateGradingData(category.id, 'score', e.target.value)}
                          required
                        >
                          {scoreOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                        {gradingData[category.id]?.score && (
                          <div className="mt-2 text-center">
                            {(() => {
                              const s = parseInt(gradingData[category.id]?.score, 10);
                              const pct = !isNaN(s) ? Math.round((s / 5) * 100) : null;
                              return (
                                <div>
                                  {pct !== null && (
                                    <span className="block text-sm text-gray-600 dark:text-gray-400">
                                      {pct}%
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                      
                      <div className="md:col-span-2">
                        <Textarea
                          label="Comments & Details"
                          value={gradingData[category.id]?.comments || ''}
                          onChange={(e) => updateGradingData(category.id, 'comments', e.target.value)}
                          placeholder={`Provide detailed comments about ${category.title.toLowerCase()}...`}
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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