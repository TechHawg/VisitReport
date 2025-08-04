# RSS Visit Report - Comprehensive Import/Export System

## Overview

The RSS Visit Report system now includes a powerful, centralized Import/Export system that allows you to:

1. **Export** all your report data in multiple formats (JSON, CSV, YAML)
2. **Import** bulk infrastructure data through paste functionality
3. **Use templates** for quick data entry
4. **Manage complete reports** with all sections

## Key Features

### 🔄 Complete Data Management
- **Full Report Export/Import**: Export entire reports with all sections
- **Selective Data Types**: Choose specific data categories (Hardware, Data Closet, Inventory, Recycling)
- **Multiple Formats**: JSON (structured), CSV (spreadsheet-compatible), YAML (human-readable)

### 📊 Visual Device Representation
- **Enhanced Rack Visualization**: See devices in actual rack units with visual indicators
- **Device Status**: Color-coded status (Active, Inactive, Maintenance, Retired)
- **Interactive Controls**: Click to add, edit, or delete devices directly from the rack view
- **Utilization Tracking**: Real-time rack space utilization percentages

### 📋 Bulk Import Capabilities
- **Paste Functionality**: Copy data directly from Excel, Google Sheets, or any spreadsheet
- **File Import**: Support for CSV, JSON, and YAML files
- **Smart Validation**: Automatic data validation with preview before import
- **Error Handling**: Clear error messages and validation feedback

### 📝 Template System
- **Pre-built Templates**: Ready-to-use templates for all data types
- **Example Data**: Real-world examples for understanding data structure
- **Format Support**: Templates available in JSON and CSV formats

## Data Types Supported

### 1. Hardware Infrastructure
**What it includes:**
- Computers (desktops, laptops, workstations)
- Monitors (various sizes and resolutions)
- Printers (laser, inkjet, multifunction)
- Phones (desk phones, VoIP, extensions)
- Tablets (iOS, Android, Windows)
- Network Equipment (routers, switches, access points, firewalls)

**CSV Format Example:**
```csv
name,model,serialNumber,os,processor,memory,storage,status
Desktop-001,Dell OptiPlex 7090,ABC123DEF456,Windows 11 Pro,Intel i7-11700,16GB DDR4,512GB NVMe SSD,active
Laptop-001,Lenovo ThinkPad T14,GHI345JKL678,Windows 11 Pro,AMD Ryzen 7 5850U,16GB DDR4,1TB NVMe SSD,active
```

### 2. Data Closet & Racks
**What it includes:**
- Physical locations (server rooms, network closets)
- Rack configurations (42U, 24U, custom heights)
- Device placement (rack units, multi-unit devices)
- Environmental data (temperature, humidity, power)

**Visual Features:**
- Real-time rack visualization showing device placement
- Unit-by-unit device mapping
- Status indicators and utilization tracking
- Interactive device management

**CSV Format Example:**
```csv
deviceName,deviceType,model,serialNumber,locationName,rackName,startUnit,unitSpan,status,notes
Server-001,server,Dell PowerEdge R730,SRV123ABC456,Server Room,Rack-01,1,2,active,Primary domain controller
Switch-Core,switch,Cisco Catalyst 3850,SW1111AAA222,Server Room,Rack-01,5,1,active,Core network switch
```

### 3. General Inventory
**What it includes:**
- Standard inventory items (PCs, Laptops, Monitors, etc.)
- Usage categories (In Use, Training, Conference, Prospecting, etc.)
- Spare equipment tracking (On Floor, In Storage)
- Broken equipment counts
- Special stations (3-monitor setups, visitor stations, etc.)

**CSV Format Example:**
```csv
description,inUse,training,conf,gsm,prospecting,applicant,visitor,other,sparesOnFloor,sparesInStorage,broken
PCs,45,5,2,3,8,4,6,2,12,8,3
Laptops,25,8,4,2,12,6,8,1,6,4,2
Monitors,78,12,6,5,16,8,12,4,18,10,5
```

### 4. Recycling Data
**What it includes:**
- Brought Back items (completed recycling)
- Pickup Required items (pending collection)
- Sent to HQ items (refurbishment candidates)
- Scheduling information
- Priority levels and status tracking

### 5. Complete Report
**What it includes:**
- All above sections in one comprehensive export
- Visit summary and basic information
- Issues and recommendations
- Photos and documentation
- Metadata and timestamps

## How to Use the System

### Exporting Data

