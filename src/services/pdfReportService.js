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
    this.pageMargin = 20;
    this.pageWidth = 210; // A4 width in mm
    this.pageHeight = 297; // A4 height in mm
  }

  /**
   * Generate PDF from report data
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

      // Add header and title
      yPosition = this.addHeader(pdf, title, reportData);

      // Add executive summary
      yPosition = this.addExecutiveSummary(pdf, reportData, yPosition);

      // Add visit details
      yPosition = this.addVisitDetails(pdf, reportData, yPosition);

      // Add infrastructure assessment
      yPosition = this.addInfrastructureAssessment(pdf, reportData, yPosition);

      // Add rack diagrams if enabled
      if (includeRackDiagrams) {
        yPosition = await this.addRackDiagrams(pdf, reportData, yPosition);
      }

      // Add recommendations
      yPosition = this.addRecommendations(pdf, reportData, yPosition);

      // Add photos if enabled
      if (includePhotos) {
        yPosition = await this.addPhotos(pdf, reportData, yPosition);
      }

      // Add appendices
      yPosition = this.addAppendices(pdf, reportData, yPosition);

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
   * Add executive summary
   */
  addExecutiveSummary(pdf, reportData, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 50);

    // Section title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Executive Summary', this.pageMargin, yPos);
    yPos += 10;

    // Summary content
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');

    const summary = reportData.summary || this.generateAutoSummary(reportData);
    const summaryLines = pdf.splitTextToSize(summary, this.pageWidth - (this.pageMargin * 2));
    
    summaryLines.forEach(line => {
      yPos = this.checkPageBreak(pdf, yPos, 6);
      pdf.text(line, this.pageMargin, yPos);
      yPos += 6;
    });

    return yPos + 10;
  }

  /**
   * Add visit details section
   */
  addVisitDetails(pdf, reportData, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 50);

    // Section title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Visit Details', this.pageMargin, yPos);
    yPos += 15;

    // Create table for visit details
    const visitData = [
      ['Visit Type', reportData.visitType || 'Routine Maintenance'],
      ['Duration', reportData.duration || 'N/A'],
      ['Weather Conditions', reportData.weather || 'N/A'],
      ['Site Contact', reportData.siteContact || 'N/A'],
      ['Access Method', reportData.accessMethod || 'N/A']
    ];

    yPos = this.addTable(pdf, visitData, yPos, ['Field', 'Value']);

    return yPos + 10;
  }

  /**
   * Add infrastructure assessment
   */
  addInfrastructureAssessment(pdf, reportData, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 50);

    // Section title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Infrastructure Assessment', this.pageMargin, yPos);
    yPos += 15;

    // Power systems
    if (reportData.powerSystems) {
      yPos = this.addSubsection(pdf, 'Power Systems', reportData.powerSystems, yPos);
    }

    // Network infrastructure
    if (reportData.networkInfrastructure) {
      yPos = this.addSubsection(pdf, 'Network Infrastructure', reportData.networkInfrastructure, yPos);
    }

    // Environmental conditions
    if (reportData.environmental) {
      yPos = this.addSubsection(pdf, 'Environmental Conditions', reportData.environmental, yPos);
    }

    return yPos + 10;
  }

  /**
   * Add rack diagrams
   */
  async addRackDiagrams(pdf, reportData, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 50);

    // Section title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Rack Diagrams', this.pageMargin, yPos);
    yPos += 15;

    // Add each rack diagram
    if (reportData.racks && reportData.racks.length > 0) {
      for (const rack of reportData.racks) {
        yPos = await this.addRackDiagram(pdf, rack, yPos);
      }
    }

    return yPos + 10;
  }

  /**
   * Add individual rack diagram
   */
  async addRackDiagram(pdf, rack, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 100);

    // Rack title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Rack: ${rack.name}`, this.pageMargin, yPos);
    yPos += 10;

    // Try to capture rack visualization from DOM
    try {
      const rackElement = document.querySelector(`[data-rack-id="${rack.id}"]`);
      if (rackElement) {
        const canvas = await html2canvas(rackElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 100; // mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        yPos = this.checkPageBreak(pdf, yPos, imgHeight + 10);
        pdf.addImage(imgData, 'PNG', this.pageMargin, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 10;
      }
    } catch (error) {
      console.warn('Failed to capture rack diagram:', error);
      
      // Fallback: Add text description
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Rack diagram could not be captured', this.pageMargin, yPos);
      yPos += 10;
    }

    // Add rack details table
    const rackData = [
      ['Height', `${rack.height || 42}U`],
      ['Utilization', `${rack.utilization || 0}%`],
      ['Power Draw', `${rack.powerDraw || 'N/A'}W`],
      ['Devices', `${rack.devices?.length || 0}`]
    ];

    yPos = this.addTable(pdf, rackData, yPos, ['Property', 'Value']);

    return yPos + 15;
  }

  /**
   * Add recommendations section
   */
  addRecommendations(pdf, reportData, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 50);

    // Section title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Recommendations', this.pageMargin, yPos);
    yPos += 15;

    if (reportData.recommendations && reportData.recommendations.length > 0) {
      reportData.recommendations.forEach((rec, index) => {
        yPos = this.checkPageBreak(pdf, yPos, 20);
        
        // Recommendation number and priority
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${index + 1}. ${rec.title} (${rec.priority || 'Medium'} Priority)`, this.pageMargin, yPos);
        yPos += 8;

        // Description
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const descLines = pdf.splitTextToSize(rec.description, this.pageWidth - (this.pageMargin * 2));
        descLines.forEach(line => {
          yPos = this.checkPageBreak(pdf, yPos, 5);
          pdf.text(line, this.pageMargin + 5, yPos);
          yPos += 5;
        });

        yPos += 5;
      });
    } else {
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text('No specific recommendations at this time.', this.pageMargin, yPos);
      yPos += 10;
    }

    return yPos + 10;
  }

  /**
   * Add photos section
   */
  async addPhotos(pdf, reportData, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 50);

    // Section title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Photos', this.pageMargin, yPos);
    yPos += 15;

    if (reportData.photos && reportData.photos.length > 0) {
      for (const photo of reportData.photos) {
        yPos = await this.addPhoto(pdf, photo, yPos);
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
   * Add individual photo
   */
  async addPhoto(pdf, photo, yPosition) {
    let yPos = this.checkPageBreak(pdf, yPosition, 80);

    try {
      // Photo title
      if (photo.title) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(photo.title, this.pageMargin, yPos);
        yPos += 8;
      }

      // Add image
      const imgWidth = 80; // mm
      const imgHeight = 60; // mm (4:3 aspect ratio)

      yPos = this.checkPageBreak(pdf, yPos, imgHeight + 20);
      pdf.addImage(photo.url, 'JPEG', this.pageMargin, yPos, imgWidth, imgHeight);

      // Photo description
      if (photo.description) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const descLines = pdf.splitTextToSize(photo.description, imgWidth);
        let descY = yPos + imgHeight + 5;
        
        descLines.forEach(line => {
          pdf.text(line, this.pageMargin, descY);
          descY += 5;
        });
        
        yPos = descY + 5;
      } else {
        yPos += imgHeight + 10;
      }

    } catch (error) {
      console.warn('Failed to add photo:', error);
      pdf.setFontSize(10);
      pdf.text(`Photo: ${photo.title || 'Untitled'} (Could not load)`, this.pageMargin, yPos);
      yPos += 10;
    }

    return yPos + 10;
  }

  /**
   * Add table to PDF
   */
  addTable(pdf, data, yPosition, headers = []) {
    let yPos = yPosition;
    const colWidth = (this.pageWidth - (this.pageMargin * 2)) / (headers.length || 2);
    const rowHeight = 8;

    // Headers
    if (headers.length > 0) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      
      headers.forEach((header, index) => {
        pdf.text(header, this.pageMargin + (index * colWidth), yPos);
      });
      
      yPos += rowHeight;
      
      // Header underline
      pdf.setLineWidth(0.3);
      pdf.line(this.pageMargin, yPos - 2, this.pageWidth - this.pageMargin, yPos - 2);
      yPos += 3;
    }

    // Data rows
    pdf.setFont('helvetica', 'normal');
    data.forEach(row => {
      yPos = this.checkPageBreak(pdf, yPos, rowHeight);
      
      row.forEach((cell, index) => {
        const cellText = pdf.splitTextToSize(String(cell), colWidth - 5);
        pdf.text(cellText[0], this.pageMargin + (index * colWidth), yPos);
      });
      
      yPos += rowHeight;
    });

    return yPos + 5;
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
   * Check if page break is needed
   */
  checkPageBreak(pdf, currentY, neededSpace) {
    if (currentY + neededSpace > this.pageHeight - this.pageMargin) {
      pdf.addPage();
      return this.pageMargin + 10; // Return to top of new page with some margin
    }
    return currentY;
  }

  /**
   * Add footers to all pages
   */
  addFooters(pdf, reportData) {
    const pageCount = pdf.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      // Footer line
      pdf.setLineWidth(0.3);
      pdf.line(this.pageMargin, this.pageHeight - 20, this.pageWidth - this.pageMargin, this.pageHeight - 20);
      
      // Footer text
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `RSS Visit Report - ${reportData.organization?.name || ''} - Generated ${new Date().toLocaleDateString()}`,
        this.pageMargin,
        this.pageHeight - 15
      );
      
      // Page number
      pdf.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth - this.pageMargin - 20,
        this.pageHeight - 15
      );
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
}

// Create singleton instance
const pdfReportService = new PDFReportService();

export default pdfReportService;
