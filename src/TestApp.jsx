import React from 'react';

const TestApp = () => {
  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">
        RSS Visit Report - Test Mode
      </h1>
      <p className="text-gray-700 mb-4">
        If you can see this, React is working correctly.
      </p>
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-2">System Status:</h2>
        <ul className="space-y-2">
          <li className="text-green-600">✅ React is working</li>
          <li className="text-green-600">✅ Tailwind CSS is working</li>
          <li className="text-green-600">✅ Basic components are rendering</li>
        </ul>
      </div>
    </div>
  );
};

export default TestApp;