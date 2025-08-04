import React, { useState } from 'react';
import { Star, BarChart3, Save, RefreshCw, Users, Package, Monitor, Database } from 'lucide-react';
import Section from '../../components/ui/Section';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import ProgressBar from '../../components/ui/ProgressBar';
import Alert from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useApp } from '../../context/AppContext';

const OfficeGrading = () => {
  const { reportData, updateReportData, addNotification, isLoading } = useApp();
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Initialize grading data
  const gradingData = reportData.officeGrading || {
    itRelationship: { score: '', comments: '' },
    inventory: { score: '', comments: '' },
    salesFloorExperience: { score: '', comments: '' },
    dataCloset: { score: '', comments: '' }
  };

  const updateGradingData = (category, field, value) => {
    const updatedGrading = {
      ...gradingData,
      [category]: {
        ...gradingData[category],
        [field]: value
      }
    };
    updateReportData('officeGrading', updatedGrading);
  };


  const calculateProgress = () => {
    const categories = ['itRelationship', 'inventory', 'salesFloorExperience', 'dataCloset'];
    let filledScores = 0;
    let filledComments = 0;
    
    categories.forEach(category => {
      if (gradingData[category]?.score) filledScores++;
      if (gradingData[category]?.comments?.trim()) filledComments++;
    });
    
    const totalFields = 8; // 4 scores + 4 comments
    const filledFields = filledScores + filledComments;
    
    return Math.round((filledFields / totalFields) * 100);
  };

  const calculateAverageScore = () => {
    const categories = ['itRelationship', 'inventory', 'salesFloorExperience', 'dataCloset'];
    const scores = categories
      .map(category => parseInt(gradingData[category]?.score))
      .filter(score => !isNaN(score));
    
    if (scores.length === 0) return 0;
    
    return (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1);
  };

  const progress = calculateProgress();
  const averageScore = calculateAverageScore();

  const handleSave = () => {
    addNotification({
      type: 'success',
      message: 'Office grading data saved successfully',
      duration: 3000
    });
  };

  const handleReset = () => {
    updateReportData('officeGrading', {
      itRelationship: { score: '', comments: '' },
      inventory: { score: '', comments: '' },
      salesFloorExperience: { score: '', comments: '' },
      dataCloset: { score: '', comments: '' }
    });

    setShowResetDialog(false);
    addNotification({
      type: 'info',
      message: 'Office grading data has been reset',
      duration: 3000
    });
  };

  const scoreOptions = [
    { value: '', label: 'Select Score' },
    { value: '5', label: '5 - Excellent' },
    { value: '4', label: '4 - Good' },
    { value: '3', label: '3 - Average' },
    { value: '2', label: '2 - Below Average' },
    { value: '1', label: '1 - Poor' }
  ];

  const gradingCategories = [
    {
      id: 'itRelationship',
      title: 'IT Relationship',
      icon: <Users className="text-blue-500" />,
      description: 'Evaluate the working relationship with local IT staff, communication effectiveness, and collaboration level.'
    },
    {
      id: 'inventory',
      title: 'Inventory Management',
      icon: <Package className="text-green-500" />,
      description: 'Assess the accuracy, organization, and maintenance of hardware and software inventory systems.'
    },
    {
      id: 'salesFloorExperience',
      title: 'Sales Floor IT Experience',
      icon: <Monitor className="text-purple-500" />,
      description: 'Rate the user experience, system performance, and IT support quality on the sales floor.'
    },
    {
      id: 'dataCloset',
      title: 'Data Closet',
      icon: <Database className="text-orange-500" />,
      description: 'Evaluate organization, labeling, cleanliness, and overall condition of network infrastructure.'
    }
  ];

  const getScoreColor = (score) => {
    const numScore = parseInt(score);
    if (numScore >= 4) return 'text-green-600';
    if (numScore === 3) return 'text-yellow-600';
    if (numScore >= 1) return 'text-red-600';
    return 'text-gray-400';
  };

  const getScoreLabel = (score) => {
    const labels = {
      '5': 'Excellent',
      '4': 'Good', 
      '3': 'Average',
      '2': 'Below Average',
      '1': 'Poor'
    };
    return labels[score] || 'Not Scored';
  };

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Section 
        title="Office Grading Progress" 
        icon={<BarChart3 className="text-purple-500" />}
      >
        <div className="space-y-4">
          <ProgressBar 
            progress={progress} 
            label="Grading Completion"
            color={progress >= 80 ? 'green' : progress >= 50 ? 'blue' : 'yellow'}
            size="lg"
          />
          
          {averageScore > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Average Score:
                </span>
                <div className="flex items-center space-x-2">
                  <span className={`text-2xl font-bold ${getScoreColor(averageScore)}`}>
                    {averageScore}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">/ 5.0</span>
                  <Star className={`w-6 h-6 ${getScoreColor(averageScore)}`} fill="currentColor" />
                </div>
              </div>
            </div>
          )}

          {progress < 100 && (
            <Alert variant="info">
              Complete scoring and comments for all categories to finish the office grading assessment.
            </Alert>
          )}
        </div>
      </Section>

      {/* Grading Categories */}
      <Section 
        title="Office Assessment Categories" 
        icon={<Star className="text-yellow-500" />}
        helpText="Rate each category from 1-5 and provide detailed comments for comprehensive evaluation."
      >
        <div className="space-y-8">
          {gradingCategories.map((category) => (
            <div 
              key={category.id} 
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-start space-x-4 mb-4">
                <div className="flex-shrink-0">
                  {category.icon}
                </div>
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
                          <span className={`text-lg font-semibold ${getScoreColor(gradingData[category.id].score)}`}>
                            {getScoreLabel(gradingData[category.id].score)}
                          </span>
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

      {/* Overall Assessment */}

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
            Save Grading
          </Button>
          
          <Button
            onClick={() => setShowResetDialog(true)}
            disabled={isLoading}
            variant="outline"
            size="lg"
          >
            <RefreshCw size={18} />
            Reset All Grades
          </Button>
        </div>
      </Section>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onConfirm={handleReset}
        title="Reset Office Grading"
        message="Are you sure you want to reset all grading data? This will clear all scores and comments. This action cannot be undone."
        confirmText="Reset All Grades"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default OfficeGrading;