1. **Navigate to Import/Export**: Click "Import/Export" in the main navigation
2. **Choose Export Mode**: Click the "Export Data" tab
3. **Select Data Type**: Choose what you want to export (Complete, Hardware, etc.)
4. **Choose Format**: Select JSON, CSV, or YAML
5. **Click Export**: Your file will download automatically

### Importing Data

1. **Navigate to Import/Export**: Click "Import/Export" in the main navigation
2. **Choose Import Mode**: Click the "Import Data" tab (default)
3. **Select Data Type**: Choose what you're importing
4. **Choose Import Method**:
   - **Paste Data**: Copy from spreadsheets and paste directly
   - **Import from File**: Upload CSV, JSON, or YAML files
   - **View Templates**: See examples and use pre-built templates

5. **Validate & Preview**: System validates your data and shows preview
6. **Confirm Import**: Review and confirm to import your data

### Using Templates

1. **Click "View Templates"** from the Import/Export page
2. **Select Category**: Choose the type of data you need
3. **Pick Template**: Select specific template (e.g., computers, networking)
4. **Choose Format**: JSON or CSV
5. **Copy, Download, or Use**: 
   - Copy to clipboard for pasting elsewhere
   - Download as file for offline editing
   - Use directly to populate import form

## Data Format Guidelines

### JSON Format (Recommended)
- Preserves all data relationships and metadata
- Supports complex nested structures
- Best for complete data integrity
- Human-readable with proper formatting

### CSV Format
- Perfect for spreadsheet applications (Excel, Google Sheets)
- Easy to edit in bulk
- Great for tabular data like hardware inventories
- Can be opened in any text editor

### YAML Format
- Human-readable configuration format
- Good for documentation purposes
- Hierarchical structure representation
- Easy to understand and edit

## Best Practices

### For Data Entry
1. **Start with Templates**: Use pre-built templates to understand expected format
2. **Use Spreadsheets**: For bulk entry, use Excel/Google Sheets then paste
3. **Validate Early**: Always preview data before final import
4. **Backup First**: Export existing data before importing new data

### For Data Management
1. **Regular Exports**: Export your data regularly for backup
2. **Incremental Updates**: Import specific sections rather than complete rewrites
3. **Version Control**: Keep exported files with timestamps for history
4. **Documentation**: Use the notes fields to document important information

### For Rack Management
1. **Plan Layout**: Use rack templates to plan device placement
2. **Track Units**: Ensure accurate start unit and unit span for devices
3. **Status Updates**: Keep device status current (active, maintenance, etc.)
4. **Environmental Data**: Record temperature and humidity readings

## Troubleshooting

### Common Import Issues
1. **Format Errors**: Ensure CSV headers match expected field names
2. **Data Types**: Numbers should be numbers, not text (remove quotes)
3. **Required Fields**: Name/description fields are typically required
4. **JSON Syntax**: Use a JSON validator for complex imports

### Validation Messages
- **Warnings**: Data imports but with potential issues (review recommended)
- **Errors**: Data cannot be imported until fixed
- **Info Messages**: Helpful information about the import process

### Data Recovery
- Always export data before major imports
- Use the "Complete Report" export for full backups
- Individual sections can be exported and imported separately

## Integration with Existing Features

The Import/Export system works seamlessly with all existing features:

- **Visual Rack Display**: Imported rack data appears immediately in visual racks
- **Inventory Tracking**: Imported inventory integrates with existing counters
- **Report Generation**: All imported data appears in email reports
- **Search and Filter**: Imported data is fully searchable

## Advanced Features

### Smart Data Validation
- Automatically detects data format (CSV headers vs. simple lists)
- Validates required fields and data types
- Checks for logical inconsistencies
- Provides detailed error messages with line numbers

### Auto-Creation
- Missing locations and racks are created automatically during device import
- Default values applied where appropriate
- Maintains data relationships even with partial imports

### Batch Operations
- Import hundreds of devices at once
- Bulk status updates
- Mass data transformations
- Efficient processing for large datasets

## Support and Examples

The system includes comprehensive examples for every data type:

1. **Hardware Examples**: Complete computer and network equipment data
2. **Rack Examples**: Server room layouts with device positioning
3. **Inventory Examples**: Full inventory breakdowns with usage categories
4. **Complete Reports**: Full report examples showing all sections

Each example includes realistic data that demonstrates best practices and proper formatting.

---

This comprehensive Import/Export system gives you complete control over your RSS Visit Report data, whether you're managing a small office or a large enterprise infrastructure. The combination of visual device representation, bulk import capabilities, and flexible export options makes it easy to maintain accurate, up-to-date infrastructure documentation.