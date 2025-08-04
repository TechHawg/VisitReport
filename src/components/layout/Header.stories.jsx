import React from 'react';
import { AppProvider } from '../../context/AppContext';
import Header from './Header';

export default {
  title: 'Layout/Header',
  component: Header,
  decorators: [
    (Story) => (
      <AppProvider>
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
          <Story />
        </div>
      </AppProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Header component with theme toggle functionality. The theme toggle button switches between light and dark modes and persists the preference in localStorage.',
      },
    },
  },
  argTypes: {
    // No direct props to control since this uses context
  },
};

export const Default = {
  name: 'Default Header',
  parameters: {
    docs: {
      description: {
        story: 'Default header with theme toggle button. Click the moon/sun icon to switch between light and dark themes.',
      },
    },
  },
};

export const LightMode = {
  name: 'Light Mode',
  decorators: [
    (Story) => {
      // Ensure light mode for this story
      React.useEffect(() => {
        document.documentElement.classList.remove('dark');
      }, []);
      
      return (
        <AppProvider>
          <div className="bg-gray-100 min-h-screen">
            <Story />
          </div>
        </AppProvider>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Header in light mode. Shows the moon icon indicating you can switch to dark mode.',
      },
    },
  },
};

export const DarkMode = {
  name: 'Dark Mode',
  decorators: [
    (Story) => {
      // Ensure dark mode for this story
      React.useEffect(() => {
        document.documentElement.classList.add('dark');
      }, []);
      
      return (
        <AppProvider>
          <div className="bg-gray-900 min-h-screen">
            <Story />
          </div>
        </AppProvider>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Header in dark mode. Shows the sun icon indicating you can switch to light mode.',
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#111827' },
      ],
    },
  },
};

export const ThemeToggleInteraction = {
  name: 'Theme Toggle Interaction',
  parameters: {
    docs: {
      description: {
        story: 'Interactive example showing theme toggle functionality. Click the theme button to see the theme change in real-time. The preference is saved to localStorage.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    // This would contain Storybook interactions if using @storybook/addon-interactions
    // For now, users can manually test the theme toggle
  },
};