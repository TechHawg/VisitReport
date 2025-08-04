import { INITIAL_VIEWPORTS } from '@storybook/addon-viewport';
import '../src/index.css';

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      viewports: INITIAL_VIEWPORTS,
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#f3f4f6',
        },
        {
          name: 'dark',
          value: '#1f2937',
        },
        {
          name: 'white',
          value: '#ffffff',
        },
      ],
    },
    // Accessibility addon configuration
    a11y: {
      element: '#storybook-root',
      config: {},
      options: {},
      manual: false,
    },
    // Documentation
    docs: {
      theme: 'light',
    },
  },
  // Global decorators
  decorators: [
    (Story, context) => {
      // Apply theme class based on background
      const theme = context.globals.backgrounds?.value === '#1f2937' ? 'dark' : 'light';
      
      return (
        <div className={theme}>
          <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <Story />
          </div>
        </div>
      );
    },
  ],
  // Global types for toolbar controls
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;