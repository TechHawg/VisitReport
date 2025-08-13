# Migration Guide: PDF Export and Print CSS

## Changes Made

This migration switches from `html2canvas` + `jsPDF` to `react-to-print` with print CSS for a more reliable and consistent PDF export experience.

## PDF Export Changes

### Before
- Used `html2canvas` to capture screenshots of components
- Converted screenshots to PDF using `jsPDF`
- Inconsistent rendering and scaling issues
- Performance problems with large tables

### After
- Uses `react-to-print` for native browser printing
- Print CSS controls layout and styling
- Consistent A4-sized output
- Better performance and reliability

## How to Generate PDFs Now

1. **Import the PrintableReport component:**
   ```tsx
   import { PrintableReport } from '../components/print/PrintableReport';
   ```

2. **Wrap your content in PrintableReport:**
   ```tsx
   <PrintableReport>
     <div className="section">
       {/* Your inventory content */}
     </div>
     <div className="page-break" />
     <div className="section">
       {/* Your rack content */}
     </div>
   </PrintableReport>
   ```

3. **Use CSS classes for layout:**
   - `.pdf-page` - Root container (fixed 794px width for A4)
   - `.section` - Prevents content from breaking across pages
   - `.page-break` - Forces a page break

4. **Click "Print / Save PDF" button** - Opens browser's print dialog
5. **Choose "Save as PDF"** in the print dialog

## Print CSS Features

- A4 page size with 12mm margins
- Fixed width (794px) prevents scaling issues
- Color preservation (`print-color-adjust: exact`)
- Smart page breaks with `.section` and `.page-break` classes

## Legacy Code

If you need to revert to the old PDF export method temporarily:
1. The old `pdfReportService.js` is still available
2. `html2canvas` and `jsPDF` dependencies remain installed
3. You can feature-flag between old and new methods if needed

## Benefits

- ✅ More reliable PDF generation
- ✅ Better color accuracy  
- ✅ Consistent page sizing
- ✅ Faster export process
- ✅ Native browser print preview
- ✅ Better text clarity (no pixelation)