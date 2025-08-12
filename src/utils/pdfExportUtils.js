/**
 * PDF Export Utilities
 * Handles proper preparation for PDF/canvas export
 */

/**
 * Wait for fonts and images to load before capturing
 * @param {HTMLElement} container - Container element to check
 * @returns {Promise<void>}
 */
export async function whenReadyToExport(container) {
  try {
    // Wait for fonts to be ready
    if (document.fonts && typeof document.fonts.ready === 'object') {
      await document.fonts.ready;
    }
    
    // Wait for all images in the container to load
    const images = container.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
      if (img.complete) {
        return Promise.resolve();
      }
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Image load timeout: ${img.src}`));
        }, 5000);
        
        img.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          // Don't fail the whole process for one image
          console.warn(`Failed to load image: ${img.src}`);
          resolve();
        };
      });
    });
    
    await Promise.allSettled(imagePromises);
    
    // Small delay to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
  } catch (error) {
    console.warn('Error waiting for export readiness:', error);
    // Continue anyway after a short delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

/**
 * Get optimized html2canvas options for rack diagrams
 * @param {HTMLElement} element - Element to capture
 * @returns {Object} html2canvas options
 */
export function getRackCaptureOptions(element) {
  return {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    allowTaint: true,
    foreignObjectRendering: false,
    logging: false,
    width: element.scrollWidth || element.offsetWidth,
    height: element.scrollHeight || element.offsetHeight,
    // Ensure we capture the full content
    scrollX: 0,
    scrollY: 0,
    // Optimize for print
    imageTimeout: 5000,
    removeContainer: false,
    // Page break handling
    pagebreak: {
      mode: ['css', 'avoid-all']
    }
  };
}

/**
 * Prepare container for export by temporarily adjusting styles
 * @param {HTMLElement} container - Container to prepare
 * @returns {Function} cleanup function
 */
export function prepareContainerForExport(container) {
  const originalStyles = new Map();
  
  // Store original styles
  const elementsToAdjust = [
    ...container.querySelectorAll('.rack-container'),
    ...container.querySelectorAll('.rack'),
    ...container.querySelectorAll('.device')
  ];
  
  elementsToAdjust.forEach(el => {
    const computed = window.getComputedStyle(el);
    originalStyles.set(el, {
      overflow: el.style.overflow,
      transform: el.style.transform,
      maxWidth: el.style.maxWidth,
      maxHeight: el.style.maxHeight
    });
    
    // Temporarily remove transforms and overflow hidden that can cause issues
    el.style.overflow = 'visible';
    el.style.transform = 'none';
    
    // Ensure containers have definite sizes
    if (el.classList.contains('rack-container')) {
      el.style.maxWidth = '800px';
      el.style.width = '800px';
    }
  });
  
  // Return cleanup function
  return () => {
    elementsToAdjust.forEach(el => {
      const styles = originalStyles.get(el);
      if (styles) {
        Object.entries(styles).forEach(([prop, value]) => {
          if (value) {
            el.style[prop] = value;
          } else {
            el.style.removeProperty(prop);
          }
        });
      }
    });
  };
}

/**
 * Capture rack diagram with optimized settings
 * @param {HTMLElement} element - Rack element to capture
 * @param {string} rackId - Rack identifier
 * @returns {Promise<Object>} Captured diagram data
 */
export async function captureRackDiagram(element, rackId) {
  // Prepare for export
  const cleanup = prepareContainerForExport(element);
  
  try {
    // Wait for readiness
    await whenReadyToExport(element);
    
    // Import html2canvas dynamically
    const html2canvas = (await import('html2canvas')).default;
    
    // Capture with optimized options
    const options = getRackCaptureOptions(element);
    const canvas = await html2canvas(element, options);
    
    return {
      dataUrl: canvas.toDataURL('image/png', 0.95),
      title: `Rack Layout - ${rackId}`,
      width: canvas.width,
      height: canvas.height,
      element: element
    };
    
  } catch (error) {
    console.error(`Failed to capture rack diagram for ${rackId}:`, error);
    throw error;
  } finally {
    // Always cleanup
    cleanup();
  }
}

/**
 * Calculate optimal layout for multiple racks on page
 * @param {Array} racks - Array of rack data
 * @returns {Object} Layout configuration
 */
export function calculateRackLayout(racks) {
  const pageWidth = 210; // A4 width in mm
  const pageMargin = 25; // mm
  const availableWidth = pageWidth - (pageMargin * 2);
  
  if (racks.length <= 2) {
    return {
      columns: Math.min(racks.length, 2),
      rackWidth: Math.floor(availableWidth / Math.min(racks.length, 2)) - 5, // 5mm gap
      fitsOnOnePage: true
    };
  }
  
  return {
    columns: 2,
    rackWidth: Math.floor(availableWidth / 2) - 5,
    fitsOnOnePage: false
  };
}