/**
 * PDF Generation Service
 * Handles creating professional PDF reports from visit data
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import enhancedAuthService from './enhancedAuthService.v2.js';

class PDFReportService {
  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    this.pageMargin = 25;
    this.pageWidth = 210; // A4 width in mm
    this.pageHeight = 297; // A4 height in mm
    
    // Enhanced professional color scheme
    this.colors = {
      primary: [41, 98, 165],      // Professional blue
      primaryLight: [67, 120, 191], // Lighter blue variant
      secondary: [64, 64, 64],     // Dark gray
      accent: [26, 188, 156],      // Teal accent
      light: [248, 249, 250],      // Very light gray background
      lightAlt: [235, 237, 240],   // Alternate light gray for rows
      text: [33, 37, 41],          // Darker professional text
      textMuted: [108, 117, 125],  // Muted text for captions
      warning: [220, 53, 69],      // Professional red
      warningLight: [248, 215, 218], // Light red background
      success: [40, 167, 69],      // Professional green
      successLight: [212, 237, 218], // Light green background
      border: [206, 212, 218],     // Professional border
      borderLight: [233, 236, 239], // Light border
      white: [255, 255, 255],      // Pure white
      tableHeader: [52, 58, 64],   // Dark table headers
      shadow: [0, 0, 0]            // Shadow color
    };
    
    // Enhanced typography settings for professional appearance
    this.fonts = {
      title: { size: 32, weight: 'bold', font: 'helvetica' },
      subtitle: { size: 14, weight: 'normal', font: 'helvetica' },
      sectionHeader: { size: 20, weight: 'bold', font: 'helvetica' },
      subHeader: { size: 16, weight: 'bold', font: 'helvetica' },
      subHeaderLight: { size: 14, weight: 'bold', font: 'helvetica' },
      body: { size: 11, weight: 'normal', font: 'helvetica' },
      bodyLarge: { size: 12, weight: 'normal', font: 'helvetica' },
      caption: { size: 9, weight: 'normal', font: 'helvetica' },
      captionBold: { size: 9, weight: 'bold', font: 'helvetica' },
      tableHeader: { size: 11, weight: 'bold', font: 'helvetica' },
      tableBody: { size: 10, weight: 'normal', font: 'helvetica' },
      metadata: { size: 10, weight: 'normal', font: 'helvetica' },
      metadataLabel: { size: 10, weight: 'bold', font: 'helvetica' }
    };
    
    // Enhanced layout settings for professional presentation
    this.layout = {
      sectionSpacing: 25,
      subsectionSpacing: 18,
      paragraphSpacing: 10,
      lineHeight: 1.5,
      tableRowHeight: 12,
      tableHeaderHeight: 16,
      headerHeight: 75,
      footerHeight: 30,
      cardPadding: 8,
      borderRadius: 3,
      shadowOffset: 1.5,
      imageMaxWidth: 120,
      imageMaxHeight: 90,
      columnGap: 15,
      statusIndicatorSize: 8
    };
  }

  /**
   * Apply consistent typography style
   */
  applyStyle(pdf, styleType, color = null) {
    const style = this.fonts[styleType];
    pdf.setFontSize(style.size);
    pdf.setFont(style.font, style.weight);
    
    if (color) {
      pdf.setTextColor(...(this.colors[color] || color));
    } else {
      pdf.setTextColor(...this.colors.text);
    }
  }

  /**
   * Draw professional section divider with gradient effect
   */
  drawSectionDivider(pdf, yPosition, width = null, style = 'standard') {
    const dividerWidth = width || (this.pageWidth - (this.pageMargin * 2));
    
    if (style === 'bold') {
      // Bold divider for major sections
      pdf.setDrawColor(...this.colors.primary);
      pdf.setLineWidth(2);
      pdf.line(this.pageMargin, yPosition, this.pageMargin + dividerWidth, yPosition);
      
      // Accent line below
      pdf.setDrawColor(...this.colors.accent);
      pdf.setLineWidth(0.5);
      pdf.line(this.pageMargin, yPosition + 2.5, this.pageMargin + dividerWidth * 0.3, yPosition + 2.5);
      
      return yPosition + 12;
    } else {
      // Standard divider with gradient effect
      pdf.setDrawColor(...this.colors.primary);
      pdf.setLineWidth(1.5);
      pdf.line(this.pageMargin, yPosition, this.pageMargin + dividerWidth, yPosition);
      
      // Subtle gradient shadow
      pdf.setDrawColor(...this.colors.borderLight);
      pdf.setLineWidth(0.3);
      pdf.line(this.pageMargin, yPosition + 1, this.pageMargin + dividerWidth, yPosition + 1);
      
      return yPosition + 10;
    }
  }

  /**
   * Draw professional background box with optional border and shadow
   */
  drawBackgroundBox(pdf, x, y, width, height, color = 'light', opacity = 0.1, options = {}) {
    const { 
      border = false, 
      borderColor = 'border', 
      borderWidth = 0.5,
      shadow = false,
      rounded = false 
    } = options;
    
    // Shadow effect
    if (shadow) {
      pdf.setFillColor(...this.colors.shadow);
      pdf.setGState(pdf.GState({ opacity: 0.1 }));
      pdf.rect(x + this.layout.shadowOffset, y + this.layout.shadowOffset, width, height, 'F');
      pdf.setGState(pdf.GState({ opacity: 1 }));
    }
    
    // Main background
    pdf.setFillColor(...this.colors[color]);
    pdf.setGState(pdf.GState({ opacity: opacity }));
    pdf.rect(x, y, width, height, 'F');
    pdf.setGState(pdf.GState({ opacity: 1 }));
    
    // Border
    if (border) {
      pdf.setDrawColor(...this.colors[borderColor]);
      pdf.setLineWidth(borderWidth);
      pdf.rect(x, y, width, height, 'S');
    }
  }

  /**
   * Draw professional card container
   */
  drawCard(pdf, x, y, width, height, options = {}) {
    const {
      backgroundColor = 'white',
      borderColor = 'border',
      shadow = true,
      padding = this.layout.cardPadding
    } = options;
    
    this.drawBackgroundBox(pdf, x, y, width, height, backgroundColor, 1, {
      border: true,
      borderColor,
      shadow
    });
    
    return {
      contentX: x + padding,
      contentY: y + padding,
      contentWidth: width - (padding * 2),
      contentHeight: height - (padding * 2)
    };
  }

  /**
   * Draw status indicator with professional styling
   */
  drawStatusIndicator(pdf, x, y, status, size = null) {
    const indicatorSize = size || this.layout.statusIndicatorSize;
    const statusColors = {
      'online': this.colors.success,
      'offline': this.colors.warning,
      'warning': [255, 193, 7], // Amber
      'unknown': this.colors.textMuted,
      'critical': this.colors.warning,
      'good': this.colors.success,
      'poor': this.colors.warning
    };
    
    const color = statusColors[status?.toLowerCase()] || this.colors.textMuted;
    
    // Draw circle indicator
    pdf.setFillColor(...color);
    pdf.circle(x + indicatorSize/2, y + indicatorSize/2, indicatorSize/2, 'F');
    
    // Add subtle border
    pdf.setDrawColor(...this.colors.border);
    pdf.setLineWidth(0.3);
    pdf.circle(x + indicatorSize/2, y + indicatorSize/2, indicatorSize/2, 'S');
    
    return indicatorSize + 4; // Return width used including spacing
  }

  /**
   * Add professional section header with consistent styling
   */
  addSectionHeader(pdf, title, yPosition, options = {}) {
    const {
      style = 'standard', // 'standard', 'major', 'minor'
      icon = null,
      subtitle = null,
      background = false,
      divider = true
    } = options;
    
    let yPos = this.checkPageBreak(pdf, yPosition, 40);
    
    // Background for major sections
    if (background || style === 'major') {
      this.drawBackgroundBox(pdf, this.pageMargin - 5, yPos - 5, 
        this.pageWidth - (this.pageMargin * 2) + 10, 30, 'primary', 0.05, {
          border: false
        });
    }
    
    // Section title styling based on type
    let titleStyle, titleColor;
    switch (style) {
      case 'major':
        titleStyle = 'sectionHeader';
        titleColor = 'primary';
        break;
      case 'minor':
        titleStyle = 'subHeader';
        titleColor = 'secondary';
        break;
      default:
        titleStyle = 'sectionHeader';
        titleColor = 'primary';
    }
    
    this.applyStyle(pdf, titleStyle, titleColor);
    
    // Add icon if provided (clean professional icons only)
    let textX = this.pageMargin;
    if (icon && style !== 'clean') {
      pdf.text(icon, textX, yPos);
      textX += 15;
    }
    
    pdf.text(title, textX, yPos);
    yPos += style === 'minor' ? 12 : 15;
    
    // Subtitle if provided
    if (subtitle) {
      this.applyStyle(pdf, 'body', 'textMuted');
      pdf.text(subtitle, textX, yPos);
      yPos += 8;
    }
    
    // Professional divider
    if (divider) {
      const dividerStyle = style === 'major' ? 'bold' : 'standard';
      yPos = this.drawSectionDivider(pdf, yPos + 5, null, dividerStyle);
    }
    
    return yPos + this.layout.subsectionSpacing;
  }

  /**
   * Add professional header with company branding
   */
  addProfessionalHeader(pdf, title, reportData) {
    // Header background
    this.drawBackgroundBox(pdf, 0, 0, this.pageWidth, this.layout.headerHeight, 'primary', 0.05);
    
    let yPos = this.pageMargin + 5;
    
    // Company logo area (reserved space)
    const logoArea = 15;
    yPos += logoArea;
    
    // Main title with professional styling
    this.applyStyle(pdf, 'title', 'primary');
    pdf.text(title, this.pageMargin, yPos);
    yPos += 12;
    
    // Subtitle/tagline
    this.applyStyle(pdf, 'body', 'secondary');
    pdf.text('Professional Site Assessment & Infrastructure Report', this.pageMargin, yPos);
    yPos += 10;
    
    // Report metadata in organized layout
    this.applyStyle(pdf, 'body');
    const metadata = [
      { label: 'Organization:', value: reportData.organization?.name || 'N/A' },
      { label: 'Location:', value: reportData.location?.name || 'N/A' },
      { label: 'Assessment Date:', value: new Date(reportData.visitDate || Date.now()).toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      }) },
      { label: 'Technical Consultant:', value: reportData.technician?.name || this.getTechnicianName() }
    ];

    // Two-column layout for metadata
    const leftColumn = this.pageMargin;
    const rightColumn = this.pageMargin + (this.pageWidth - this.pageMargin * 2) / 2;
    
    metadata.forEach((item, index) => {
      const xPos = index % 2 === 0 ? leftColumn : rightColumn;
      const yOffset = Math.floor(index / 2) * 7;
      
      // Label in bold
      this.applyStyle(pdf, 'body', 'secondary');
      pdf.text(item.label, xPos, yPos + yOffset);
      
      // Value in regular weight
      this.applyStyle(pdf, 'body');
      pdf.text(item.value, xPos + 35, yPos + yOffset);
    });

    yPos += Math.ceil(metadata.length / 2) * 7 + 8;
    
    // Professional divider
    yPos = this.drawSectionDivider(pdf, yPos);
    
    return yPos;
  }

  /**
   * Get technician name with fallback
   */
  getTechnicianName() {
    const user = enhancedAuthService.getCurrentUser();
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return 'RSS Technical Services';
  }

  /**
   * Get severity color for issues
   */
  getSeverityColor(severity) {
    const severityMap = {
      'critical': 'warning',
      'high': 'warning', 
      'medium': [255, 193, 7], // Amber
      'low': 'light'
    };
    return severityMap[severity?.toLowerCase()] || 'light';
  }

  /**
   * Get severity icon
   */
  getSeverityIcon(severity) {
    const iconMap = {
      'critical': '🔴',
      'high': '🟠', 
      'medium': '🟡',
      'low': '🟢'
    };
    return iconMap[severity?.toLowerCase()] || '⚪';
  }

  /**
   * Get priority color for recommendations
   */
  getPriorityColor(priority) {
    const priorityMap = {
      'high': 'accent',
      'medium': [255, 193, 7], // Amber
      'low': 'light'
    };
    return priorityMap[priority?.toLowerCase()] || 'light';
  }

  /**
   * Get priority icon
   */
  getPriorityIcon(priority) {
    const iconMap = {
      'high': '🔥',
      'medium': '📋',
      'low': '💡'
    };
    return iconMap[priority?.toLowerCase()] || '💭';
  }

  /**
   * Generate PDF from report data - Complete restructure per requirements
   */
  async generatePDF(reportData, options = {}) {
    try {
      const {
        title = 'RSS Visit Report',
        includePhotos = true,
        includeRackDiagrams = true,
        format = 'a4',
        orientation = 'portrait'
      } = options;

      // Create new PDF document
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format
      });

      let currentPage = 1;
      let yPosition = this.pageMargin;

      // 1. Header: Title + Location, Date, Technician (clean title)
      yPosition = this.addCleanHeader(pdf, title, reportData);

      // 2. Summary: Renamed from "Executive Summary" to just "Summary"
      yPosition = this.addSummarySection(pdf, reportData, yPosition);

      // 3. Office Assessment Grades: Show office grading information
      yPosition = this.addOfficeAssessmentGrades(pdf, reportData, yPosition);

      // 4. Infrastructure Assessment: Fixed title + specific order
      yPosition = await this.addInfrastructureAssessmentRestructured(pdf, reportData, yPosition, includeRackDiagrams);

      // 5. Inventory Table: Professional table format
      yPosition = this.addInventoryTable(pdf, reportData, yPosition);

      // 6. Special Stations: Listed in a row
      yPosition = this.addSpecialStations(pdf, reportData, yPosition);

      // 7. Combined Table: PC repairs, Issues & Problems, Recommendations, Follow-up items
      yPosition = this.addCombinedTable(pdf, reportData, yPosition);

      // 8. Training Room Pictures
      if (includePhotos) {
        yPosition = await this.addTrainingRoomPictures(pdf, reportData, yPosition);
      }

      // 9. SCCM PC Management Table
      yPosition = this.addSCCMPCManagementTable(pdf, reportData, yPosition);

      // Add footer to all pages
      this.addFooters(pdf, reportData);

      return pdf;

    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  /**
   * Generate and download PDF
   */
  async downloadPDF(reportData, filename = null, options = {}) {
    try {
      const pdf = await this.generatePDF(reportData, options);
      
      const finalFilename = filename || 
        `RSS_Visit_Report_${reportData.organization?.name || 'Unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;

      pdf.save(finalFilename);
      
      return {
        success: true,
        filename: finalFilename,
        size: pdf.internal.pages.length
      };

    } catch (error) {
      console.error('PDF download error:', error);
      throw error;
    }
  }

  /**
   * Generate PDF and email it
   */
  async emailPDF(reportData, emailOptions = {}) {
    try {
      const {
        recipients = [],
        subject = 'RSS Visit Report',
        message = 'Please find the attached visit report.',
        cc = [],
        bcc = []
      } = emailOptions;

      // Generate PDF blob
      const pdf = await this.generatePDF(reportData);
      const pdfBlob = pdf.output('blob');

      // Convert to base64 for email
      const base64PDF = await this.blobToBase64(pdfBlob);

      // Send email via API
      const response = await enhancedAuthService.apiRequest(
        `${this.apiUrl}/reports/email`,
        {
          method: 'POST',
          body: JSON.stringify({
            recipients,
            cc,
            bcc,
            subject,
            message,
            attachments: [{
              filename: `RSS_Visit_Report_${new Date().toISOString().split('T')[0]}.pdf`,
              content: base64PDF,
              contentType: 'application/pdf'
            }],
            reportId: reportData.id
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Email PDF error:', error);
      throw error;
    }
  }

  /**
   * Add header to PDF
   */
  addHeader(pdf, title, reportData) {
    // Company logo (if available)
    const logoHeight = 20;
    let yPos = this.pageMargin;

    // Title
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, this.pageMargin, yPos + logoHeight);
    yPos += logoHeight + 10;

    // Report metadata
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    
    const metadata = [
      `Organization: ${reportData.organization?.name || 'N/A'}`,
      `Location: ${reportData.location?.name || 'N/A'}`,
      `Date: ${new Date(reportData.visitDate || Date.now()).toLocaleDateString()}`,
      `Technician: ${reportData.technician?.name || enhancedAuthService.getCurrentUser()?.first_name + ' ' + enhancedAuthService.getCurrentUser()?.last_name}`
    ];

    metadata.forEach((line, index) => {
      pdf.text(line, this.pageMargin, yPos + (index * 6));
    });

    yPos += metadata.length * 6 + 10;

    // Horizontal line
    pdf.setLineWidth(0.5);
    pdf.line(this.pageMargin, yPos, this.pageWidth - this.pageMargin, yPos);
    yPos += 10;

    return yPos;
  }

  /**
   * Add clean professional header - Enhanced design
   */
  addCleanHeader(pdf, title, reportData) {
    // Professional gradient header background
    this.drawBackgroundBox(pdf, 0, 0, this.pageWidth, this.layout.headerHeight, 'primary', 0.08, {
      border: false
    });
    
    let yPos = this.pageMargin + 5;
    
    // Company logo area (reserved space for future logo integration)
    yPos += 8;
    
    // Clean title with enhanced styling - remove symbols
    this.applyStyle(pdf, 'title', 'primary');
    const cleanTitle = title.replace(/[^\w\s]/g, ''); // Remove all symbols
    pdf.text(cleanTitle, this.pageMargin, yPos);
    yPos += 16;
    
    // Professional subtitle
    this.applyStyle(pdf, 'subtitle', 'textMuted');
    pdf.text('Infrastructure Assessment & Technical Documentation', this.pageMargin, yPos);
    yPos += 12;
    
    // Metadata in professional card layout
    const metadataCardHeight = 35;
    const cardArea = this.drawCard(pdf, this.pageMargin, yPos, 
      this.pageWidth - (this.pageMargin * 2), metadataCardHeight, {
        backgroundColor: 'white',
        shadow: true
      });
    
    // Two-column metadata layout
    const leftColumn = cardArea.contentX;
    const rightColumn = leftColumn + cardArea.contentWidth / 2;
    let metaY = cardArea.contentY + 8;
    
    // Calculate next visit date (90 days from assessment date)
    const assessmentDate = new Date(reportData.visitDate || Date.now());
    const nextVisitDate = new Date(assessmentDate);
    nextVisitDate.setDate(nextVisitDate.getDate() + 90);
    
    // Format the dates
    const visitDateFormatted = assessmentDate.toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
    const nextVisitDateFormatted = nextVisitDate.toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    // Explicit 2x2 layout positioning
    // Top row
    // Location (top left)
    this.applyStyle(pdf, 'metadataLabel', 'secondary');
    pdf.text('Location:', leftColumn, metaY);
    this.applyStyle(pdf, 'metadata', 'text');
    pdf.text(reportData.location?.name || 'N/A', leftColumn + 42, metaY);
    
    // Technician (top right)
    this.applyStyle(pdf, 'metadataLabel', 'secondary');
    pdf.text('Technician:', rightColumn, metaY);
    this.applyStyle(pdf, 'metadata', 'text');
    pdf.text(reportData.technician?.name || reportData.technician || this.getTechnicianName(), rightColumn + 42, metaY);
    
    // Bottom row
    const bottomRowY = metaY + 10;
    
    // Visit Date (bottom left)
    this.applyStyle(pdf, 'metadataLabel', 'secondary');
    pdf.text('Visit Date:', leftColumn, bottomRowY);
    this.applyStyle(pdf, 'metadata', 'text');
    pdf.text(visitDateFormatted, leftColumn + 42, bottomRowY);
    
    // Next Visit Date (bottom right)
    this.applyStyle(pdf, 'metadataLabel', 'secondary');
    pdf.text('Next Visit Date:', rightColumn, bottomRowY);
    this.applyStyle(pdf, 'metadata', 'text');
    pdf.text(nextVisitDateFormatted, rightColumn + 42, bottomRowY);
    
    // Calculate the true bottom of the header content and add professional spacing
    return yPos + metadataCardHeight + 15;
  }

  /**
   * Add summary section (renamed from Executive Summary)
   */
  addSummarySection(pdf, reportData, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 60);

    // Section title - clean without symbols, with proper spacing
    this.applyStyle(pdf, 'sectionHeader', 'primary');
    pdf.text('Summary', this.pageMargin, yPos);
    yPos += 15; // Increased spacing between title and divider to prevent overlapping
    
    // Section divider
    yPos = this.drawSectionDivider(pdf, yPos); // drawSectionDivider adds its own spacing

    // Visit summary content
    this.applyStyle(pdf, 'body', 'text');
    const summary = reportData.summary || this.generateAutoSummary(reportData);
    const summaryLines = pdf.splitTextToSize(summary, this.pageWidth - (this.pageMargin * 2));
    
    summaryLines.forEach(line => {
      yPos = this.checkPageBreak(pdf, yPos, 8);
      pdf.text(line, this.pageMargin, yPos);
      yPos += 6;
    });

    return yPos + 10;
  }

  /**
   * Add Office Assessment Grades section
   */
  addOfficeAssessmentGrades(pdf, reportData, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 50);

    // Section title
    this.applyStyle(pdf, 'sectionHeader', 'primary');
    pdf.text('Office Assessment Grades', this.pageMargin, yPos);
    yPos += 12;
    
    // Section divider
    yPos = this.drawSectionDivider(pdf, yPos);
    yPos += 10;

    // Office grading information
    if (reportData.officeGrading && reportData.officeGrading.length > 0) {
      const gradingData = reportData.officeGrading.map(grade => [
        grade.category || 'N/A',
        grade.score || 'N/A',
        grade.comments || 'No comments'
      ]);
      yPos = this.addTable(pdf, gradingData, yPos, ['Category', 'Score', 'Comments']);
    } else {
      this.applyStyle(pdf, 'body', 'secondary');
      pdf.text('No office grading data available', this.pageMargin, yPos);
      yPos += 15;
    }

    return yPos + 10;
  }

  /**
   * Add Infrastructure Assessment - Restructured with fixed title and specific order
   */
  async addInfrastructureAssessmentRestructured(pdf, reportData, yPosition, includeRackDiagrams = true) {
    let yPos = this.checkPageBreak(pdf, yPosition, 60);

    // Section title - clean without symbols
    this.applyStyle(pdf, 'sectionHeader', 'primary');
    pdf.text('Infrastructure Assessment', this.pageMargin, yPos);
    yPos += 12;
    
    // Section divider
    yPos = this.drawSectionDivider(pdf, yPos);
    yPos += 10;

    // Data Closet Assessment
    yPos = this.addDataClosetAssessment(pdf, reportData, yPos);
    
    // Data Closet Management with specific order
    yPos = await this.addDataClosetManagement(pdf, reportData, yPos, includeRackDiagrams);

    return yPos;
  }

  /**
   * Add Data Closet Assessment
   */
  addDataClosetAssessment(pdf, reportData, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 30);

    // Subsection title
    this.applyStyle(pdf, 'subHeader', 'primary');
    pdf.text('Data Closet Assessment', this.pageMargin, yPos);
    yPos += 10;

    // Assessment content
    if (reportData.dataClosetAssessment) {
      this.applyStyle(pdf, 'body', 'text');
      const assessmentText = typeof reportData.dataClosetAssessment === 'string' 
        ? reportData.dataClosetAssessment 
        : 'Data closet assessment completed successfully.';
      
      const lines = pdf.splitTextToSize(assessmentText, this.pageWidth - (this.pageMargin * 2));
      lines.forEach(line => {
        yPos = this.checkPageBreak(pdf, yPos, 8);
        pdf.text(line, this.pageMargin, yPos);
        yPos += 6;
      });
    } else {
      this.applyStyle(pdf, 'body', 'secondary');
      pdf.text('No data closet assessment information available', this.pageMargin, yPos);
      yPos += 6;
    }

    return yPos + 10;
  }

  /**
   * Add Data Closet Management with specific order
   */
  async addDataClosetManagement(pdf, reportData, yPosition, includeRackDiagrams = true) {
    let yPos = this.checkPageBreak(pdf, yPosition, 30);

    // Subsection title
    this.applyStyle(pdf, 'subHeader', 'primary');
    pdf.text('Data Closet Management', this.pageMargin, yPos);
    yPos += 10;

    // 1. Picture of rack layout
    if (includeRackDiagrams) {
      yPos = await this.addRackLayoutPictures(pdf, reportData, yPos);
    }

    // 2. Picture of power outlet mapping
    yPos = await this.addPowerOutletMapping(pdf, reportData, yPos);

    // 3. Table showing all device information for each rack
    yPos = this.addDeviceInformationTables(pdf, reportData, yPos);

    // 4. Environment information
    yPos = this.addEnvironmentInformation(pdf, reportData, yPos);

    // 5. Pictures from the rack
    yPos = await this.addRackPictures(pdf, reportData, yPos);

    return yPos;
  }

  /**
   * Add Inventory Table - Enhanced with multiple data structure support
   */
  addInventoryTable(pdf, reportData, yPosition) {
    let yPos = this.checkSectionPageBreak(pdf, yPosition, 40, 80);

    // Section title
    this.applyStyle(pdf, 'sectionHeader', 'primary');
    pdf.text('Inventory Table', this.pageMargin, yPos);
    yPos += 8;
    
    // Section divider
    yPos = this.drawSectionDivider(pdf, yPos);
    yPos += 10;

    // Support multiple inventory data structures
    let inventorySource = null;
    
    if (reportData.inventory) {
      if (Array.isArray(reportData.inventory)) {
        inventorySource = reportData.inventory;
      } else if (reportData.inventory.items && Array.isArray(reportData.inventory.items)) {
        inventorySource = reportData.inventory.items;
      } else if (typeof reportData.inventory === 'object') {
        // Convert object to array format
        inventorySource = Object.entries(reportData.inventory).map(([key, value]) => ({
          category: key,
          description: value.description || key,
          quantity: value.quantity || value.count || value.total || 0,
          condition: value.condition || 'Good',
          location: value.location || 'N/A'
        }));
      }
    }

    if (inventorySource && inventorySource.length > 0) {
      const inventoryData = inventorySource.map(item => {
        // Handle different item structures
        const category = item.category || item.type || item.itemType || 'N/A';
        const description = item.description || item.name || item.item || 'N/A';
        const quantity = (item.quantity || item.count || item.total || item.inUse || 0).toString();
        const condition = item.condition || item.status || 'Good';
        const location = item.location || item.room || item.area || 'N/A';
        
        return [category, description, quantity, condition, location];
      });

      // Add summary information
      const totalItems = inventoryData.reduce((sum, row) => sum + parseInt(row[2] || 0, 10), 0);
      if (totalItems > 0) {
        this.applyStyle(pdf, 'body', 'textMuted');
        pdf.text(`Total inventory items: ${totalItems}`, this.pageMargin, yPos);
        yPos += 8;
      }
      
      yPos = this.addTable(pdf, inventoryData, yPos, ['Category', 'Description', 'Quantity', 'Condition', 'Location']);
    } else {
      this.applyStyle(pdf, 'body', 'secondary');
      pdf.text('No inventory data available', this.pageMargin, yPos);
      yPos += 15;
    }

    return yPos + 10;
  }

  /**
   * Add Special Stations - Enhanced with multiple data structure support
   */
  addSpecialStations(pdf, reportData, yPosition) {
    let yPos = this.checkSectionPageBreak(pdf, yPosition, 30, 60);

    // Section title
    this.applyStyle(pdf, 'sectionHeader', 'primary');
    pdf.text('Special Stations', this.pageMargin, yPos);
    yPos += 8;
    
    // Section divider
    yPos = this.drawSectionDivider(pdf, yPos);
    yPos += 10;

    // Check multiple possible data sources for special stations
    let specialStations = [];
    
    if (reportData.specialStations) {
      if (Array.isArray(reportData.specialStations)) {
        specialStations = reportData.specialStations.filter(station => station && station.trim());
      } else if (typeof reportData.specialStations === 'object') {
        // Convert object to array format
        specialStations = Object.entries(reportData.specialStations)
          .filter(([key, value]) => value > 0)
          .map(([key, value]) => `${key}: ${value}`)
          .filter(station => station && station.trim());
      } else if (typeof reportData.specialStations === 'string') {
        specialStations = [reportData.specialStations];
      }
    }
    
    // Also check inventory for special configurations
    if (reportData.inventory?.specialStations) {
      const inventoryStations = Object.entries(reportData.inventory.specialStations)
        .filter(([key, value]) => value > 0)
        .map(([key, value]) => {
          const stationName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return `${stationName}: ${value}`;
        });
      specialStations = [...specialStations, ...inventoryStations];
    }

    if (specialStations.length > 0) {
      this.applyStyle(pdf, 'body', 'text');
      
      // Display as a formatted list with better spacing
      if (specialStations.length > 3) {
        // Use table format for many stations
        const stationData = specialStations.map(station => {
          const parts = station.split(':');
          return parts.length > 1 
            ? [parts[0].trim(), parts[1].trim()]
            : [station, 'Present'];
        });
        yPos = this.addTable(pdf, stationData, yPos, ['Station Type', 'Details']);
      } else {
        // Use simple list format for few stations
        const stationsList = specialStations.join(' • ');
        const lines = pdf.splitTextToSize(stationsList, this.pageWidth - (this.pageMargin * 2));
        
        lines.forEach(line => {
          yPos = this.checkPageBreak(pdf, yPos, 8);
          pdf.text(line, this.pageMargin, yPos);
          yPos += 6;
        });
      }
    } else {
      this.applyStyle(pdf, 'body', 'secondary');
      pdf.text('No special stations identified', this.pageMargin, yPos);
      yPos += 6;
    }

    return yPos + 10;
  }

  /**
   * Add Combined Table - Enhanced to show ALL items including completed ones
   */
  addCombinedTable(pdf, reportData, yPosition) {
    let yPos = this.checkSectionPageBreak(pdf, yPosition, 40, 100);

    // Section title
    this.applyStyle(pdf, 'sectionHeader', 'primary');
    pdf.text('Issues, Recommendations & Actions', this.pageMargin, yPos);
    yPos += 8;
    
    // Section divider
    yPos = this.drawSectionDivider(pdf, yPos);
    yPos += 10;

    const combinedData = [];
    let completedCount = 0;
    let activeCount = 0;

    // Add PC repairs - include ALL items regardless of status
    if (reportData.pcRepairs && reportData.pcRepairs.length > 0) {
      reportData.pcRepairs.forEach(repair => {
        const status = repair.status || 'In Progress';
        const isCompleted = status.toLowerCase().includes('completed') || 
                           status.toLowerCase().includes('resolved') || 
                           status.toLowerCase().includes('done') ||
                           status.toLowerCase().includes('fixed');
        
        if (isCompleted) completedCount++;
        else activeCount++;
        
        combinedData.push([
          'PC Repair',
          repair.description || repair.title || 'N/A',
          status,
          repair.priority || 'Medium'
        ]);
      });
    }

    // Add issues - include ALL items regardless of status
    if (reportData.issues && reportData.issues.length > 0) {
      reportData.issues.forEach(issue => {
        const status = issue.status || 'Open';
        const isCompleted = status.toLowerCase().includes('resolved') || 
                           status.toLowerCase().includes('closed') || 
                           status.toLowerCase().includes('completed') ||
                           status.toLowerCase().includes('fixed');
        
        if (isCompleted) completedCount++;
        else activeCount++;
        
        combinedData.push([
          'Issue',
          issue.description || issue.title || 'N/A',
          status,
          issue.priority || issue.severity || 'Medium'
        ]);
      });
    }

    // Add recommendations - include ALL items regardless of status
    if (reportData.recommendations && reportData.recommendations.length > 0) {
      reportData.recommendations.forEach(rec => {
        const status = rec.status || 'Pending';
        const isCompleted = status.toLowerCase().includes('implemented') || 
                           status.toLowerCase().includes('completed') || 
                           status.toLowerCase().includes('done') ||
                           status.toLowerCase().includes('resolved');
        
        if (isCompleted) completedCount++;
        else activeCount++;
        
        combinedData.push([
          'Recommendation',
          rec.description || rec.title || 'N/A',
          status,
          rec.priority || 'Medium'
        ]);
      });
    }

    // Add follow-up items - include ALL items regardless of status
    if (reportData.followUpItems && reportData.followUpItems.length > 0) {
      reportData.followUpItems.forEach(item => {
        const status = item.status || 'Pending';
        const isCompleted = status.toLowerCase().includes('completed') || 
                           status.toLowerCase().includes('done') || 
                           status.toLowerCase().includes('resolved') ||
                           status.toLowerCase().includes('closed');
        
        if (isCompleted) completedCount++;
        else activeCount++;
        
        combinedData.push([
          'Follow-up',
          item.description || item.title || item.action || 'N/A',
          status,
          item.priority || 'Medium'
        ]);
      });
    }

    if (combinedData.length > 0) {
      // Add summary information
      this.applyStyle(pdf, 'body', 'textMuted');
      const summaryText = `Total items: ${combinedData.length} • Active: ${activeCount} • Completed: ${completedCount}`;
      pdf.text(summaryText, this.pageMargin, yPos);
      yPos += 8;
      
      yPos = this.addTable(pdf, combinedData, yPos, ['Type', 'Description', 'Status', 'Priority']);
    } else {
      this.applyStyle(pdf, 'body', 'secondary');
      pdf.text('No issues, recommendations, or follow-up items to display', this.pageMargin, yPos);
      yPos += 15;
    }

    return yPos + 10;
  }

  /**
   * Add Training Room Pictures - Enhanced filtering and display
   */
  async addTrainingRoomPictures(pdf, reportData, yPosition) {
    let yPos = this.checkSectionPageBreak(pdf, yPosition, 40, 120);

    // Section title
    this.applyStyle(pdf, 'sectionHeader', 'primary');
    pdf.text('Training Room Pictures', this.pageMargin, yPos);
    yPos += 8;
    
    // Section divider
    yPos = this.drawSectionDivider(pdf, yPos);
    yPos += 10;

    // Enhanced filtering for training room photos with multiple criteria
    const trainingRoomPhotos = (reportData.photos || []).filter(photo => {
      if (!photo) return false;
      
      // Primary category matches
      if (photo.category === 'training_room' || photo.category === 'training') {
        return true;
      }
      
      // Secondary filtering based on description and location
      const desc = (photo.description || '').toLowerCase();
      const title = (photo.title || '').toLowerCase();
      const location = (photo.location || '').toLowerCase();
      
      const trainingKeywords = ['training', 'classroom', 'conference', 'meeting', 'education'];
      
      return trainingKeywords.some(keyword => 
        desc.includes(keyword) || title.includes(keyword) || location.includes(keyword)
      );
    });

    if (trainingRoomPhotos.length > 0) {
      // Add count indicator for reference
      this.applyStyle(pdf, 'body', 'textMuted');
      pdf.text(`Found ${trainingRoomPhotos.length} training room ${trainingRoomPhotos.length === 1 ? 'photo' : 'photos'}:`, this.pageMargin, yPos);
      yPos += 8;
      
      for (const photo of trainingRoomPhotos) {
        yPos = await this.addPhoto(pdf, photo, yPos);
      }
    } else {
      // More specific fallback message
      this.applyStyle(pdf, 'body', 'secondary');
      pdf.text('No training room pictures available', this.pageMargin, yPos);
      yPos += 8;
      
      // Debug information if photos exist but don't match criteria
      if (reportData.photos && reportData.photos.length > 0) {
        this.applyStyle(pdf, 'caption', 'textMuted');
        const categories = [...new Set(reportData.photos.map(p => p.category).filter(c => c))];
        if (categories.length > 0) {
          pdf.text(`Available photo categories: ${categories.join(', ')}`, this.pageMargin, yPos);
          yPos += 6;
        }
      }
      yPos += 10;
    }

    return yPos + 5;
  }

  /**
   * Add SCCM PC Management Table
   */
  addSCCMPCManagementTable(pdf, reportData, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 50);

    // Section title
    this.applyStyle(pdf, 'sectionHeader', 'primary');
    pdf.text('SCCM PC Management Table', this.pageMargin, yPos);
    yPos += 8;
    
    // Section divider
    yPos = this.drawSectionDivider(pdf, yPos);
    yPos += 10;

    if (reportData.sccmData && reportData.sccmData.length > 0) {
      const sccmTableData = reportData.sccmData.map(pc => [
        pc.computerName || 'N/A',
        pc.operatingSystem || 'N/A',
        pc.lastSeen || 'N/A',
        pc.status || 'Unknown',
        pc.compliance || 'N/A'
      ]);
      yPos = this.addTable(pdf, sccmTableData, yPos, ['Computer Name', 'OS', 'Last Seen', 'Status', 'Compliance']);
    } else {
      this.applyStyle(pdf, 'body', 'secondary');
      pdf.text('No SCCM data available', this.pageMargin, yPos);
      yPos += 15;
    }

    return yPos + 10;
  }

  /**
   * Add Rack Layout Pictures - Enhanced filtering and display
   */
  async addRackLayoutPictures(pdf, reportData, yPosition) {
    let yPos = yPosition;

    this.applyStyle(pdf, 'subHeader', 'secondary');
    pdf.text('Rack Layout:', this.pageMargin, yPos);
    yPos += 10;

    // Enhanced filtering for rack layout images with multiple criteria
    const rackLayoutPhotos = (reportData.photos || []).filter(photo => {
      if (!photo) return false;
      
      // Primary category match
      if (photo.category === 'rack_layout' || photo.category === 'layout') {
        return true;
      }
      
      // Secondary filtering based on description and title
      const desc = (photo.description || '').toLowerCase();
      const title = (photo.title || '').toLowerCase();
      
      const layoutKeywords = ['layout', 'diagram', 'floor plan', 'schematic', 'blueprint'];
      const hasLayoutKeyword = layoutKeywords.some(keyword => 
        desc.includes(keyword) || title.includes(keyword)
      );
      
      // Ensure it's not a power outlet specific image (those are handled separately)
      const isPowerOutletSpecific = desc.includes('power') || desc.includes('outlet') || 
                                   title.includes('power') || title.includes('outlet');
      
      return hasLayoutKeyword && !isPowerOutletSpecific;
    });

    if (rackLayoutPhotos.length > 0) {
      // Add count indicator for reference
      this.applyStyle(pdf, 'body', 'textMuted');
      pdf.text(`Found ${rackLayoutPhotos.length} layout ${rackLayoutPhotos.length === 1 ? 'diagram' : 'diagrams'}:`, this.pageMargin, yPos);
      yPos += 8;
      
      for (const photo of rackLayoutPhotos) {
        yPos = await this.addPhoto(pdf, photo, yPos);
      }
    } else {
      this.applyStyle(pdf, 'body', 'secondary');
      pdf.text('No rack layout images available', this.pageMargin, yPos);
      yPos += 15;
    }

    return yPos + 5;
  }

  /**
   * Add Power Outlet Mapping - Enhanced filtering and display
   */
  async addPowerOutletMapping(pdf, reportData, yPosition) {
    let yPos = yPosition;

    this.applyStyle(pdf, 'subHeader', 'secondary');
    pdf.text('Power Outlet Mapping:', this.pageMargin, yPos);
    yPos += 10;

    // Enhanced filtering for power outlet mapping images
    const powerOutletPhotos = (reportData.photos || []).filter(photo => {
      if (!photo) return false;
      
      // Primary category match
      if (photo.category === 'power_outlets' || photo.category === 'power' || photo.category === 'outlets') {
        return true;
      }
      
      // Secondary filtering based on description and title
      const desc = (photo.description || '').toLowerCase();
      const title = (photo.title || '').toLowerCase();
      
      const powerKeywords = ['power', 'outlet', 'electrical', 'ups', 'pdu', 'power distribution'];
      
      return powerKeywords.some(keyword => 
        desc.includes(keyword) || title.includes(keyword)
      );
    });

    if (powerOutletPhotos.length > 0) {
      // Add count indicator for reference
      this.applyStyle(pdf, 'body', 'textMuted');
      pdf.text(`Found ${powerOutletPhotos.length} power mapping ${powerOutletPhotos.length === 1 ? 'image' : 'images'}:`, this.pageMargin, yPos);
      yPos += 8;
      
      for (const photo of powerOutletPhotos) {
        yPos = await this.addPhoto(pdf, photo, yPos);
      }
    } else {
      this.applyStyle(pdf, 'body', 'secondary');
      pdf.text('No power outlet mapping images available', this.pageMargin, yPos);
      yPos += 15;
    }

    return yPos + 5;
  }

  /**
   * Add Device Information Tables for each rack - Enhanced with better positioning display
   */
  addDeviceInformationTables(pdf, reportData, yPosition) {
    let yPos = yPosition;

    this.applyStyle(pdf, 'subHeader', 'secondary');
    pdf.text('Device Information by Rack:', this.pageMargin, yPos);
    yPos += 10;

    if (reportData.racks && reportData.racks.length > 0) {
      reportData.racks.forEach((rack, rackIndex) => {
        yPos = this.checkPageBreak(pdf, yPos, 40);

        // Enhanced Rack title with location information
        this.applyStyle(pdf, 'body', 'primary');
        const rackTitle = rack.locationName 
          ? `Rack ${rackIndex + 1}: ${rack.name || `Rack ${rackIndex + 1}`} (${rack.locationName})`
          : `Rack ${rackIndex + 1}: ${rack.name || `Rack ${rackIndex + 1}`}`;
        pdf.text(rackTitle, this.pageMargin, yPos);
        yPos += 8;

        if (rack.devices && rack.devices.length > 0) {
          // Sort devices by position if available - Enhanced with better parsing
          const sortedDevices = [...rack.devices].sort((a, b) => {
            const posA = this.parsePosition(a.position || a.rackPosition || a.uPosition || 0);
            const posB = this.parsePosition(b.position || b.rackPosition || b.uPosition || 0);
            return posB - posA; // Top to bottom (higher U positions first)
          });

          const deviceData = sortedDevices.map(device => {
            // Enhanced position display with better formatting
            const position = device.position || device.rackPosition || device.uPosition || 'N/A';
            const positionDisplay = position !== 'N/A' && position !== 0 ? `U${this.parsePosition(position)}` : 'N/A';
            
            // Enhanced device identification
            const deviceName = device.name || device.deviceName || device.hostname || 'Unknown Device';
            const deviceType = device.type || device.deviceType || device.category || 'N/A';
            const deviceModel = device.model || device.modelNumber || 'N/A';
            const deviceStatus = device.status || device.state || 'Unknown';
            
            // Additional info if available
            const ipAddress = device.ipAddress || device.ip;
            const displayName = ipAddress ? `${deviceName} (${ipAddress})` : deviceName;
            
            return [
              displayName,
              deviceType,
              deviceModel,
              deviceStatus,
              positionDisplay
            ];
          });

          // Add device count information
          this.applyStyle(pdf, 'caption', 'textMuted');
          pdf.text(`${deviceData.length} devices configured:`, this.pageMargin + 5, yPos);
          yPos += 6;
          
          yPos = this.addTable(pdf, deviceData, yPos, ['Device Name', 'Type', 'Model', 'Status', 'Position']);
        } else {
          this.applyStyle(pdf, 'body', 'secondary');
          pdf.text('No devices found in this rack', this.pageMargin + 10, yPos);
          yPos += 15;
        }
        yPos += 10;
      });
    } else {
      this.applyStyle(pdf, 'body', 'secondary');
      pdf.text('No rack information available', this.pageMargin, yPos);
      yPos += 15;
    }

    return yPos + 5;
  }

  /**
   * Add Environment Information - Enhanced with multiple data source support
   */
  addEnvironmentInformation(pdf, reportData, yPosition) {
    let yPos = yPosition;

    this.applyStyle(pdf, 'subHeader', 'secondary');
    pdf.text('Environment Information:', this.pageMargin, yPos);
    yPos += 10;

    // Check multiple possible data sources for environment information
    const envSource = reportData.environmentData || reportData.environmental || reportData.dataCloset?.environmental || {};
    
    if (Object.keys(envSource).length > 0) {
      const envData = [];
      
      // Temperature data
      if (envSource.temperature || envSource.temp) {
        const temp = envSource.temperature || envSource.temp;
        envData.push(['Temperature', `${temp}°F`]);
      }
      
      // Humidity data
      if (envSource.humidity) {
        envData.push(['Humidity', `${envSource.humidity}%`]);
      }
      
      // Power status
      if (envSource.powerStatus || envSource.power) {
        const power = envSource.powerStatus || envSource.power;
        envData.push(['Power Status', power]);
      }
      
      // Cooling status
      if (envSource.cooling || envSource.coolingStatus) {
        const cooling = envSource.cooling || envSource.coolingStatus;
        envData.push(['Cooling Status', cooling]);
      }
      
      // Ventilation
      if (envSource.ventilation || envSource.airflow) {
        const ventilation = envSource.ventilation || envSource.airflow;
        envData.push(['Ventilation', ventilation]);
      }
      
      // UPS/Battery status
      if (envSource.upsStatus || envSource.ups) {
        const ups = envSource.upsStatus || envSource.ups;
        envData.push(['UPS Status', ups]);
      }
      
      // Network connectivity
      if (envSource.networkStatus || envSource.connectivity) {
        const network = envSource.networkStatus || envSource.connectivity;
        envData.push(['Network Status', network]);
      }
      
      // Security system
      if (envSource.security || envSource.securitySystem) {
        const security = envSource.security || envSource.securitySystem;
        envData.push(['Security System', security]);
      }

      if (envData.length > 0) {
        yPos = this.addTable(pdf, envData, yPos, ['Parameter', 'Value']);
      } else {
        this.applyStyle(pdf, 'body', 'secondary');
        pdf.text('No environment data available', this.pageMargin, yPos);
        yPos += 15;
      }
    } else {
      this.applyStyle(pdf, 'body', 'secondary');
      pdf.text('No environment information available', this.pageMargin, yPos);
      yPos += 15;
    }

    return yPos + 5;
  }

  /**
   * Add Rack Pictures - Enhanced category filtering and display
   */
  async addRackPictures(pdf, reportData, yPosition) {
    let yPos = yPosition;

    this.applyStyle(pdf, 'subHeader', 'secondary');
    pdf.text('Rack Pictures:', this.pageMargin, yPos);
    yPos += 10;

    // Enhanced filtering for rack-related photos with better category support
    const rackPhotos = (reportData.photos || []).filter(photo => {
      if (!photo) return false;
      
      // Primary category match
      if (photo.category === 'rack' || photo.category === 'racks') {
        return true;
      }
      
      // Description-based filtering (excluding layout/diagram photos already shown)
      const desc = (photo.description || '').toLowerCase();
      const title = (photo.title || '').toLowerCase();
      
      const hasRackKeyword = desc.includes('rack') || title.includes('rack');
      const isLayoutDiagram = desc.includes('layout') || desc.includes('diagram') || 
                              desc.includes('power') || desc.includes('outlet') ||
                              title.includes('layout') || title.includes('diagram');
      
      return hasRackKeyword && !isLayoutDiagram;
    });

    if (rackPhotos.length > 0) {
      // Add count indicator for reference
      this.applyStyle(pdf, 'body', 'textMuted');
      pdf.text(`Found ${rackPhotos.length} rack ${rackPhotos.length === 1 ? 'photo' : 'photos'}:`, this.pageMargin, yPos);
      yPos += 8;
      
      for (const photo of rackPhotos) {
        yPos = await this.addPhoto(pdf, photo, yPos);
      }
    } else {
      this.applyStyle(pdf, 'body', 'secondary');
      pdf.text('No rack pictures available', this.pageMargin, yPos);
      yPos += 15;
    }

    return yPos + 5;
  }

  // Note: The following methods should still exist in the file: addPhoto, addTable, checkPageBreak
  // If they don't exist, they need to be implemented for the PDF generation to work properly

  /**
   * Legacy method - kept for compatibility (now redirected to new Summary section)
   */
  addExecutiveSummary(pdf, reportData, yPosition) {
    return this.addSummarySection(pdf, reportData, yPosition);
  }

  /**
   * Legacy method - removed from new structure but kept for compatibility
   */
  addVisitDetails(pdf, reportData, yPosition) {
    // Visit Details section is removed per requirements
    // Return current position without adding content
    return yPosition;
  }

  /**
   * Legacy method - kept for compatibility (now redirected to new Infrastructure Assessment)
   */
  addInfrastructureAssessment(pdf, reportData, yPosition) {
    return this.addInfrastructureAssessmentRestructured(pdf, reportData, yPosition, true);
  }


  /**
   * Add SCCM PCs section with enhanced styling
   */
  addSCCMPCsSection(pdf, sccmPCs, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 50);

    // Subsection title with icon
    this.applyStyle(pdf, 'subHeader', 'primary');
    pdf.text('💻 SCCM Managed Computers', this.pageMargin, yPos);
    yPos += 12;

    // Summary statistics with visual indicators
    const activeCount = sccmPCs.filter(pc => pc.status === 'active').length;
    const totalCount = sccmPCs.length;
    const inactiveCount = totalCount - activeCount;

    // Stats background
    this.drawBackgroundBox(pdf, this.pageMargin - 3, yPos - 3, 
                          this.pageWidth - (this.pageMargin * 2) + 6, 15, 'accent', 0.1);

    this.applyStyle(pdf, 'body', 'secondary');
    pdf.text('Computer Status Summary:', this.pageMargin, yPos);
    yPos += 8;

    // Status indicators with color coding
    this.applyStyle(pdf, 'body');
    pdf.text(`Total: ${totalCount}`, this.pageMargin + 10, yPos);
    
    this.applyStyle(pdf, 'body', 'success');
    pdf.text(`● Active: ${activeCount}`, this.pageMargin + 60, yPos);
    
    if (inactiveCount > 0) {
      this.applyStyle(pdf, 'body', 'warning');
      pdf.text(`● Inactive: ${inactiveCount}`, this.pageMargin + 120, yPos);
    }
    
    yPos += 15;

    // Computer details table with professional styling
    if (sccmPCs.length > 0) {
      const pcData = sccmPCs.slice(0, 25).map(pc => [ // Show up to 25 PCs with pagination
        pc.name || 'N/A',
        pc.model || 'N/A',
        pc.os || 'N/A',
        pc.memory || 'N/A',
        pc.lastLoginUsername || 'N/A',
        pc.status || 'N/A'
      ]);

      yPos = this.addProfessionalTable(pdf, pcData, yPos, 
        ['Computer Name', 'Model', 'Operating System', 'Memory', 'Last User', 'Status'],
        [0.2, 0.15, 0.2, 0.1, 0.2, 0.15],
        { alternateRowColors: true, headerBackground: true }
      );
      
      if (sccmPCs.length > 25) {
        yPos += 2;
        this.applyStyle(pdf, 'caption', 'secondary');
        pdf.text(`... and ${sccmPCs.length - 25} more computers. See detailed appendix for complete inventory.`, this.pageMargin, yPos);
        yPos += 8;
      }
    }

    return yPos + 10;
  }

  /**
   * Add hardware section
   */
  addHardwareSection(pdf, hardware, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 30);

    if (!hardware || Object.keys(hardware).length === 0) return yPos;

    // Subsection title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Hardware Summary', this.pageMargin, yPos);
    yPos += 12;

    // Hardware categories
    const categories = ['computers', 'monitors', 'printers', 'phones', 'tablets', 'networking'];
    
    categories.forEach(category => {
      if (hardware[category] && hardware[category].length > 0) {
        yPos = this.checkPageBreak(pdf, yPos, 15);
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${category.charAt(0).toUpperCase() + category.slice(1)}: ${hardware[category].length} items`, this.pageMargin, yPos);
        yPos += 8;
      }
    });

    return yPos + 10;
  }

  /**
   * Add comprehensive inventory section with enhanced detailed breakdown
   */
  addInventorySection(pdf, inventory, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 40);

    // Enhanced subsection title with icon
    this.applyStyle(pdf, 'subHeader', 'primary');
    pdf.text('📦 Equipment Inventory & Usage Analysis', this.pageMargin, yPos);
    yPos += 12;

    // Key inventory items with data
    const itemsWithData = inventory.items.filter(item => this.hasInventoryData(item));
    
    if (itemsWithData.length > 0) {
      // Enhanced inventory data showing detailed breakdown
      itemsWithData.slice(0, 10).forEach(item => {
        yPos = this.checkPageBreak(pdf, yPos, 35);
        
        // Item header with background
        this.drawBackgroundBox(pdf, this.pageMargin - 3, yPos - 3, 
                              this.pageWidth - (this.pageMargin * 2) + 6, 8, 'accent', 0.08);
        
        this.applyStyle(pdf, 'subHeader', 'primary');
        pdf.text(item.description, this.pageMargin, yPos);
        yPos += 12;

        // Detailed usage breakdown
        const usageBreakdown = [
          ['Primary Use', item.inUse || 0],
          ['Training Use', item.otherUse?.training || 0],
          ['Conference Use', item.otherUse?.conf || 0],
          ['GSM Use', item.otherUse?.gsm || 0],
          ['Other Use', (item.otherUse?.prospecting || 0) + (item.otherUse?.applicant || 0) + (item.otherUse?.visitor || 0) + (item.otherUse?.other || 0)],
          ['Spares (Floor)', item.spares?.onFloor || 0],
          ['Spares (Storage)', item.spares?.inStorage || 0],
          ['Broken/Repair', item.broken || 0]
        ].filter(([_, count]) => count > 0);

        if (usageBreakdown.length > 0) {
          yPos = this.addProfessionalTable(pdf, usageBreakdown, yPos, 
            ['Usage Type', 'Count'], 
            [0.7, 0.3],
            { alternateRowColors: true, headerBackground: false }
          );
        }

        yPos += 8;
      });

      if (itemsWithData.length > 10) {
        this.applyStyle(pdf, 'caption', 'secondary');
        pdf.text(`... and ${itemsWithData.length - 10} more equipment types. See detailed appendix for complete breakdown.`, this.pageMargin, yPos);
        yPos += 10;
      }
    }

    // Enhanced special stations summary
    if (inventory.specialStations && Object.values(inventory.specialStations).some(count => count > 0)) {
      yPos = this.checkPageBreak(pdf, yPos, 25);
      
      // Special stations header with styling
      this.applyStyle(pdf, 'subHeader', 'accent');
      pdf.text('🏢 Special Configuration Stations', this.pageMargin, yPos);
      yPos += 12;

      const stationData = [
        ['Three Monitor Workstations', inventory.specialStations.threeMonitorSetups || 0],
        ['Dedicated Prospecting Stations', inventory.specialStations.prospectingStations || 0],
        ['Visitor/Guest Stations', inventory.specialStations.visitorStations || 0],
        ['Applicant Interview Stations', inventory.specialStations.applicantStations || 0],
        ['End-of-Life Computers (Pending Replacement)', inventory.specialStations.eolComputers || 0]
      ].filter(([_, count]) => count > 0);

      if (stationData.length > 0) {
        yPos = this.addProfessionalTable(pdf, stationData, yPos, 
          ['Station Configuration', 'Count'],
          [0.75, 0.25],
          { alternateRowColors: true, headerBackground: true }
        );
      }
    }

    // Inventory summary statistics
    if (itemsWithData.length > 0) {
      yPos += 10;
      yPos = this.checkPageBreak(pdf, yPos, 20);
      
      const totalItems = itemsWithData.reduce((sum, item) => 
        sum + (item.inUse || 0) + Object.values(item.otherUse || {}).reduce((s, v) => s + (v || 0), 0) + 
        (item.spares?.onFloor || 0) + (item.spares?.inStorage || 0) + (item.broken || 0), 0);
      
      const totalActive = itemsWithData.reduce((sum, item) => 
        sum + (item.inUse || 0) + Object.values(item.otherUse || {}).reduce((s, v) => s + (v || 0), 0), 0);
      
      const totalSpares = itemsWithData.reduce((sum, item) => 
        sum + (item.spares?.onFloor || 0) + (item.spares?.inStorage || 0), 0);
      
      const totalBroken = itemsWithData.reduce((sum, item) => sum + (item.broken || 0), 0);

      // Summary box
      this.drawBackgroundBox(pdf, this.pageMargin - 5, yPos - 5, 
                            this.pageWidth - (this.pageMargin * 2) + 10, 20, 'success', 0.08);
      
      this.applyStyle(pdf, 'subHeader', 'success');
      pdf.text('📊 Inventory Summary', this.pageMargin, yPos);
      yPos += 10;

      this.applyStyle(pdf, 'body');
      pdf.text(`Total Equipment: ${totalItems} items • Active Use: ${totalActive} • Available Spares: ${totalSpares} • Repair Needed: ${totalBroken}`, this.pageMargin, yPos);
      yPos += 8;
      
      if (totalItems > 0) {
        const utilizationRate = Math.round((totalActive / totalItems) * 100);
        pdf.text(`Equipment Utilization Rate: ${utilizationRate}%`, this.pageMargin, yPos);
        yPos += 8;
      }
    }

    return yPos + 10;
  }

  /**
   * Add data closet section
   */
  addDataClosetSection(pdf, dataCloset, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 40);

    // Subsection title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Data Closet Assessment', this.pageMargin, yPos);
    yPos += 12;

    // Overall score
    if (dataCloset.overallScore) {
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Overall Score: ${dataCloset.overallScore}%`, this.pageMargin, yPos);
      yPos += 10;
    }

    // Grading details
    if (dataCloset.grading && dataCloset.grading.length > 0) {
      const gradingData = dataCloset.grading
        .filter(item => item.category && (item.score || item.comments))
        .map(item => [
          item.category,
          item.score || 'N/A',
          item.comments || ''
        ]);

      if (gradingData.length > 0) {
        yPos = this.addTable(pdf, gradingData, yPos, ['Category', 'Score', 'Comments']);
      }
    }

    // Enhanced Environmental data presentation
    if (dataCloset.environmental && Object.keys(dataCloset.environmental).length > 0) {
      yPos += 10;
      yPos = this.addEnhancedEnvironmentalSection(pdf, dataCloset.environmental, yPos);
    }

    // Location count
    if (dataCloset.locations && dataCloset.locations.length > 0) {
      yPos += 5;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Data Closet Locations: ${dataCloset.locations.length}`, this.pageMargin, yPos);
      yPos += 8;
    }

    return yPos + 10;
  }

  /**
   * Check if inventory item has any data
   */
  hasInventoryData(item) {
    if (!item) return false;
    
    const hasUse = item.inUse > 0 || Object.values(item.otherUse || {}).some(val => val > 0);
    const hasSpares = (item.spares?.onFloor || 0) > 0 || (item.spares?.inStorage || 0) > 0;
    const hasBroken = (item.broken || 0) > 0;
    
    return hasUse || hasSpares || hasBroken;
  }

  /**
   * Add rack diagrams with enhanced visual presentation
   */
  async addRackDiagrams(pdf, reportData, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 60);

    // Section title with icon
    this.applyStyle(pdf, 'sectionHeader', 'primary');
    pdf.text('🏭 Rack Infrastructure Diagrams', this.pageMargin, yPos);
    yPos += 8;
    
    // Section divider
    yPos = this.drawSectionDivider(pdf, yPos);
    yPos += 10;

    // Add each rack diagram
    if (reportData.racks && reportData.racks.length > 0) {
      for (const rack of reportData.racks) {
        yPos = await this.addRackDiagram(pdf, rack, yPos);
      }
    }

    return yPos + 10;
  }

  /**
   * Add individual rack diagram with enhanced presentation
   */
  async addRackDiagram(pdf, rack, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 120);

    // Rack header with professional styling
    const rackTitle = rack.locationName ? `${rack.name} (${rack.locationName})` : rack.name;
    
    // Background for rack header
    this.drawBackgroundBox(pdf, this.pageMargin - 3, yPos - 3, 
                          this.pageWidth - (this.pageMargin * 2) + 6, 12, 'primary', 0.1);
    
    this.applyStyle(pdf, 'subHeader', 'primary');
    pdf.text(`📟 ${rackTitle}`, this.pageMargin, yPos);
    yPos += 15;

    // Try to capture rack visualization from DOM
    try {
      const rackElement = document.querySelector(`[data-rack-id="${rack.id}"]`);
      if (rackElement) {
        const canvas = await html2canvas(rackElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          allowTaint: true
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 120; // mm - larger for better visibility
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        yPos = this.checkPageBreak(pdf, yPos, imgHeight + 20);
        
        // Add border around rack diagram
        pdf.setDrawColor(...this.colors.border);
        pdf.setLineWidth(0.5);
        pdf.rect(this.pageMargin - 2, yPos - 2, imgWidth + 4, imgHeight + 4);
        
        pdf.addImage(imgData, 'PNG', this.pageMargin, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 15;
      }
    } catch (error) {
      console.warn('Failed to capture rack diagram:', error);
      
      // Enhanced fallback: Add styled text-based rack representation
      if (rack.devices && rack.devices.length > 0) {
        // Fallback header
        this.applyStyle(pdf, 'body', 'secondary');
        pdf.text('📋 Rack Configuration (Text View):', this.pageMargin, yPos);
        yPos += 10;

        // Device list with better styling
        rack.devices.slice(0, 10).forEach(device => {
          yPos = this.checkPageBreak(pdf, yPos, 7);
          const deviceText = `U${device.position || '?'}: ${device.name || device.type || 'Unknown Device'}`;
          
          // Add subtle background for each device entry
          this.drawBackgroundBox(pdf, this.pageMargin, yPos - 2, 
                                this.pageWidth - (this.pageMargin * 2), 6, 'light', 0.2);
          
          this.applyStyle(pdf, 'body');
          pdf.text(deviceText, this.pageMargin + 8, yPos);
          yPos += 7;
        });

        if (rack.devices.length > 10) {
          yPos += 2;
          this.applyStyle(pdf, 'caption', 'secondary');
          pdf.text(`... and ${rack.devices.length - 10} more devices in this rack`, this.pageMargin + 8, yPos);
          yPos += 8;
        }
      } else {
        // No devices message
        this.drawBackgroundBox(pdf, this.pageMargin - 3, yPos - 3, 
                              this.pageWidth - (this.pageMargin * 2) + 6, 10, 'warning', 0.1);
        this.applyStyle(pdf, 'body', 'warning');
        pdf.text('⚠️ Rack diagram unavailable - No device configuration found', this.pageMargin, yPos);
        yPos += 15;
      }
    }

    // Add professional rack details table
    const rackData = [
      ['Rack Height', `${rack.height || 42}U`],
      ['Space Utilization', `${rack.utilization || 0}%`],
      ['Power Consumption', `${rack.powerDraw || 'N/A'}W`],
      ['Installed Devices', `${rack.devices?.length || 0}`]
    ];

    if (rack.powerBanks && rack.powerBanks.length > 0) {
      rackData.push(['Power Banks', `${rack.powerBanks.length} units`]);
    }

    // Add environmental info if available
    if (rack.temperature) {
      rackData.push(['Temperature', `${rack.temperature}°C`]);
    }
    if (rack.airflow) {
      rackData.push(['Airflow Status', rack.airflow]);
    }

    yPos = this.addProfessionalTable(pdf, rackData, yPos, 
      ['Specification', 'Value'], 
      [0.6, 0.4],
      { alternateRowColors: true, headerBackground: false }
    );

    return yPos + 15;
  }

  /**
   * Add recycling section
   */
  addRecyclingSection(pdf, reportData, yPosition) {
    if (!reportData.recycling) return yPosition;

    let yPos = this.checkPageBreak(pdf, yPosition, 50);

    // Section title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Recycling & Asset Management', this.pageMargin, yPos);
    yPos += 15;

    // Items brought back
    if (reportData.recycling.broughtBack?.some(item => item.quantity > 0)) {
      yPos = this.checkPageBreak(pdf, yPos, 30);
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Items Brought Back to HQ', this.pageMargin, yPos);
      yPos += 10;

      const broughtBackData = reportData.recycling.broughtBack
        .filter(item => item.quantity > 0)
        .map(item => [item.item, item.quantity.toString(), item.notes || '']);

      if (broughtBackData.length > 0) {
        yPos = this.addTable(pdf, broughtBackData, yPos, ['Item', 'Quantity', 'Notes']);
      }
    }

    // Items requiring pickup
    if (reportData.recycling.pickupRequired?.some(item => item.quantity > 0)) {
      yPos = this.checkPageBreak(pdf, yPos, 30);
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Items Requiring Pickup', this.pageMargin, yPos);
      yPos += 10;

      const pickupData = reportData.recycling.pickupRequired
        .filter(item => item.quantity > 0)
        .map(item => [
          item.item, 
          item.quantity.toString(), 
          item.priority || 'normal',
          item.notes || ''
        ]);

      if (pickupData.length > 0) {
        yPos = this.addTable(pdf, pickupData, yPos, ['Item', 'Quantity', 'Priority', 'Notes']);
      }
    }

    // Pickup scheduling
    if (reportData.recycling.scheduled === 'Yes') {
      yPos += 10;
      yPos = this.checkPageBreak(pdf, yPos, 15);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Pickup Scheduled', this.pageMargin, yPos);
      yPos += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Date: ${reportData.recycling.scheduleDate || 'TBD'}`, this.pageMargin + 5, yPos);
      yPos += 6;
      pdf.text(`Scheduled by: ${reportData.recycling.scheduledBy || 'TBD'}`, this.pageMargin + 5, yPos);
      yPos += 6;
      pdf.text(`Contact: ${reportData.recycling.pickupContact || 'TBD'}`, this.pageMargin + 5, yPos);
      yPos += 10;
    }

    return yPos + 10;
  }

  /**
   * Add combined issues and recommendations section with enhanced design
   */
  addIssuesAndRecommendations(pdf, reportData, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 60);

    // Section title with icon
    this.applyStyle(pdf, 'sectionHeader', 'primary');
    pdf.text('🔍 Issues & Recommendations', this.pageMargin, yPos);
    yPos += 8;
    
    // Section divider
    yPos = this.drawSectionDivider(pdf, yPos);
    yPos += 10;

    // Add issues first with enhanced styling
    if (reportData.issues && reportData.issues.length > 0) {
      this.applyStyle(pdf, 'subHeader', 'warning');
      pdf.text('⚠️ Issues Identified', this.pageMargin, yPos);
      yPos += 12;

      reportData.issues.forEach((issue, index) => {
        yPos = this.checkPageBreak(pdf, yPos, 25);
        
        // Issue background based on severity
        const severityColor = this.getSeverityColor(issue.severity);
        this.drawBackgroundBox(pdf, this.pageMargin - 3, yPos - 3, 
                              this.pageWidth - (this.pageMargin * 2) + 6, 
                              8, severityColor, 0.1);
        
        // Issue header with severity indicator
        this.applyStyle(pdf, 'body', 'warning');
        const severityIcon = this.getSeverityIcon(issue.severity);
        const severityText = issue.severity ? ` [${issue.severity.toUpperCase()}]` : '';
        pdf.text(`${severityIcon} ${index + 1}. ${issue.title}${severityText}`, this.pageMargin, yPos);
        yPos += 10;

        // Description with better formatting
        if (issue.description) {
          this.applyStyle(pdf, 'body');
          const descLines = pdf.splitTextToSize(issue.description, this.pageWidth - (this.pageMargin * 2) - 15);
          descLines.forEach(line => {
            yPos = this.checkPageBreak(pdf, yPos, 6);
            pdf.text(line, this.pageMargin + 12, yPos);
            yPos += 6;
          });
        }

        yPos += 8;
      });

      yPos += 10;
    }

    // Add recommendations with enhanced styling
    if (reportData.recommendations && reportData.recommendations.length > 0) {
      yPos = this.checkPageBreak(pdf, yPos, 35);
      
      this.applyStyle(pdf, 'subHeader', 'accent');
      pdf.text('💡 Recommendations', this.pageMargin, yPos);
      yPos += 12;

      reportData.recommendations.forEach((rec, index) => {
        yPos = this.checkPageBreak(pdf, yPos, 25);
        
        // Recommendation background based on priority
        const priorityColor = this.getPriorityColor(rec.priority);
        this.drawBackgroundBox(pdf, this.pageMargin - 3, yPos - 3, 
                              this.pageWidth - (this.pageMargin * 2) + 6, 
                              8, priorityColor, 0.08);
        
        // Recommendation header with priority indicator
        this.applyStyle(pdf, 'body', 'accent');
        const priorityIcon = this.getPriorityIcon(rec.priority);
        const priorityText = rec.priority ? ` [${rec.priority.toUpperCase()} PRIORITY]` : '';
        pdf.text(`${priorityIcon} ${index + 1}. ${rec.title}${priorityText}`, this.pageMargin, yPos);
        yPos += 10;

        // Description with better formatting
        if (rec.description) {
          this.applyStyle(pdf, 'body');
          const descLines = pdf.splitTextToSize(rec.description, this.pageWidth - (this.pageMargin * 2) - 15);
          descLines.forEach(line => {
            yPos = this.checkPageBreak(pdf, yPos, 6);
            pdf.text(line, this.pageMargin + 12, yPos);
            yPos += 6;
          });
        }

        // Add implementation timeframe if available
        if (rec.timeframe) {
          yPos += 2;
          this.applyStyle(pdf, 'caption', 'secondary');
          pdf.text(`⏱️ Recommended timeframe: ${rec.timeframe}`, this.pageMargin + 12, yPos);
          yPos += 6;
        }

        yPos += 8;
      });
    } else if (!reportData.issues || reportData.issues.length === 0) {
      // All clear message with positive styling
      this.drawBackgroundBox(pdf, this.pageMargin - 3, yPos - 3, 
                            this.pageWidth - (this.pageMargin * 2) + 6, 12, 'success', 0.1);
      this.applyStyle(pdf, 'body', 'success');
      pdf.text('✅ No critical issues or recommendations at this time. All systems operating within acceptable parameters.', this.pageMargin, yPos);
      yPos += 15;
    }

    return yPos + 10;
  }

  /**
   * Add photos section with enhanced presentation
   */
  async addPhotos(pdf, reportData, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 60);

    // Section title with icon
    this.applyStyle(pdf, 'sectionHeader', 'primary');
    pdf.text('📸 Documentation Photos', this.pageMargin, yPos);
    yPos += 8;
    
    // Section divider
    yPos = this.drawSectionDivider(pdf, yPos);
    yPos += 10;

    if (reportData.photos && reportData.photos.length > 0) {
      // Group photos by category if available
      const photosByCategory = {};
      
      reportData.photos.forEach(photo => {
        const category = photo.category || 'General';
        if (!photosByCategory[category]) {
          photosByCategory[category] = [];
        }
        photosByCategory[category].push(photo);
      });

      // Add photos by category
      for (const [category, photos] of Object.entries(photosByCategory)) {
        if (photos.length > 0) {
          yPos = this.checkPageBreak(pdf, yPos, 20);
          
          // Category header with styling
          this.applyStyle(pdf, 'subHeader', 'secondary');
          pdf.text(`📷 ${category} Photos`, this.pageMargin, yPos);
          yPos += 12;

          // Add each photo in the category
          for (const photo of photos) {
            yPos = await this.addPhoto(pdf, photo, yPos);
          }
        }
      }
    } else {
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text('No photos available.', this.pageMargin, yPos);
      yPos += 10;
    }

    return yPos + 10;
  }

  /**
   * Add individual photo with professional presentation
   */
  async addPhoto(pdf, photo, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 120);

    try {
      // Professional image card container
      const imgWidth = this.layout.imageMaxWidth;
      const imgHeight = this.layout.imageMaxHeight;
      const cardPadding = this.layout.cardPadding;
      const totalCardHeight = imgHeight + (photo.title ? 15 : 0) + (photo.description ? 25 : 10) + cardPadding * 2;
      
      // Image card background with shadow
      const cardArea = this.drawCard(pdf, this.pageMargin, yPos, 
        imgWidth + cardPadding * 2, totalCardHeight, {
          backgroundColor: 'white',
          borderColor: 'border',
          shadow: true
        });

      let cardY = cardArea.contentY;

      // Photo title with professional styling
      if (photo.title) {
        this.applyStyle(pdf, 'subHeaderLight', 'primary');
        pdf.text(photo.title, cardArea.contentX, cardY);
        cardY += 12;
      }

      // Image with professional frame
      yPos = this.checkPageBreak(pdf, cardY, imgHeight + 10);
      
      // Professional image border with subtle styling
      pdf.setDrawColor(...this.colors.border);
      pdf.setLineWidth(1);
      pdf.rect(cardArea.contentX - 1, cardY - 1, imgWidth + 2, imgHeight + 2, 'S');
      
      // Inner shadow effect for depth
      pdf.setFillColor(...this.colors.shadow);
      pdf.setGState(pdf.GState({ opacity: 0.05 }));
      pdf.rect(cardArea.contentX, cardY, imgWidth, 3, 'F');
      pdf.rect(cardArea.contentX, cardY, 3, imgHeight, 'F');
      pdf.setGState(pdf.GState({ opacity: 1 }));

      // Enhanced image handling with format detection and error recovery
      await this.addImageWithRetry(pdf, photo, cardArea.contentX, cardY, imgWidth, imgHeight);
      cardY += imgHeight + 8;

      // Photo description in styled text area
      if (photo.description) {
        // Description background
        this.drawBackgroundBox(pdf, cardArea.contentX - 2, cardY - 2, 
          imgWidth + 4, 20, 'light', 0.3, {
            border: false
          });
        
        this.applyStyle(pdf, 'caption', 'text');
        const descLines = pdf.splitTextToSize(photo.description, imgWidth - 4);
        
        descLines.forEach((line, index) => {
          if (index < 3) { // Limit to 3 lines for space
            pdf.text(line, cardArea.contentX, cardY + (index * 5));
          }
        });
        
        cardY += 20;
      }

      // Professional metadata footer
      if (photo.timestamp || photo.location) {
        this.applyStyle(pdf, 'captionBold', 'textMuted');
        let metaText = '';
        if (photo.timestamp) {
          const timestamp = new Date(photo.timestamp).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          });
          metaText += `Captured: ${timestamp}`;
        }
        if (photo.location) {
          if (metaText) metaText += ' • ';
          metaText += `Location: ${photo.location}`;
        }
        pdf.text(metaText, cardArea.contentX, cardY);
      }

      yPos = cardArea.contentY + totalCardHeight + 15;

    } catch (error) {
      console.warn('Failed to add photo:', error);
      
      // Professional error display
      const errorCard = this.drawCard(pdf, this.pageMargin, yPos, 
        this.layout.imageMaxWidth + this.layout.cardPadding * 2, 40, {
          backgroundColor: 'warningLight',
          borderColor: 'warning'
        });
      
      this.applyStyle(pdf, 'body', 'warning');
      pdf.text(`Image Load Error`, errorCard.contentX, errorCard.contentY + 8);
      this.applyStyle(pdf, 'caption', 'text');
      pdf.text(`Could not load: ${photo.title || photo.url || 'Untitled Image'}`, 
        errorCard.contentX, errorCard.contentY + 18);
      
      yPos += 55;
    }

    return yPos;
  }

  /**
   * Add appendices section
   */
  addAppendices(pdf, reportData, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 50);

    // Check for appendix-worthy data
    const hasChecklists = reportData.checklists && reportData.checklists.length > 0;
    const hasDetailedInventory = reportData.inventory?.items?.some(item => this.hasInventoryData(item));
    const hasRecyclingNotes = reportData.recycling?.generalNotes?.trim();
    const hasDataClosetNotes = reportData.dataCloset?.notes?.trim();
    
    if (!hasChecklists && !hasDetailedInventory && !hasRecyclingNotes && !hasDataClosetNotes) {
      return yPos; // No appendices needed
    }

    // Section title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Appendices', this.pageMargin, yPos);
    yPos += 15;

    // Add checklist data if available
    if (hasChecklists) {
      yPos = this.addChecklistAppendix(pdf, reportData.checklists, yPos);
    }

    // Add detailed inventory if available
    if (hasDetailedInventory) {
      yPos = this.addDetailedInventoryAppendix(pdf, reportData.inventory, yPos);
    }

    // Add additional notes
    if (hasRecyclingNotes || hasDataClosetNotes) {
      yPos = this.addNotesAppendix(pdf, reportData, yPos);
    }

    return yPos + 10;
  }

  /**
   * Add detailed inventory appendix
   */
  addDetailedInventoryAppendix(pdf, inventory, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 30);

    // Subsection title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Appendix A: Detailed Inventory Breakdown', this.pageMargin, yPos);
    yPos += 10;

    const itemsWithData = inventory.items.filter(item => this.hasInventoryData(item));
    
    itemsWithData.forEach(item => {
      yPos = this.checkPageBreak(pdf, yPos, 20);
      
      // Item name
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(item.description, this.pageMargin, yPos);
      yPos += 8;

      // Detailed breakdown
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const details = [
        `In Use: ${item.inUse || 0}`,
        `Training: ${item.otherUse?.training || 0}`,
        `Conference: ${item.otherUse?.conf || 0}`,
        `GSM: ${item.otherUse?.gsm || 0}`,
        `Spares (Floor): ${item.spares?.onFloor || 0}`,
        `Spares (Storage): ${item.spares?.inStorage || 0}`,
        `Broken: ${item.broken || 0}`
      ];

      details.forEach(detail => {
        yPos = this.checkPageBreak(pdf, yPos, 5);
        pdf.text(detail, this.pageMargin + 5, yPos);
        yPos += 5;
      });

      yPos += 5;
    });

    return yPos + 10;
  }

  /**
   * Add notes appendix
   */
  addNotesAppendix(pdf, reportData, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 30);

    // Subsection title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Appendix B: Additional Notes', this.pageMargin, yPos);
    yPos += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    // Recycling notes
    if (reportData.recycling?.generalNotes?.trim()) {
      yPos = this.checkPageBreak(pdf, yPos, 15);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Recycling Notes:', this.pageMargin, yPos);
      yPos += 6;

      pdf.setFont('helvetica', 'normal');
      const recyclingLines = pdf.splitTextToSize(reportData.recycling.generalNotes, this.pageWidth - (this.pageMargin * 2));
      recyclingLines.forEach(line => {
        yPos = this.checkPageBreak(pdf, yPos, 5);
        pdf.text(line, this.pageMargin + 5, yPos);
        yPos += 5;
      });

      yPos += 8;
    }

    // Data closet notes
    if (reportData.dataCloset?.notes?.trim()) {
      yPos = this.checkPageBreak(pdf, yPos, 15);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Data Closet Notes:', this.pageMargin, yPos);
      yPos += 6;

      pdf.setFont('helvetica', 'normal');
      const closetLines = pdf.splitTextToSize(reportData.dataCloset.notes, this.pageWidth - (this.pageMargin * 2));
      closetLines.forEach(line => {
        yPos = this.checkPageBreak(pdf, yPos, 5);
        pdf.text(line, this.pageMargin + 5, yPos);
        yPos += 5;
      });

      yPos += 8;
    }

    // Inventory notes
    if (reportData.inventory?.notes?.trim()) {
      yPos = this.checkPageBreak(pdf, yPos, 15);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Inventory Notes:', this.pageMargin, yPos);
      yPos += 6;

      pdf.setFont('helvetica', 'normal');
      const inventoryLines = pdf.splitTextToSize(reportData.inventory.notes, this.pageWidth - (this.pageMargin * 2));
      inventoryLines.forEach(line => {
        yPos = this.checkPageBreak(pdf, yPos, 5);
        pdf.text(line, this.pageMargin + 5, yPos);
        yPos += 5;
      });

      yPos += 8;
    }

    return yPos;
  }

  /**
   * Add checklist appendix
   */
  addChecklistAppendix(pdf, checklists, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 30);

    // Subsection title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Appendix A: Checklists', this.pageMargin, yPos);
    yPos += 10;

    checklists.forEach((checklist, index) => {
      yPos = this.checkPageBreak(pdf, yPos, 20);
      
      // Checklist title
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}. ${checklist.title}`, this.pageMargin, yPos);
      yPos += 8;

      // Checklist items
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      if (checklist.items && checklist.items.length > 0) {
        checklist.items.forEach(item => {
          yPos = this.checkPageBreak(pdf, yPos, 5);
          const status = item.checked ? '✓' : '○';
          pdf.text(`   ${status} ${item.text}`, this.pageMargin + 5, yPos);
          yPos += 5;
        });
      }
      
      yPos += 5;
    });

    return yPos;
  }

  /**
   * Add infrastructure appendix
   */
  addInfrastructureAppendix(pdf, infrastructure, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 30);

    // Subsection title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Appendix B: Infrastructure Details', this.pageMargin, yPos);
    yPos += 10;

    // Infrastructure data
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    Object.entries(infrastructure).forEach(([key, value]) => {
      yPos = this.checkPageBreak(pdf, yPos, 6);
      
      if (typeof value === 'object' && value !== null) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${key}:`, this.pageMargin, yPos);
        yPos += 5;
        
        pdf.setFont('helvetica', 'normal');
        Object.entries(value).forEach(([subKey, subValue]) => {
          yPos = this.checkPageBreak(pdf, yPos, 5);
          pdf.text(`  ${subKey}: ${subValue}`, this.pageMargin + 5, yPos);
          yPos += 5;
        });
      } else {
        pdf.text(`${key}: ${value}`, this.pageMargin, yPos);
        yPos += 5;
      }
    });

    return yPos;
  }

  /**
   * Add enhanced environmental monitoring section with professional presentation
   */
  addEnhancedEnvironmentalSection(pdf, environmentalData, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 50);

    // Section header with icon and professional styling
    this.applyStyle(pdf, 'subHeader', 'accent');
    pdf.text('🌡️ Environmental Monitoring', this.pageMargin, yPos);
    yPos += 12;

    // Environmental status indicator background
    this.drawBackgroundBox(pdf, this.pageMargin - 5, yPos - 5, 
                          this.pageWidth - (this.pageMargin * 2) + 10, 35, 'accent', 0.05);

    // Process environmental data with enhanced presentation
    const envMetrics = [
      { label: 'Temperature', value: environmentalData.temperature, unit: '', icon: '🌡️', 
        status: this.getEnvironmentalStatus(environmentalData.temperature, 'temperature') },
      { label: 'Humidity', value: environmentalData.humidity, unit: '', icon: '💧', 
        status: this.getEnvironmentalStatus(environmentalData.humidity, 'humidity') },
      { label: 'Airflow', value: environmentalData.airflow, unit: '', icon: '🌀', 
        status: this.getEnvironmentalStatus(environmentalData.airflow, 'airflow') },
      { label: 'Power Status', value: environmentalData.powerStatus, unit: '', icon: '⚡', 
        status: this.getEnvironmentalStatus(environmentalData.powerStatus, 'power') }
    ].filter(metric => metric.value);

    if (envMetrics.length > 0) {
      // Grid layout for environmental metrics
      const metricsPerRow = 2;
      const rowHeight = 12;
      const colWidth = (this.pageWidth - (this.pageMargin * 2)) / metricsPerRow;

      envMetrics.forEach((metric, index) => {
        const row = Math.floor(index / metricsPerRow);
        const col = index % metricsPerRow;
        const xPos = this.pageMargin + (col * colWidth);
        const metricYPos = yPos + (row * rowHeight);

        // Status indicator
        const statusColor = metric.status === 'good' ? 'success' : 
                           metric.status === 'warning' ? [255, 193, 7] : 'warning';
        
        this.applyStyle(pdf, 'body', statusColor);
        pdf.text(`${metric.icon}`, xPos, metricYPos);
        
        this.applyStyle(pdf, 'body', 'secondary');
        pdf.text(`${metric.label}:`, xPos + 8, metricYPos);
        
        this.applyStyle(pdf, 'body');
        pdf.text(`${metric.value}${metric.unit}`, xPos + 35, metricYPos);
      });

      yPos += Math.ceil(envMetrics.length / metricsPerRow) * rowHeight;
    }

    // Last checked timestamp if available
    if (environmentalData.lastChecked) {
      yPos += 8;
      this.applyStyle(pdf, 'caption', 'secondary');
      const checkDate = new Date(environmentalData.lastChecked).toLocaleDateString();
      pdf.text(`📅 Last Monitored: ${checkDate}`, this.pageMargin, yPos);
      yPos += 8;
    }

    // Environmental assessment summary
    const criticalIssues = envMetrics.filter(m => m.status === 'critical').length;
    const warnings = envMetrics.filter(m => m.status === 'warning').length;
    
    if (criticalIssues > 0 || warnings > 0) {
      yPos += 5;
      this.drawBackgroundBox(pdf, this.pageMargin - 3, yPos - 3, 
                            this.pageWidth - (this.pageMargin * 2) + 6, 12, 
                            criticalIssues > 0 ? 'warning' : [255, 193, 7], 0.1);
      
      this.applyStyle(pdf, 'body', criticalIssues > 0 ? 'warning' : [255, 152, 0]);
      const alertText = criticalIssues > 0 ? 
        `⚠️ ${criticalIssues} critical environmental issue(s) require immediate attention` :
        `⚠️ ${warnings} environmental parameter(s) need monitoring`;
      pdf.text(alertText, this.pageMargin, yPos);
      yPos += 12;
    } else if (envMetrics.length > 0) {
      yPos += 5;
      this.drawBackgroundBox(pdf, this.pageMargin - 3, yPos - 3, 
                            this.pageWidth - (this.pageMargin * 2) + 6, 8, 'success', 0.1);
      
      this.applyStyle(pdf, 'body', 'success');
      pdf.text('✅ All environmental parameters within acceptable ranges', this.pageMargin, yPos);
      yPos += 10;
    }

    return yPos + 10;
  }

  /**
   * Determine environmental status based on value and type
   */
  getEnvironmentalStatus(value, type) {
    if (!value) return 'unknown';
    
    const normalizedValue = value.toString().toLowerCase();
    
    switch (type) {
      case 'temperature':
        if (normalizedValue.includes('high') || normalizedValue.includes('hot')) return 'warning';
        if (normalizedValue.includes('critical') || normalizedValue.includes('overheating')) return 'critical';
        // Check for temperature values (assuming Fahrenheit)
        const tempMatch = normalizedValue.match(/(\d+)[°f]/);
        if (tempMatch) {
          const temp = parseInt(tempMatch[1]);
          if (temp > 85) return 'critical';
          if (temp > 80 || temp < 65) return 'warning';
        }
        return 'good';
      
      case 'humidity':
        const humMatch = normalizedValue.match(/(\d+)%/);
        if (humMatch) {
          const humidity = parseInt(humMatch[1]);
          if (humidity > 70 || humidity < 30) return 'warning';
          if (humidity > 80 || humidity < 20) return 'critical';
        }
        if (normalizedValue.includes('high') || normalizedValue.includes('low')) return 'warning';
        return 'good';
      
      case 'airflow':
        if (normalizedValue.includes('poor') || normalizedValue.includes('blocked')) return 'critical';
        if (normalizedValue.includes('restricted') || normalizedValue.includes('limited')) return 'warning';
        if (normalizedValue.includes('good') || normalizedValue.includes('normal')) return 'good';
        return 'good';
      
      case 'power':
        if (normalizedValue.includes('critical') || normalizedValue.includes('failed')) return 'critical';
        if (normalizedValue.includes('warning') || normalizedValue.includes('low')) return 'warning';
        if (normalizedValue.includes('normal') || normalizedValue.includes('good')) return 'good';
        return 'good';
      
      default:
        return 'good';
    }
  }

  /**
   * Add enhanced power systems section with professional presentation
   */
  addEnhancedPowerSystemsSection(pdf, powerData, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 50);
    
    // Section header
    pdf.setFontSize(14);
    pdf.setFont(this.font, 'bold');
    pdf.text('⚡ Power Systems & Infrastructure', this.pageMargin, yPos);
    yPos += 15;
    
    // Add visual separator
    pdf.setDrawColor(220, 53, 69); // Red color for power systems
    pdf.setLineWidth(2);
    pdf.line(this.pageMargin, yPos, this.pageWidth - this.pageMargin, yPos);
    yPos += 10;
    
    // Process power system data
    const powerItems = [];
    
    if (typeof powerData === 'object') {
      Object.entries(powerData).forEach(([key, value]) => {
        if (value && String(value).trim() !== '') {
          const formattedKey = key.replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/ups/gi, 'UPS')
            .replace(/ac/gi, 'AC')
            .replace(/dc/gi, 'DC');
          
          powerItems.push({
            component: formattedKey,
            status: String(value),
            statusIcon: this.getPowerStatusIcon(String(value)),
            statusColor: this.getPowerStatusColor(String(value))
          });
        }
      });
    }
    
    if (powerItems.length === 0) {
      pdf.setFontSize(10);
      pdf.setFont(this.font, 'italic');
      pdf.setTextColor(128, 128, 128);
      pdf.text('No power system data available', this.pageMargin, yPos);
      yPos += 15;
      
      // Add placeholder content
      pdf.setFont(this.font, 'normal');
      pdf.text('• UPS Status: Not monitored', this.pageMargin + 10, yPos);
      yPos += 12;
      pdf.text('• Main Power: Not assessed', this.pageMargin + 10, yPos);
      yPos += 12;
      pdf.text('• Battery Backup: Not evaluated', this.pageMargin + 10, yPos);
      yPos += 20;
    } else {
      // Add power status grid
      const gridWidth = (this.pageWidth - (this.pageMargin * 2)) / 2;
      let xPos = this.pageMargin;
      let itemsInRow = 0;
      
      powerItems.forEach((item, index) => {
        yPos = this.checkPageBreak(pdf, yPos, 35);
        
        // Item container
        pdf.setFillColor(248, 249, 250);
        pdf.rect(xPos, yPos, gridWidth - 5, 30, 'F');
        
        // Status indicator
        const colors = this.getPowerStatusColor(item.status);
        pdf.setFillColor(colors.r, colors.g, colors.b);
        pdf.circle(xPos + 10, yPos + 10, 4, 'F');
        
        // Component name
        pdf.setFontSize(10);
        pdf.setFont(this.font, 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(item.component, xPos + 20, yPos + 8);
        
        // Status text
        pdf.setFont(this.font, 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        const statusText = item.status.length > 25 ? item.status.substring(0, 22) + '...' : item.status;
        pdf.text(statusText, xPos + 20, yPos + 18);
        
        itemsInRow++;
        if (itemsInRow === 2) {
          yPos += 40;
          xPos = this.pageMargin;
          itemsInRow = 0;
        } else {
          xPos += gridWidth;
        }
      });
      
      if (itemsInRow > 0) {
        yPos += 40;
      }
      
      // Add summary if multiple items
      if (powerItems.length > 1) {
        yPos = this.checkPageBreak(pdf, yPos, 25);
        
        const criticalCount = powerItems.filter(item => 
          this.getPowerStatusColor(item.status).severity === 'critical'
        ).length;
        
        const warningCount = powerItems.filter(item => 
          this.getPowerStatusColor(item.status).severity === 'warning'
        ).length;
        
        pdf.setFillColor(245, 245, 245);
        pdf.rect(this.pageMargin, yPos, this.pageWidth - (this.pageMargin * 2), 25, 'F');
        
        pdf.setFontSize(10);
        pdf.setFont(this.font, 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Power Infrastructure Summary:', this.pageMargin + 10, yPos + 10);
        
        pdf.setFont(this.font, 'normal');
        if (criticalCount > 0) {
          pdf.setTextColor(220, 53, 69);
          pdf.text(`${criticalCount} Critical Issue${criticalCount > 1 ? 's' : ''}`, this.pageMargin + 10, yPos + 20);
        } else if (warningCount > 0) {
          pdf.setTextColor(255, 193, 7);
          pdf.text(`${warningCount} Warning${warningCount > 1 ? 's' : ''}`, this.pageMargin + 10, yPos + 20);
        } else {
          pdf.setTextColor(40, 167, 69);
          pdf.text('All Systems Operational', this.pageMargin + 10, yPos + 20);
        }
        
        yPos += 35;
      }
    }
    
    return yPos + 10;
  }

  /**
   * Add enhanced network infrastructure section with professional presentation
   */
  addEnhancedNetworkInfrastructureSection(pdf, networkData, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 50);
    
    // Section header
    pdf.setFontSize(14);
    pdf.setFont(this.font, 'bold');
    pdf.text('🌐 Network Infrastructure', this.pageMargin, yPos);
    yPos += 15;
    
    // Add visual separator
    pdf.setDrawColor(0, 123, 255); // Blue color for network
    pdf.setLineWidth(2);
    pdf.line(this.pageMargin, yPos, this.pageWidth - this.pageMargin, yPos);
    yPos += 10;
    
    // Process network infrastructure data
    const networkItems = [];
    
    if (typeof networkData === 'object') {
      Object.entries(networkData).forEach(([key, value]) => {
        if (value && String(value).trim() !== '') {
          const formattedKey = key.replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/ip/gi, 'IP')
            .replace(/wifi/gi, 'WiFi')
            .replace(/lan/gi, 'LAN')
            .replace(/wan/gi, 'WAN')
            .replace(/vpn/gi, 'VPN')
            .replace(/dns/gi, 'DNS')
            .replace(/dhcp/gi, 'DHCP');
          
          networkItems.push({
            component: formattedKey,
            status: String(value),
            statusIcon: this.getNetworkStatusIcon(String(value)),
            statusColor: this.getNetworkStatusColor(String(value))
          });
        }
      });
    }
    
    if (networkItems.length === 0) {
      pdf.setFontSize(10);
      pdf.setFont(this.font, 'italic');
      pdf.setTextColor(128, 128, 128);
      pdf.text('No network infrastructure data available', this.pageMargin, yPos);
      yPos += 15;
      
      // Add placeholder content
      pdf.setFont(this.font, 'normal');
      pdf.text('• Switch Status: Not monitored', this.pageMargin + 10, yPos);
      yPos += 12;
      pdf.text('• Router Health: Not assessed', this.pageMargin + 10, yPos);
      yPos += 12;
      pdf.text('• WiFi Performance: Not evaluated', this.pageMargin + 10, yPos);
      yPos += 12;
      pdf.text('• Network Connectivity: Not tested', this.pageMargin + 10, yPos);
      yPos += 20;
    } else {
      // Create network topology visual representation
      yPos = this.checkPageBreak(pdf, yPos, 100);
      
      // Network components table
      const tableWidth = this.pageWidth - (this.pageMargin * 2);
      const colWidths = [tableWidth * 0.3, tableWidth * 0.4, tableWidth * 0.3];
      
      // Table header
      pdf.setFillColor(0, 123, 255);
      pdf.rect(this.pageMargin, yPos, tableWidth, 20, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont(this.font, 'bold');
      pdf.text('Component', this.pageMargin + 5, yPos + 13);
      pdf.text('Status', this.pageMargin + colWidths[0] + 5, yPos + 13);
      pdf.text('Health', this.pageMargin + colWidths[0] + colWidths[1] + 5, yPos + 13);
      yPos += 20;
      
      // Table rows
      networkItems.forEach((item, index) => {
        yPos = this.checkPageBreak(pdf, yPos, 18);
        
        // Alternating row colors
        if (index % 2 === 0) {
          pdf.setFillColor(248, 249, 250);
          pdf.rect(this.pageMargin, yPos, tableWidth, 18, 'F');
        }
        
        // Component name
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(this.font, 'normal');
        pdf.setFontSize(9);
        pdf.text(item.component, this.pageMargin + 5, yPos + 12);
        
        // Status
        const statusText = item.status.length > 30 ? item.status.substring(0, 27) + '...' : item.status;
        pdf.text(statusText, this.pageMargin + colWidths[0] + 5, yPos + 12);
        
        // Health indicator
        const colors = this.getNetworkStatusColor(item.status);
        pdf.setFillColor(colors.r, colors.g, colors.b);
        pdf.circle(this.pageMargin + colWidths[0] + colWidths[1] + 15, yPos + 9, 3, 'F');
        
        pdf.setTextColor(colors.r, colors.g, colors.b);
        pdf.setFont(this.font, 'bold');
        pdf.text(colors.label, this.pageMargin + colWidths[0] + colWidths[1] + 25, yPos + 12);
        
        yPos += 18;
      });
      
      // Network performance summary
      yPos = this.checkPageBreak(pdf, yPos, 40);
      yPos += 10;
      
      const excellentCount = networkItems.filter(item => 
        this.getNetworkStatusColor(item.status).severity === 'excellent'
      ).length;
      
      const goodCount = networkItems.filter(item => 
        this.getNetworkStatusColor(item.status).severity === 'good'
      ).length;
      
      const warningCount = networkItems.filter(item => 
        this.getNetworkStatusColor(item.status).severity === 'warning'
      ).length;
      
      const criticalCount = networkItems.filter(item => 
        this.getNetworkStatusColor(item.status).severity === 'critical'
      ).length;
      
      // Performance summary box
      pdf.setFillColor(240, 248, 255);
      pdf.rect(this.pageMargin, yPos, this.pageWidth - (this.pageMargin * 2), 35, 'F');
      
      pdf.setFontSize(11);
      pdf.setFont(this.font, 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Network Health Summary:', this.pageMargin + 10, yPos + 12);
      
      pdf.setFont(this.font, 'normal');
      pdf.setFontSize(9);
      let summaryText = '';
      
      if (criticalCount > 0) {
        pdf.setTextColor(220, 53, 69);
        summaryText = `${criticalCount} Critical Issue${criticalCount > 1 ? 's' : ''} Require Immediate Attention`;
      } else if (warningCount > 0) {
        pdf.setTextColor(255, 193, 7);
        summaryText = `${warningCount} Component${warningCount > 1 ? 's' : ''} Need Monitoring`;
      } else if (goodCount > 0 || excellentCount > 0) {
        pdf.setTextColor(40, 167, 69);
        summaryText = `All ${networkItems.length} Network Components Operating Normally`;
      }
      
      pdf.text(summaryText, this.pageMargin + 10, yPos + 25);
      yPos += 45;
    }
    
    return yPos + 10;
  }

  /**
   * Helper methods for power and network status colors
   */
  getPowerStatusIcon(status) {
    const normalizedStatus = String(status).toLowerCase();
    if (normalizedStatus.includes('critical') || normalizedStatus.includes('failed')) return '❌';
    if (normalizedStatus.includes('warning') || normalizedStatus.includes('low')) return '⚠️';
    if (normalizedStatus.includes('good') || normalizedStatus.includes('normal')) return '✅';
    return '🔹';
  }
  
  getPowerStatusColor(status) {
    const normalizedStatus = String(status).toLowerCase();
    if (normalizedStatus.includes('critical') || normalizedStatus.includes('failed')) {
      return { r: 220, g: 53, b: 69, severity: 'critical', label: 'Critical' };
    }
    if (normalizedStatus.includes('warning') || normalizedStatus.includes('low')) {
      return { r: 255, g: 193, b: 7, severity: 'warning', label: 'Warning' };
    }
    if (normalizedStatus.includes('good') || normalizedStatus.includes('normal')) {
      return { r: 40, g: 167, b: 69, severity: 'good', label: 'Good' };
    }
    return { r: 108, g: 117, b: 125, severity: 'unknown', label: 'Unknown' };
  }
  
  getNetworkStatusIcon(status) {
    const normalizedStatus = String(status).toLowerCase();
    if (normalizedStatus.includes('excellent') || normalizedStatus.includes('optimal')) return '🟢';
    if (normalizedStatus.includes('good') || normalizedStatus.includes('normal')) return '🟡';
    if (normalizedStatus.includes('warning') || normalizedStatus.includes('slow')) return '🟠';
    if (normalizedStatus.includes('critical') || normalizedStatus.includes('down')) return '🔴';
    return '🔹';
  }
  
  getNetworkStatusColor(status) {
    const normalizedStatus = String(status).toLowerCase();
    if (normalizedStatus.includes('excellent') || normalizedStatus.includes('optimal')) {
      return { r: 0, g: 200, b: 0, severity: 'excellent', label: 'Excellent' };
    }
    if (normalizedStatus.includes('good') || normalizedStatus.includes('normal')) {
      return { r: 40, g: 167, b: 69, severity: 'good', label: 'Good' };
    }
    if (normalizedStatus.includes('warning') || normalizedStatus.includes('slow')) {
      return { r: 255, g: 193, b: 7, severity: 'warning', label: 'Warning' };
    }
    if (normalizedStatus.includes('critical') || normalizedStatus.includes('down')) {
      return { r: 220, g: 53, b: 69, severity: 'critical', label: 'Critical' };
    }
    return { r: 108, g: 117, b: 125, severity: 'unknown', label: 'Unknown' };
  }

  /**
   * Add professional table with enhanced modern styling
   */
  addProfessionalTable(pdf, data, yPosition, headers = [], columnWidths = null, options = {}) {
    let yPos = yPosition;
    const availableWidth = this.pageWidth - (this.pageMargin * 2);
    const { 
      alternateRowColors = true, 
      headerBackground = true,
      borderStyle = 'modern',
      maxRowsPerPage = 25,
      statusColumn = -1, // Column index that contains status info
      zebraStripe = true,
      cardStyle = false
    } = options;
    
    // Calculate column widths
    let colWidths;
    if (columnWidths) {
      colWidths = columnWidths.map(w => availableWidth * w);
    } else {
      const colWidth = availableWidth / (headers.length || data[0]?.length || 2);
      colWidths = Array(headers.length || data[0]?.length || 2).fill(colWidth);
    }
    
    const rowHeight = this.layout.tableRowHeight;
    const headerHeight = this.layout.tableHeaderHeight;

    // Modern card-style table container
    if (cardStyle || borderStyle === 'modern') {
      const tableHeight = (data.length + (headers.length > 0 ? 1 : 0)) * rowHeight + headerHeight + 10;
      this.drawBackgroundBox(pdf, this.pageMargin - 4, yPos - 5, 
                            availableWidth + 8, tableHeight, 'white', 1, {
        border: true,
        borderColor: 'border',
        shadow: true
      });
    }

    // Professional headers
    if (headers.length > 0) {
      // Header background with gradient effect
      if (headerBackground) {
        pdf.setFillColor(...this.colors.tableHeader);
        pdf.rect(this.pageMargin, yPos, availableWidth, headerHeight, 'F');
        
        // Subtle gradient overlay
        pdf.setFillColor(...this.colors.primaryLight);
        pdf.setGState(pdf.GState({ opacity: 0.1 }));
        pdf.rect(this.pageMargin, yPos, availableWidth, headerHeight/2, 'F');
        pdf.setGState(pdf.GState({ opacity: 1 }));
      }
      
      this.applyStyle(pdf, 'tableHeader', 'white');
      
      let xPos = this.pageMargin + 6;
      headers.forEach((header, index) => {
        pdf.text(header, xPos, yPos + headerHeight/2 + 2);
        xPos += colWidths[index];
      });
      
      yPos += headerHeight;
      
      // Professional header separator with subtle gradient
      pdf.setDrawColor(...this.colors.primary);
      pdf.setLineWidth(1.5);
      pdf.line(this.pageMargin, yPos, this.pageWidth - this.pageMargin, yPos);
      
      pdf.setDrawColor(...this.colors.accent);
      pdf.setLineWidth(0.5);
      pdf.line(this.pageMargin, yPos + 0.5, this.pageMargin + availableWidth * 0.4, yPos + 0.5);
      
      yPos += 3;
    }

    // Data rows with enhanced styling
    this.applyStyle(pdf, 'tableBody');
    data.forEach((row, rowIndex) => {
      yPos = this.checkPageBreak(pdf, yPos, rowHeight);
      
      // Alternating row backgrounds with enhanced colors
      if (alternateRowColors && zebraStripe && rowIndex % 2 === 1) {
        pdf.setFillColor(...this.colors.lightAlt);
        pdf.setGState(pdf.GState({ opacity: 0.5 }));
        pdf.rect(this.pageMargin, yPos - 1, availableWidth, rowHeight, 'F');
        pdf.setGState(pdf.GState({ opacity: 1 }));
      }
      
      let xPos = this.pageMargin + 6;
      row.forEach((cell, index) => {
        if (index < colWidths.length) {
          // Handle status indicators
          if (index === statusColumn && cell) {
            const indicatorWidth = this.drawStatusIndicator(pdf, xPos, yPos + 2, cell);
            xPos += indicatorWidth;
            
            this.applyStyle(pdf, 'tableBody');
            const cellText = pdf.splitTextToSize(String(cell || ''), colWidths[index] - indicatorWidth - 8);
            pdf.text(cellText[0] || '', xPos, yPos + rowHeight/2 + 1);
          } else {
            const cellText = pdf.splitTextToSize(String(cell || ''), colWidths[index] - 8);
            pdf.text(cellText[0] || '', xPos, yPos + rowHeight/2 + 1);
          }
          xPos += colWidths[index];
        }
      });
      
      // Subtle row separator for better readability
      if (rowIndex < data.length - 1) {
        pdf.setDrawColor(...this.colors.borderLight);
        pdf.setLineWidth(0.2);
        pdf.line(this.pageMargin + 5, yPos + rowHeight - 1, this.pageWidth - this.pageMargin - 5, yPos + rowHeight - 1);
      }
      
      yPos += rowHeight;
    });

    // Professional table footer
    if (borderStyle === 'modern' || cardStyle) {
      pdf.setDrawColor(...this.colors.border);
      pdf.setLineWidth(1);
      pdf.line(this.pageMargin, yPos + 2, this.pageWidth - this.pageMargin, yPos + 2);
    }

    return yPos + 12;
  }

  /**
   * Add table to PDF with modern styling (enhanced legacy method)
   */
  addTable(pdf, data, yPosition, headers = [], columnWidths = null, options = {}) {
    // Use the professional table method with enhanced default options
    const defaultOptions = {
      alternateRowColors: true,
      headerBackground: true,
      borderStyle: 'modern',
      zebraStripe: true,
      cardStyle: true,
      ...options
    };
    
    return this.addProfessionalTable(pdf, data, yPosition, headers, columnWidths, defaultOptions);
  }

  /**
   * Add subsection
   */
  addSubsection(pdf, title, data, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 30);

    // Subsection title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, this.pageMargin, yPos);
    yPos += 10;

    // Content
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    if (typeof data === 'object') {
      Object.entries(data).forEach(([key, value]) => {
        yPos = this.checkPageBreak(pdf, yPos, 6);
        pdf.text(`${key}: ${value}`, this.pageMargin + 5, yPos);
        yPos += 6;
      });
    } else {
      const lines = pdf.splitTextToSize(String(data), this.pageWidth - (this.pageMargin * 2));
      lines.forEach(line => {
        yPos = this.checkPageBreak(pdf, yPos, 5);
        pdf.text(line, this.pageMargin + 5, yPos);
        yPos += 5;
      });
    }

    return yPos + 10;
  }

  /**
   * Check if page break is needed with footer consideration and dynamic spacing
   */
  checkPageBreak(pdf, currentY, neededSpace) {
    const footerSpace = this.layout.footerHeight + 10;
    const availableSpace = this.pageHeight - footerSpace - currentY;
    
    // Enhanced page break logic with dynamic spacing considerations
    if (availableSpace < neededSpace) {
      pdf.addPage();
      return this.pageMargin + 15; // Return to top of new page with proper margin
    }
    
    // Dynamic spacing adjustment based on available space
    if (availableSpace < neededSpace * 1.5) {
      // Reduce spacing when approaching page bottom to prevent orphaned content
      return currentY + Math.min(5, availableSpace * 0.1);
    }
    
    return currentY;
  }

  /**
   * Smart section break with dynamic spacing to prevent title overlap
   */
  checkSectionPageBreak(pdf, currentY, sectionHeaderHeight = 40, contentPreview = 80) {
    const footerSpace = this.layout.footerHeight + 10;
    const totalNeededSpace = sectionHeaderHeight + contentPreview;
    const availableSpace = this.pageHeight - footerSpace - currentY;
    
    // If section header + some content won't fit, start on new page
    if (availableSpace < totalNeededSpace) {
      pdf.addPage();
      return this.pageMargin + 15;
    }
    
    return currentY;
  }

  /**
   * Add professional footers to all pages with enhanced styling
   */
  addFooters(pdf, reportData) {
    const pageCount = pdf.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      // Professional footer background with gradient
      pdf.setFillColor(...this.colors.primary);
      pdf.setGState(pdf.GState({ opacity: 0.08 }));
      pdf.rect(0, this.pageHeight - this.layout.footerHeight, this.pageWidth, this.layout.footerHeight, 'F');
      pdf.setGState(pdf.GState({ opacity: 1 }));
      
      // Elegant top border with accent
      pdf.setDrawColor(...this.colors.primary);
      pdf.setLineWidth(1.5);
      pdf.line(this.pageMargin, this.pageHeight - this.layout.footerHeight + 2, 
               this.pageWidth - this.pageMargin, this.pageHeight - this.layout.footerHeight + 2);
      
      // Accent line
      pdf.setDrawColor(...this.colors.accent);
      pdf.setLineWidth(0.5);
      pdf.line(this.pageMargin, this.pageHeight - this.layout.footerHeight + 3, 
               this.pageMargin + 60, this.pageHeight - this.layout.footerHeight + 3);
      
      // Professional footer content layout
      const footerContentY = this.pageHeight - 18;
      
      // Company branding
      this.applyStyle(pdf, 'captionBold', 'primary');
      pdf.text('Regional Sales Support Teams', this.pageMargin, footerContentY);
      
      // Organization info
      this.applyStyle(pdf, 'caption', 'textMuted');
      const orgText = reportData.organization?.name || reportData.location?.name || 'Infrastructure Assessment';
      pdf.text(`• ${orgText}`, this.pageMargin + 50, footerContentY);
      
      // Generation timestamp
      const dateInfo = `Generated: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })}`;
      pdf.text(dateInfo, this.pageMargin, this.pageHeight - 12);
      
      // Professional page numbering
      this.applyStyle(pdf, 'captionBold', 'primary');
      const pageText = `Page ${i} of ${pageCount}`;
      const pageTextWidth = pdf.getTextWidth(pageText);
      pdf.text(pageText, this.pageWidth - this.pageMargin - pageTextWidth, footerContentY);
      
      // Contact information on first page
      if (i === 1) {
        this.applyStyle(pdf, 'caption', 'accent');
        const contactText = 'www.rss-technical.com';
        const contactWidth = pdf.getTextWidth(contactText);
        pdf.text(contactText, this.pageWidth - this.pageMargin - contactWidth, this.pageHeight - 6);
      }
      
      // Professional status indicator for confidential documents
      if (reportData.confidential || reportData.classification) {
        this.applyStyle(pdf, 'captionBold', 'warning');
        const statusText = reportData.classification || 'CONFIDENTIAL';
        const statusWidth = pdf.getTextWidth(statusText);
        pdf.text(statusText, this.pageWidth - this.pageMargin - statusWidth, this.pageHeight - 12);
      }
    }
  }

  /**
   * Generate automatic summary
   */
  generateAutoSummary(reportData) {
    const parts = [];
    
    if (reportData.organization?.name) {
      parts.push(`Visit conducted at ${reportData.organization.name}`);
    }
    
    if (reportData.racks?.length) {
      parts.push(`${reportData.racks.length} rack(s) inspected`);
    }
    
    if (reportData.recommendations?.length) {
      parts.push(`${reportData.recommendations.length} recommendation(s) identified`);
    }
    
    if (reportData.issues?.length) {
      parts.push(`${reportData.issues.length} issue(s) found`);
    }
    
    return parts.length > 0 
      ? parts.join(', ') + '. All systems operational within acceptable parameters.'
      : 'Routine visit completed. All systems operational within acceptable parameters.';
  }

  /**
   * Convert blob to base64
   */
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Parse position from various formats (handles U1, 1, "1", etc.)
   */
  parsePosition(position) {
    if (!position && position !== 0) return 0;
    
    // Handle string positions like "U1", "U10", etc.
    if (typeof position === 'string') {
      // Remove U prefix and parse as integer
      const cleaned = position.replace(/^U/i, '');
      const parsed = parseInt(cleaned, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    // Handle numeric positions
    if (typeof position === 'number') {
      return Math.max(0, Math.floor(position));
    }
    
    return 0;
  }

  /**
   * Enhanced image handling with retry logic and format detection
   */
  async addImageWithRetry(pdf, photo, x, y, width, height) {
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Detect image format and process URL
        const imageData = await this.processImageUrl(photo.url);
        
        if (imageData.success) {
          pdf.addImage(imageData.dataUrl, imageData.format, x, y, width, height);
          console.log(`✅ Successfully added image: ${photo.title || photo.url}`);
          return true;
        } else {
          throw new Error(imageData.error || 'Failed to process image');
        }
      } catch (error) {
        lastError = error;
        console.warn(`❌ Image load attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        }
      }
    }
    
    // All attempts failed - show error placeholder
    console.error(`🚫 Failed to load image after ${maxRetries} attempts:`, lastError?.message);
    this.drawImageErrorPlaceholder(pdf, x, y, width, height, photo);
    return false;
  }

  /**
   * Process image URL and convert to appropriate format for PDF
   */
  async processImageUrl(url) {
    try {
      // Handle data URLs (base64 encoded images)
      if (url.startsWith('data:')) {
        const format = this.detectImageFormat(url);
        return {
          success: true,
          dataUrl: url,
          format: format
        };
      }
      
      // Handle blob URLs or object URLs
      if (url.startsWith('blob:')) {
        const imageData = await this.convertBlobToDataUrl(url);
        return {
          success: true,
          dataUrl: imageData.dataUrl,
          format: imageData.format
        };
      }
      
      // Handle HTTP/HTTPS URLs with CORS support
      if (url.startsWith('http')) {
        const imageData = await this.loadImageWithCORS(url);
        return {
          success: true,
          dataUrl: imageData.dataUrl,
          format: imageData.format
        };
      }
      
      // Handle relative URLs or file paths
      return {
        success: true,
        dataUrl: url,
        format: this.detectImageFormat(url)
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Detect image format from URL or data URL
   */
  detectImageFormat(url) {
    if (url.includes('data:image/')) {
      const match = url.match(/data:image\/([^;]+)/);
      if (match) {
        const format = match[1].toUpperCase();
        return format === 'JPG' ? 'JPEG' : format;
      }
    }
    
    // Extract file extension
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'JPEG';
      case 'png':
        return 'PNG';
      case 'gif':
        return 'GIF';
      case 'webp':
        return 'WEBP';
      default:
        return 'JPEG'; // Default fallback
    }
  }

  /**
   * Convert blob URL to data URL
   */
  async convertBlobToDataUrl(blobUrl) {
    return new Promise((resolve, reject) => {
      fetch(blobUrl)
        .then(response => response.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result;
            const format = this.detectImageFormat(dataUrl);
            resolve({ dataUrl, format });
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
        .catch(reject);
    });
  }

  /**
   * Load image from HTTP URL with CORS support
   */
  async loadImageWithCORS(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          // Create canvas to convert to data URL
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          const format = this.detectImageFormat(dataUrl);
          
          resolve({ dataUrl, format });
        } catch (error) {
          reject(new Error(`Canvas conversion failed: ${error.message}`));
        }
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to load image from URL: ${url}`));
      };
      
      // Set a timeout for the image load
      setTimeout(() => {
        if (!img.complete) {
          reject(new Error(`Image load timeout: ${url}`));
        }
      }, 10000);
      
      img.src = url;
    });
  }

  /**
   * Draw error placeholder when image fails to load
   */
  drawImageErrorPlaceholder(pdf, x, y, width, height, photo) {
    // Error background
    pdf.setFillColor(...this.colors.warningLight);
    pdf.rect(x, y, width, height, 'F');
    
    // Error border
    pdf.setDrawColor(...this.colors.warning);
    pdf.setLineWidth(2);
    pdf.rect(x, y, width, height, 'S');
    
    // Error icon (simple X)
    pdf.setDrawColor(...this.colors.warning);
    pdf.setLineWidth(3);
    const padding = 20;
    pdf.line(x + padding, y + padding, x + width - padding, y + height - padding);
    pdf.line(x + width - padding, y + padding, x + padding, y + height - padding);
    
    // Error text
    pdf.setTextColor(...this.colors.warning);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    
    const errorText = 'Image Load Failed';
    const textWidth = pdf.getTextWidth(errorText);
    pdf.text(errorText, x + (width - textWidth) / 2, y + height / 2 - 5);
    
    if (photo.title) {
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      const titleLines = pdf.splitTextToSize(photo.title, width - 10);
      titleLines.forEach((line, index) => {
        if (index < 2) { // Limit to 2 lines
          const lineWidth = pdf.getTextWidth(line);
          pdf.text(line, x + (width - lineWidth) / 2, y + height / 2 + 10 + (index * 8));
        }
      });
    }
    
    // Reset colors
    pdf.setTextColor(...this.colors.text);
  }
}

// Create singleton instance
const pdfReportService = new PDFReportService();

export default pdfReportService;
