import React, { useState, useEffect } from 'react';
import { Home, AlertTriangle, CheckCircle, Clock, BarChart3, Camera, Package, HardDrive, Recycle, FileText, Mail, TrendingUp, Users, Calendar, ThumbsUp, Archive, Eye } from 'lucide-react';
import Section from '../../components/ui/Section';
import ProgressBar from '../../components/ui/ProgressBar';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import { useApp } from '../../context/AppContext';
import { EMAIL_RECIPIENTS } from '../../constants/emailConfig';

const Dashboard = () => {
  const { reportData, theme, setActivePage } = useApp();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper functions to calculate progress for each section
  const calculateInfrastructureProgress = () => {
    const hardware = reportData.hardware || {};
    const totalCategories = ['computers', 'monitors', 'printers', 'phones', 'tablets', 'networking'];
    const filledCategories = totalCategories.filter(cat => 
      hardware[cat] && Array.isArray(hardware[cat]) && hardware[cat].length > 0
    ).length;
    return Math.round((filledCategories / totalCategories.length) * 100);
  };

  const calculateInventoryProgress = () => {
    const inventory = reportData.inventory || {};
    if (!inventory.items || !Array.isArray(inventory.items)) return 0;
    const itemsWithData = inventory.items.filter(item => {
      const total = item.inUse + 
        Object.values(item.otherUse || {}).reduce((sum, val) => sum + val, 0) + 
        Object.values(item.spares || {}).reduce((sum, val) => sum + val, 0) + 
        (item.broken || 0);
      return total > 0;
    }).length;
    return inventory.items.length > 0 ? Math.round((itemsWithData / inventory.items.length) * 100) : 0;
  };

  const calculateStorageProgress = () => {
    const dataCloset = reportData.dataCloset || {};
    let totalComponents = 0;
    let completedComponents = 0;
    
    // Check grading completion
    if (dataCloset.grading && Array.isArray(dataCloset.grading) && dataCloset.grading.length > 0) {
      totalComponents++;
      const gradedItems = dataCloset.grading.filter(item => item.score && item.score !== '').length;
      const gradingCompletion = gradedItems / dataCloset.grading.length;
      completedComponents += gradingCompletion;
    }
    
    // Check racks completion
    if (dataCloset.racks !== undefined) {
      totalComponents++;
      if (Array.isArray(dataCloset.racks) && dataCloset.racks.length > 0) {
        completedComponents += 1;
      }
    }
    
    // Check devices completion
    if (dataCloset.devices !== undefined) {
      totalComponents++;
      if (Array.isArray(dataCloset.devices) && dataCloset.devices.length > 0) {
        completedComponents += 1;
      }
    }
    
    return totalComponents > 0 ? Math.round((completedComponents / totalComponents) * 100) : 0;
  };

  const calculateRecyclingProgress = () => {
    const recycling = reportData.recycling || {};
    if (!recycling.items || !Array.isArray(recycling.items) || recycling.items.length === 0) return 0;
    
    // Check how many items have complete information
    const completeItems = recycling.items.filter(item => 
      item.itemType && 
      item.quantity > 0 && 
      item.description
    ).length;
    
    return Math.round((completeItems / recycling.items.length) * 100);
  };

  const calculateIssuesProgress = () => {
    const issues = reportData.issues || [];
    if (!Array.isArray(issues) || issues.length === 0) return 100; // No issues is good
    const resolvedIssues = issues.filter(issue => 
      issue.status === 'resolved' || issue.status === 'closed'
    ).length;
    return Math.round((resolvedIssues / issues.length) * 100);
  };

  const calculateRecommendationsProgress = () => {
    const recommendations = reportData.recommendations || [];
    if (!Array.isArray(recommendations) || recommendations.length === 0) return 0;
    const implementedRecs = recommendations.filter(rec => 
      rec.status === 'implemented' || rec.status === 'completed'
    ).length;
    return recommendations.length > 0 ? Math.round((implementedRecs / recommendations.length) * 100) : 0;
  };

  // Calculate summary progress based on filled fields (updated to handle object structure)
  const calculateSummaryProgress = () => {
    let filledFields = 0;
    const totalFields = 4; // office, date, technician, summary
    
    if (reportData.office && reportData.office.trim()) filledFields++;
    if (reportData.date) filledFields++;
    if (reportData.technician && reportData.technician.trim()) filledFields++;
    if (reportData.summary && reportData.summary.summaryText && reportData.summary.summaryText.trim()) filledFields++;
    
    return Math.round((filledFields / totalFields) * 100);
  };

  // Calculate completion percentages for each section
  const calculateSectionProgress = () => {
    const sections = {
      summary: {
        name: 'Summary',
        icon: <FileText size={16} />,
        route: 'Summary',
        progress: calculateSummaryProgress()
      },
      infrastructure: {
        name: 'Infrastructure',
        icon: <HardDrive size={16} />,
        route: 'Infrastructure', 
        progress: calculateInfrastructureProgress()
      },
      inventory: {
        name: 'Inventory',
        icon: <Archive size={16} />,
        route: 'Inventory',
        progress: calculateInventoryProgress()
      },
      storage: {
        name: 'Data Closet',
        icon: <Package size={16} />,
        route: 'Storage',
        progress: calculateStorageProgress()
      },
      recycling: {
        name: 'Recycling',
        icon: <Recycle size={16} />,
        route: 'Recycling',
        progress: calculateRecyclingProgress()
      },
      issues: {
        name: 'Issues',
        icon: <AlertTriangle size={16} />,
        route: 'IssuesActions',
        progress: calculateIssuesProgress()
      },
      recommendations: {
        name: 'Recommendations',
        icon: <ThumbsUp size={16} />,
        route: 'Recommendations',
        progress: calculateRecommendationsProgress()
      }
    };

    let totalProgress = 0;

    Object.keys(sections).forEach(key => {
      totalProgress += sections[key].progress;
    });

    const overallProgress = Math.round(totalProgress / Object.keys(sections).length);
    
    return { sections, overall: overallProgress };
  };

  const progressData = calculateSectionProgress();

  // Quick stats
  const quickStats = [
    {
      title: 'Overall Progress',
      value: `${progressData.overall}%`,
      icon: <TrendingUp className="text-blue-500" />,
      color: 'blue',
      subtitle: 'Report completion'
    },
    {
      title: 'Current Office',
      value: reportData.office || 'Not specified',
      icon: <Home className="text-green-500" />,
      color: 'green',
      subtitle: 'Office location'
    },
    {
      title: 'Visit Date',
      value: reportData.date || 'Not set',
      icon: <Calendar className="text-purple-500" />,
      color: 'purple',
      subtitle: 'Scheduled date'
    },
    {
      title: 'Active Issues',
      value: (reportData.issues || []).filter(issue => issue.status === 'open').length,
      icon: <AlertTriangle className="text-red-500" />,
      color: 'red',
      subtitle: 'Need attention'
    }
  ];

  // Generate recent activity from actual data
  const generateRecentActivity = () => {
    const activity = [];
    
    // Check for recent updates
    if (reportData.hardware?.lastUpdated) {
      activity.push({
        action: 'Updated hardware inventory',
        time: 'Recently',
        icon: <HardDrive size={16} />
      });
    }
    
    if (reportData.dataCloset?.photos?.length > 0) {
      activity.push({
        action: `Added ${reportData.dataCloset.photos.length} photos to data closet`,
        time: 'Recently',
        icon: <Camera size={16} />
      });
    }
    
    if (reportData.issues?.length > 0) {
      activity.push({
        action: `Documented ${reportData.issues.length} issues`,
        time: 'Recently',
        icon: <AlertTriangle size={16} />
      });
    }
    
    if (reportData.recommendations?.length > 0) {
      activity.push({
        action: `Added ${reportData.recommendations.length} recommendations`,
        time: 'Recently',
        icon: <ThumbsUp size={16} />
      });
    }
    
    // Fallback activity if no data
    if (activity.length === 0) {
      activity.push(
        { action: 'Visit report initialized', time: 'Today', icon: <FileText size={16} /> },
        { action: 'Dashboard accessed', time: 'Just now', icon: <Eye size={16} /> }
      );
    }
    
    return activity.slice(0, 4); // Limit to 4 items
  };

  const recentActivity = generateRecentActivity();

  // Email functionality
  const generateEmailReport = () => {
    const office = reportData.office || 'Office Visit';
    const date = reportData.date || new Date().toISOString().split('T')[0];
    
    const subject = `Complete Visit Report - ${office} - ${date}`;
    
    let body = `RSS Visit Report - Complete Summary\n`;
    body += `Office: ${office}\n`;
    body += `Date: ${date}\n`;
    body += `Report Generated: ${new Date().toLocaleString()}\n\n`;
    
    body += `OVERALL PROGRESS: ${progressData.overall}%\n\n`;
    
    body += `SECTION PROGRESS:\n`;
    Object.values(progressData.sections).forEach(section => {
      body += `• ${section.name}: ${section.progress}%\n`;
    });
    body += `\n`;
    
    // Include critical information
    const openIssues = (reportData.issues || []).filter(issue => issue.status === 'open');
    if (openIssues.length > 0) {
      body += `CRITICAL ISSUES (${openIssues.length} open):\n`;
      openIssues.forEach(issue => {
        body += `• ${issue.title} (${issue.severity})\n`;
      });
      body += `\n`;
    }
    
    const pendingRecs = (reportData.recommendations || []).filter(rec => rec.status === 'pending');
    if (pendingRecs.length > 0) {
      body += `PENDING RECOMMENDATIONS (${pendingRecs.length}):\n`;
      pendingRecs.forEach(rec => {
        body += `• ${rec.title} (${rec.priority})\n`;
      });
      body += `\n`;
    }
    
    body += `This is a summary report. Please access the system for detailed information.\n`;
    
    const recipients = EMAIL_RECIPIENTS.fullReport || EMAIL_RECIPIENTS.default;
    const mailtoLink = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    return { mailtoLink, subject, body, recipients };
  };

  const sendEmailReport = () => {
    const { mailtoLink } = generateEmailReport();
    window.location.href = mailtoLink;
    setShowEmailModal(false);
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'green';
    if (progress >= 60) return 'blue';
    if (progress >= 40) return 'yellow';
    return 'red';
  };

  return (
    <div className="space-y-6">
      {/* Security Warning */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="text-yellow-600 dark:text-yellow-400 mr-3 mt-1 flex-shrink-0" size={20} />
          <div>
            <h3 className="text-yellow-800 dark:text-yellow-200 font-medium">
              Development Version - Security Issues Present
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
              This application has critical security vulnerabilities and should not be deployed 
              without proper authentication and data security implementation.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <Section title="Dashboard Overview" icon={<Home className="text-indigo-500" />}>
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="text-center py-4">
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Welcome to RSS Visit Report System
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Current time: {currentTime.toLocaleString()}
            </p>
            
            {/* Overall Progress */}
            <div className="max-w-md mx-auto mb-6">
              <ProgressBar 
                progress={progressData.overall} 
                label="Overall Report Progress"
                color={getProgressColor(progressData.overall)}
                size="lg"
              />
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickStats.map((stat, index) => (
              <div 
                key={index}
                className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {stat.icon}
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </h4>
                  </div>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stat.subtitle}
                </p>
              </div>
            ))}
          </div>

          {/* Section Progress Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.values(progressData.sections).map((section, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setActivePage(section.route)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {section.icon}
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                      {section.name}
                    </h4>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    section.progress === 100 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : section.progress >= 50
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {section.progress}%
                  </span>
                </div>
                
                <ProgressBar 
                  progress={section.progress}
                  color={getProgressColor(section.progress)}
                  showPercentage={true}
                />
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {section.progress === 100 ? 'Complete' : 
                   section.progress > 0 ? 'In Progress' : 'Not Started'}
                </p>
              </div>
            ))}
          </div>

          {/* Recent Activity & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                <Clock className="mr-2" size={20} />
                Recent Activity
              </h4>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="text-gray-500 dark:text-gray-400">
                      {activity.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        {activity.action}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Quick Actions
              </h4>
              <div className="space-y-3">
                <Button 
                  variant="primary" 
                  className="w-full justify-start"
                  onClick={() => setActivePage('Summary')}
                >
                  <FileText size={16} />
                  Continue Report
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActivePage('Infrastructure')}
                >
                  <HardDrive size={16} />
                  Update Infrastructure
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActivePage('Storage')}
                >
                  <Camera size={16} />
                  Manage Data Closet
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActivePage('IssuesActions')}
                >
                  <AlertTriangle size={16} />
                  Track Issues
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => setShowEmailModal(true)}
                >
                  <Mail size={16} />
                  Email Full Report
                </Button>
              </div>
            </div>
          </div>

          {/* Tips Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
            <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3">
              💡 Tips for Complete Reports
            </h4>
            <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
              <li>• Take photos of data closets and training rooms for documentation</li>
              <li>• Update hardware inventory with current device counts</li>
              <li>• Complete office grading for all categories</li>
              <li>• Schedule recycling pickups when needed</li>
              <li>• Email reports to stakeholders when complete</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* Email Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Email Complete Report"
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
              <div>Overall Progress: {progressData.overall}%</div>
              <div>Active Issues: {(reportData.issues || []).filter(issue => issue.status === 'open').length}</div>
              <div>Pending Recommendations: {(reportData.recommendations || []).filter(rec => rec.status === 'pending').length}</div>
              <div>Office: {reportData.office || 'Not specified'}</div>
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
    </div>
  );
};

export default Dashboard;