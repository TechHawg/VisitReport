import Button from './Button';

export default {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile button component with multiple variants, sizes, and states. Follows accessibility best practices and includes loading states.',
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger', 'success', 'outline'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    onClick: { action: 'clicked' },
  },
  tags: ['autodocs'],
};

export const Primary = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Danger = {
  args: {
    children: 'Danger Button',
    variant: 'danger',
  },
};

export const Success = {
  args: {
    children: 'Success Button',
    variant: 'success',
  },
};

export const Outline = {
  args: {
    children: 'Outline Button',
    variant: 'outline',
  },
};

export const Small = {
  args: {
    children: 'Small Button',
    size: 'sm',
  },
};

export const Medium = {
  args: {
    children: 'Medium Button',
    size: 'md',
  },
};

export const Large = {
  args: {
    children: 'Large Button',
    size: 'lg',
  },
};

export const Disabled = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
};

export const Loading = {
  args: {
    children: 'Loading Button',
    loading: true,
  },
};

export const WithIcon = {
  args: {
    children: (
      <>
        <svg 
          className="mr-2 h-4 w-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 4v16m8-8H4" 
          />
        </svg>
        Add Item
      </>
    ),
  },
};

// Accessibility story
export const AccessibilityExample = {
  args: {
    children: 'Accessible Button',
    'aria-label': 'This button performs an important action',
    'aria-describedby': 'button-description',
  },
  render: (args) => (
    <div>
      <Button {...args} />
      <p id="button-description" className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        This button demonstrates proper accessibility attributes including aria-label and aria-describedby.
      </p>
    </div>
  ),
};

// Interactive story for testing
export const Interactive = {
  args: {
    children: 'Click me!',
  },
  render: (args) => <Button {...args} />,
  play: async ({ canvasElement, args }) => {
    // This would be used for interaction testing
    // const canvas = within(canvasElement);
    // const button = canvas.getByRole('button');
    // await userEvent.click(button);
    // await expect(args.onClick).toHaveBeenCalled();
  },
};

// All variants showcase
export const AllVariants = {
  render: () => (
    <div className="space-x-2 space-y-2">
      <div className="space-x-2">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger">Danger</Button>
      </div>
      <div className="space-x-2">
        <Button variant="success">Success</Button>
        <Button variant="outline">Outline</Button>
        <Button disabled>Disabled</Button>
      </div>
      <div className="space-x-2">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Overview of all button variants and sizes available in the design system.',
      },
    },
  },
};