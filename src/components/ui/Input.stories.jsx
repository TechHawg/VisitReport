import Input from './Input';

export default {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A flexible input component that supports both single-line and multiline text input with automatic resizing for textareas.',
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text for the input field',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    value: {
      control: 'text',
      description: 'Input value',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
    multiline: {
      control: 'boolean',
      description: 'Whether to render as textarea',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled',
    },
    required: {
      control: 'boolean',
      description: 'Whether the input is required',
    },
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'number', 'date', 'tel', 'url'],
      description: 'HTML input type',
    },
    onChange: { action: 'changed' },
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {
    label: 'Default Input',
    placeholder: 'Enter text here...',
  },
};

export const WithValue = {
  args: {
    label: 'Input with Value',
    value: 'This is some text',
    placeholder: 'Enter text here...',
  },
};

export const WithError = {
  args: {
    label: 'Input with Error',
    value: 'Invalid input',
    error: 'This field contains an error',
    placeholder: 'Enter text here...',
  },
};

export const Required = {
  args: {
    label: 'Required Input',
    placeholder: 'This field is required',
    required: true,
  },
};

export const Disabled = {
  args: {
    label: 'Disabled Input',
    placeholder: 'This input is disabled',
    disabled: true,
  },
};

export const Email = {
  args: {
    label: 'Email Address',
    type: 'email',
    placeholder: 'user@example.com',
  },
};

export const Password = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
  },
};

export const Date = {
  args: {
    label: 'Visit Date',
    type: 'date',
  },
};

export const Number = {
  args: {
    label: 'Quantity',
    type: 'number',
    placeholder: '0',
  },
};

export const Multiline = {
  args: {
    label: 'Description',
    multiline: true,
    placeholder: 'Enter a detailed description...',
    rows: 4,
  },
};

export const MultilineWithValue = {
  args: {
    label: 'Visit Summary',
    multiline: true,
    value: 'This is a multi-line text area that automatically resizes as you type. It can contain multiple paragraphs and will grow with the content.',
    placeholder: 'Enter summary...',
  },
};

export const MultilineError = {
  args: {
    label: 'Comments',
    multiline: true,
    value: 'This textarea has an error',
    error: 'Comments must be at least 10 characters long',
    placeholder: 'Enter your comments...',
  },
};

// Form example with multiple inputs
export const FormExample = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <Input
        label="Office Location"
        placeholder="Enter office location"
        required
      />
      <Input
        label="Visit Date"
        type="date"
        required
      />
      <Input
        label="Contact Email"
        type="email"
        placeholder="user@company.com"
      />
      <Input
        label="Visit Purpose"
        multiline
        placeholder="Describe the purpose of your visit..."
        rows={3}
      />
      <Input
        label="Summary"
        multiline
        placeholder="Provide a detailed summary of the visit..."
        rows={5}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example of how inputs work together in a form layout.',
      },
    },
  },
};

// Accessibility demonstration
export const AccessibilityExample = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <Input
        label="Accessible Input"
        placeholder="This input has proper labels"
        aria-describedby="input-help"
      />
      <p id="input-help" className="text-sm text-gray-600 dark:text-gray-400">
        This input demonstrates proper accessibility with associated labels and help text.
      </p>
      
      <Input
        label="Required Field"
        placeholder="This field is required"
        required
        aria-describedby="required-help"
      />
      <p id="required-help" className="text-sm text-gray-600 dark:text-gray-400">
        Required fields are properly marked for screen readers.
      </p>
      
      <Input
        label="Input with Error"
        value="invalid@"
        error="Please enter a valid email address"
        type="email"
        aria-invalid="true"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates accessibility features including proper labeling, error states, and ARIA attributes.',
      },
    },
  },
};