// Legacy wrapper for backward compatibility
// This component has been refactored and moved to /components/rack/
// Import the new implementation

import { RackVisualizer as NewRackVisualizer } from '../rack/index.js';

/**
 * @deprecated This file is kept for backward compatibility.
 * Please import RackVisualizer from '../rack/RackVisualizer.jsx' instead.
 */
const RackVisualizer = (props) => {
  if (import.meta.env.DEV) {
    console.warn(
      'RackVisualizer: This import path is deprecated. ' +
      'Please use: import { RackVisualizer } from "../rack/RackVisualizer.jsx"'
    );
  }
  
  return <NewRackVisualizer {...props} />;
};

export default RackVisualizer;
