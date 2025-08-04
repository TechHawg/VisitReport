import React, { useState } from 'react';
import { AlertTriangle, Wrench, TrendingUp, CheckSquare } from 'lucide-react';
import Section from '../../components/ui/Section';
import Button from '../../components/ui/Button';

// Import the individual components
import PCRepairs from '../PCRepairs/PCRepairs';
import Issues from '../Issues/Issues';
import Recommendations from '../Recommendations/Recommendations';
import FollowUpItems from '../FollowUpItems/FollowUpItems';

const IssuesActions = () => {
  const [activeTab, setActiveTab] = useState('pcrepairs');

  const tabs = [
    {
      id: 'pcrepairs',
      label: 'PC Repairs',
      icon: <Wrench size={16} />,
      component: PCRepairs
    },
    {
      id: 'issues',
      label: 'Issues & Problems',
      icon: <AlertTriangle size={16} />,
      component: Issues
    },
    {
      id: 'recommendations',
      label: 'Recommendations',
      icon: <TrendingUp size={16} />,
      component: Recommendations
    },
    {
      id: 'followup',
      label: 'Follow-up Items',
      icon: <CheckSquare size={16} />,
      component: FollowUpItems
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="space-y-6">
      <Section 
        title="Issues & Actions" 
        icon={<AlertTriangle className="text-red-500" />}
      >
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-600 dark:text-red-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {ActiveComponent && <ActiveComponent />}
          </div>
        </div>
      </Section>
    </div>
  );
};

export default IssuesActions;